// The reply when no model can answer but a stock lookup found the product (PLAN.md section 3):
// the same facts the model would give, composed from the check_stock record, so a model outage
// still speaks the right count or restock date.
export function templatedReply(found) {
  const { product, inStock, onHand, nextRestockText, typicalRestockDays } = found;
  if (inStock) return `Yes, we have ${product} in stock, ${onHand} on hand.`;
  if (!nextRestockText) return `We're out of ${product} right now, and I don't have a restock date yet.`;
  // Spoken aloud, so whole days: 4.5 becomes "about 5 days".
  const days = typicalRestockDays > 0 ? Math.max(1, Math.round(typicalRestockDays)) : null;
  const usual = days ? `, and it usually takes about ${days} day${days === 1 ? '' : 's'}.` : '.';
  return `We're out of ${product} right now. It's back ${nextRestockText}${usual}`;
}
