// The shops this server answers for, and who staffs each one (PLAN.md section 5, N3). Ids,
// names and staff lists match SHOPS in public/index.html (its `agents`).
//   Desk clerk     the Gemini clerk at the counter (clerk.js): hears the question, answers aloud
//   Stock agent    check_stock over Tiger Data (stock.js): the clerk asks it before every answer
//   Support agent  how-to and which-product advice: one more rule in the clerk's instructions;
//                  the answer still ends with the stock of what it recommends
export const SHOPS = new Map([
  ['bakery', { name: "Rosa's Bakery", staff: ['Desk clerk', 'Stock agent'] }],
  ['paint', { name: 'Southside Paint Supply', staff: ['Desk clerk', 'Stock agent', 'Support agent'] }],
  ['plants', { name: 'Fern & Pot', staff: ['Desk clerk', 'Stock agent'] }],
]);
