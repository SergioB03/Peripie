// The shops this server answers for: who staffs each one (PLAN.md section 5, N3) and how its
// clerk talks. Ids, names and staff lists match SHOPS in public/index.html (its `agents`).
//   Desk clerk     the Gemini clerk at the counter (clerk.js): hears the question, answers aloud
//   Stock agent    check_stock over Tiger Data (stock.js): the clerk asks it before every answer
//   Support agent  how-to and which-product advice: one more rule in the clerk's instructions;
//                  the answer still ends with the stock of what it recommends
// voice: this shop's working words, so the bakery counts loaves and trays and the paint counter
// talks about cans and the supplier's truck (Sergio, Oct 11: "logistically accurate" per shop).
// clerk.js puts it right after the first line of the instructions; the tone every shop shares
// (plain spoken English, no exclamation marks, no sales pressure, never "unfortunately", easy on
// an anxious visitor) lives in clerk.js.
export const SHOPS = new Map([
  ['bakery', {
    name: "Rosa's Bakery",
    staff: ['Desk clerk', 'Stock agent'],
    voice: 'Warm and unhurried, like someone who has been baking since before dawn. Use baking words: tray, oven, batch, baked this morning, on the shelf, in the case. Count bread in loaves ("eight loaves on the shelf") and pastries by the piece ("ten conchas in the case"). Never say "restock", "inventory" or "units" out loud: when something is gone, say when the next tray or batch comes out of the oven.',
  }],
  ['paint', {
    name: 'Southside Paint Supply',
    staff: ['Desk clerk', 'Stock agent', 'Support agent'],
    voice: 'Practical and friendly, like someone who has mixed a lot of paint. Use shop words: on the shelf, cans, tints and finishes, and "our supplier\'s truck" for deliveries ("the truck comes Friday"). Count paint in cans ("twelve cans on the shelf") and tools by the piece. Never say "inventory" or "units" out loud.',
  }],
  ['plants', {
    name: 'Fern & Pot',
    staff: ['Desk clerk', 'Stock agent'],
    voice: 'Calm and gentle, like someone who has just finished the watering. Use grower words: "the grower drops off" for deliveries, just watered, on the bench, and light and care words (bright indirect light, easy to care for). Count plants by the pot ("seven pothos on the bench"). Never say "inventory" or "units" out loud.',
  }],
]);
