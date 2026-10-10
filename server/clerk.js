// The clerk: Gemini (generateContent, not the Interactions API) with check_stock as its only
// tool, scoped to the shop the visitor is in. Manual tool loop, at most two tool rounds; the
// first round must call check_stock. 10 s overall (PLAN.md section 3, timing), each model
// attempt at most 5 s, so a hanging model leaves time for the next one. A shop whose staff
// includes a support agent (shops.js) gets one more rule: advice for how-to questions, still
// ending with the stock of what it recommends. Zero Data: the visitor's text and the reply are
// never logged; the log gets model ids, timings and error types only.
import { FunctionCallingConfigMode, GoogleGenAI, ThinkingLevel } from '@google/genai';
import { checkStock } from './stock.js';

// Measured Oct 10 on the project key: flash-lite answered in about 1 s while 3.8-flash returned
// 503 and 429 (PLAN.md section 3), so flash-lite is the default and 3.8-flash the fallback.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-3.8-flash';
// Two attempts: the primary, then the fallback; when they are the same model, the primary again.
const ATTEMPT_MODELS = [PRIMARY_MODEL, FALLBACK_MODEL];
const TIMEOUT_MS = 10_000;
const ATTEMPT_MS = 5_000;
const MAX_TOOL_ROUNDS = 2;

const checkStockDeclaration = {
  name: 'check_stock',
  description:
    "Checks this shop's stock room for one product: whether it is in stock, how many are on hand, " +
    'when it will be restocked, and how many days it usually takes to come back. If the shop does ' +
    'not carry it, returns found: false with the products that are in stock.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      product: {
        type: 'string',
        description: 'The product the customer asked about, as they said it, e.g. "croissants".',
      },
    },
    required: ['product'],
  },
};

// The support agent's rule. Round one is forced to check_stock, and round two may look up the
// recommended product if round one found something else, so this stays within the two rounds.
const SUPPORT_RULE =
  'You can also give advice here. For a how-to or which-product question (for example, which primer to use in a bathroom), answer in two spoken sentences: one practical tip that recommends a product, then that product\'s stock, how many are on hand or when it is back. If check_stock has not returned the product you recommend, call check_stock for it before you answer. A plain "do you have" question gets no advice.';

function instructions(shop) {
  const rules = [
    `You are the clerk at the counter of ${shop.name}, a small local shop. A customer is standing at the counter, and everything you say is spoken aloud to them.`,
    'Whenever the customer mentions a product, call check_stock for it before you answer, once for each product. Never guess whether something is in stock, how many there are, or when it comes back; say only what check_stock returned.',
    'Answer in one or two short, friendly spoken sentences. No lists, markdown, emoji or prices.',
    'When something is in stock, say so; you may mention how many are on hand.',
    'When something is out of stock, give the restock date exactly as nextRestockText says it, and never work out dates or weekdays yourself. If nextRestockText is null, say you do not have a restock date yet.',
    'If typicalRestockDays is a number, you may add that it usually comes back within about that many days. If it is null, do not mention it.',
    'If check_stock returns found: false for a product the customer asked about, say the shop does not carry that, and suggest one or two of the inStockProducts.',
    'If check_stock returns found: false but the customer did not actually ask about a product (a greeting, small talk, or "what do you sell?"), never say the shop does not carry it: greet them and invite a question, or name what is in stock from inStockProducts, in one or two spoken sentences.',
    'You only know this shop. If the customer asks about anything other than shopping here, steer back politely in one sentence.',
  ];
  if (shop.staff?.includes('Support agent')) rules.push(SUPPORT_RULE);
  return rules.join('\n');
}

// Errors named for the log, which records error names only.
function failure(name, cause) {
  const err = new Error(name, { cause });
  err.name = name;
  return err;
}

function errorType(err) {
  if (!err || typeof err !== 'object') return 'Error';
  const code = err.status ?? err.statusCode ?? (typeof err.code === 'string' ? err.code : undefined);
  return code === undefined ? err.name || 'Error' : `${err.name || 'Error'} ${code}`;
}

// Rejects with the signal's reason once it aborts, even if the work never settles.
function withDeadline(promise, signal) {
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

// The contract's `stock` field: the found shape without `found`.
function stockFields(result) {
  return {
    product: result.product,
    inStock: result.inStock,
    onHand: result.onHand,
    nextRestock: result.nextRestock ?? null,
    nextRestockText: result.nextRestockText ?? null,
    typicalRestockDays: result.typicalRestockDays ?? null,
  };
}

async function runTool(shopId, call, signal) {
  if (call.name !== 'check_stock') return { error: `Unknown tool ${call.name}.` };
  const product = typeof call.args?.product === 'string' ? call.args.product.trim().slice(0, 100) : '';
  if (!product) return { error: 'Say which product to check.' };
  try {
    const result = await withDeadline(checkStock(shopId, product), signal);
    return result && typeof result === 'object' ? result : { error: 'No result.' };
  } catch (err) {
    if (signal.aborted) throw err;
    throw failure('StockError', err);
  }
}

async function runTurn(ai, model, shop, text, signal) {
  const config = {
    systemInstruction: instructions(shop),
    tools: [{ functionDeclarations: [checkStockDeclaration] }],
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    abortSignal: signal,
  };
  // The first round must look the product up, so stock never comes from the model's memory.
  const forceConfig = {
    ...config,
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ['check_stock'] },
    },
  };
  // After the last tool round the model must answer in words.
  const answerConfig = {
    ...config,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.NONE } },
  };
  const contents = [{ role: 'user', parts: [{ text }] }];
  let stock = null;

  for (let round = 0; ; round++) {
    const lastRound = round === MAX_TOOL_ROUNDS;
    const response = await ai.models.generateContent({
      model,
      contents,
      config: round === 0 ? forceConfig : lastRound ? answerConfig : config,
    });
    const calls = response.functionCalls ?? [];
    if (calls.length === 0 || lastRound) {
      const reply = response.text?.trim();
      if (!reply) throw failure('EmptyReply');
      return { reply, stock };
    }

    // The model's turn goes back unchanged: Gemini 3 needs its thought signatures on the next call.
    contents.push(response.candidates[0].content);
    const results = await Promise.all(calls.map((call) => runTool(shop.id, call, signal)));
    for (const result of results) {
      if (result.found === true) stock = stockFields(result);
    }
    contents.push({
      role: 'user',
      parts: calls.map((call, i) => ({
        functionResponse: { id: call.id, name: call.name, response: results[i] },
      })),
    });
  }
}

let client;

// shop: { id, name, staff } from shops.js; text: the visitor's question, already validated.
// Resolves to { reply, stock }; throws when no model could answer in time.
export async function askClerk(shop, text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw failure('NoGeminiKey');
  client ??= new GoogleGenAI({ apiKey });

  const started = performance.now();
  const deadline = started + TIMEOUT_MS;
  let lastError = failure('NoTimeLeft');
  for (const [i, model] of ATTEMPT_MODELS.entries()) {
    const ms = Math.floor(Math.min(ATTEMPT_MS, deadline - performance.now()));
    if (ms <= 0) break;
    // Each attempt has its own deadline, so a model that hangs (not only one that errors)
    // hands the rest of the 10 s to the next attempt.
    const signal = AbortSignal.timeout(ms);
    try {
      const answer = await withDeadline(runTurn(client, model, shop, text, signal), signal);
      console.log(`clerk: answered by ${model} (attempt ${i + 1}) in ${Math.round(performance.now() - started)}ms`);
      return answer;
    } catch (err) {
      lastError = err;
      console.warn(`clerk: attempt ${i + 1} ${model} failed: ${errorType(err)}`);
      // A stock failure would fail the next attempt the same way.
      if (err?.name === 'StockError') break;
    }
  }
  throw lastError;
}
