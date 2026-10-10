#!/usr/bin/env node
// Hand a job to the local Ollama server (PLAN.md section 7).
//
//   node scripts/ollama.mjs [--model NAME] [--out FILE] [--system TEXT] [--ctx N] PROMPT_FILE
//   node scripts/ollama.mjs --model coder16k --out db/extra.sql prompts/seed.txt
//
// PROMPT_FILE may be "-" to read the prompt from stdin. Output goes to --out,
// or to stdout. Timing goes to stderr. No visitor data ever passes through here.
//
// Models on this machine (ollama list): qwen3.5:9b (prose), coder16k / qwen2.5-coder:14b (code, 32k ctx).

const args = process.argv.slice(2);
// OLLAMA_HOST is usually the server's bind address (e.g. 0.0.0.0), not a URL we can call.
let host = (process.env.OLLAMA_HOST || 'localhost:11434').trim().replace(/\/+$/, '').replace(/^0\.0\.0\.0/, 'localhost');
if (!/^https?:\/\//.test(host)) host = 'http://' + host;
if (!/:\d+$/.test(host)) host += ':11434';
const opt = { model: 'qwen3.5:9b', out: null, system: null, ctx: 16384, host };
const rest = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--model') opt.model = args[++i];
  else if (a === '--out') opt.out = args[++i];
  else if (a === '--system') opt.system = args[++i];
  else if (a === '--ctx') opt.ctx = Number(args[++i]);
  else rest.push(a);
}
if (rest.length !== 1) {
  console.error('usage: node scripts/ollama.mjs [--model NAME] [--out FILE] [--system TEXT] [--ctx N] PROMPT_FILE|-');
  process.exit(2);
}

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const prompt = rest[0] === '-' ? readFileSync(0, 'utf8') : readFileSync(rest[0], 'utf8');

async function generate(think) {
  const body = { model: opt.model, prompt, stream: false, options: { num_ctx: opt.ctx, temperature: 0.4 } };
  if (opt.system) body.system = opt.system;
  if (think !== undefined) body.think = think;
  const r = await fetch(opt.host + '/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error(`ollama ${r.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const t0 = Date.now();
let res;
try {
  res = await generate(false);            // thinking off: we want volume, not deliberation
} catch (e) {
  if (!/think/i.test(e.message)) throw e;  // model has no thinking switch; retry plain
  res = await generate(undefined);
}
let out = (res.response || '').trim();
// Strip a fenced wrapper if the model put the whole answer in one code fence.
const m = out.match(/^```[a-z]*\n([\s\S]*?)\n```$/);
if (m) out = m[1];

if (opt.out) {
  mkdirSync(dirname(opt.out), { recursive: true });
  writeFileSync(opt.out, out + '\n');
} else {
  process.stdout.write(out + '\n');
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.error(`[ollama] ${opt.model}: ${res.eval_count ?? '?'} tokens in ${secs}s${opt.out ? ' -> ' + opt.out : ''}`);
