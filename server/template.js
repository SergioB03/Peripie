// The reply when no model can answer but a stock lookup found the product (PLAN.md section 3):
// the same facts the model would give, composed from the check_stock record, so a model outage
// still speaks the right count or restock date.
export function templatedReply(found) {
  const { product, inStock, onHand, nextRestockText, typicalRestockDays } = found;
  if (inStock) return `Yes, we have ${product} in stock, ${onHand} on hand.`;
  if (!nextRestockText) return `We're out of ${product} right now, and I don't have a restock date yet.`;
  const days = wholeDays(typicalRestockDays);
  const usual = days ? `, and it usually takes about ${dayCount(days)}.` : '.';
  return `We're out of ${product} right now. It's back ${nextRestockText}${usual}`;
}

// Spoken aloud, so whole days: 4.5 becomes "about 5 days". Null when there is no history.
function wholeDays(typicalRestockDays) {
  return typicalRestockDays > 0 ? Math.max(1, Math.round(typicalRestockDays)) : null;
}

const dayCount = (days) => `${days} day${days === 1 ? '' : 's'}`;

// ---------- a list ----------

// A list's facts in the order the clerk says them: what is in stock, what is out (with its
// restock date), what the shop does not carry (in the visitor's words), and the in-stock
// products not already on the list, to suggest one. Each product is named once, in list order.
// The model's summary and the templated one are both made from these. stocks: the response's
// per-item entries, in request order (found ones carry the check_stock record).
export function listFacts(stocks) {
  const inStock = [];
  const outOfStock = [];
  const notCarried = [];
  const named = new Set();
  const notCarriedSeen = new Set();
  let shopInStock = [];
  for (const s of stocks) {
    if (s.found) {
      if (named.has(s.product)) continue;
      named.add(s.product);
      if (s.inStock) inStock.push({ product: s.product, onHand: s.onHand });
      else {
        outOfStock.push({
          product: s.product,
          nextRestockText: s.nextRestockText ?? null,
          typicalRestockDays: wholeDays(s.typicalRestockDays),
        });
      }
    } else {
      shopInStock = s.inStockProducts; // the same list for every miss: the shop's in-stock products
      const key = s.query.toLowerCase();
      if (notCarriedSeen.has(key)) continue;
      notCarriedSeen.add(key);
      notCarried.push(s.query);
    }
  }
  const suggest = notCarried.length ? shopInStock.filter((p) => !named.has(p)) : [];
  return { inStock, outOfStock, notCarried, suggest };
}

// "a"; "a, and b"; "a; b; and c". Entries carry commas of their own ("croissant, back Tuesday,
// October 13"), so longer runs are split by semicolons to stay readable and pause when spoken.
function series(entries, semicolons) {
  if (entries.length === 1) return entries[0];
  const sep = semicolons ? ';' : ',';
  return `${entries.slice(0, -1).join(`${sep} `)}${sep} and ${entries.at(-1)}`;
}

// "pizza"; "pizza or cake"; "pizza, cake, or tea"; past three, the rest are counted.
const NAMED_NOT_CARRIED = 3;
function orList(words) {
  if (words.length === 1) return words[0];
  if (words.length === 2) return `${words[0]} or ${words[1]}`;
  const shown = words.slice(0, NAMED_NOT_CARRIED);
  const more = words.length - shown.length;
  if (!more) return `${shown.slice(0, -1).join(', ')}, or ${shown.at(-1)}`;
  return `${shown.join(', ')}, or the ${more} other thing${more === 1 ? '' : 's'} on your list`;
}

function outEntry({ product, nextRestockText, typicalRestockDays }) {
  if (!nextRestockText) return `${product}, no restock date yet`;
  const usual = typicalRestockDays ? `, usually about ${dayCount(typicalRestockDays)}` : '';
  return `${product}, back ${nextRestockText}${usual}`;
}

// The list's summary when no model can word it (PLAN.md section 3, list request): "In stock:
// sourdough, 8 on hand, and concha, 10. Out: croissant, back Tuesday, October 13, usually about
// 3 days. We don't carry pizza." The facts are known before any model is asked, so a list
// always gets an answer.
export function templatedListReply({ inStock, outOfStock, notCarried, suggest }) {
  const sentences = [];
  if (inStock.length) {
    const entries = inStock.map(({ product, onHand }, i) => `${product}, ${onHand}${i === 0 ? ' on hand' : ''}`);
    sentences.push(`In stock: ${series(entries, entries.length > 2)}.`);
  }
  if (outOfStock.length) sentences.push(`Out: ${series(outOfStock.map(outEntry), outOfStock.length > 1)}.`);
  if (notCarried.length) {
    const instead = suggest.length ? `, but we do have ${suggest[0]}` : '';
    sentences.push(`We don't carry ${orList(notCarried)}${instead}.`);
  }
  return sentences.join(' ');
}
