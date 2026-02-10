// Quick count of generated templates
// Simulate the generator logic to verify count

const CATS_COUNT = 25;
const SUBS_PER_CAT = 5;
const PAIRS_PER_CAT = 14;
const COMPLEXITIES = 3;

const total = CATS_COUNT * SUBS_PER_CAT * PAIRS_PER_CAT * COMPLEXITIES;
const capped = Math.min(total, 4970);
const withBase = capped + 30; // 30 from collector.ts

console.log(`Categories: ${CATS_COUNT}`);
console.log(`Subcategories per cat: ${SUBS_PER_CAT}`);
console.log(`Integration pairs per cat: ${PAIRS_PER_CAT}`);
console.log(`Complexity levels: ${COMPLEXITIES}`);
console.log(`Total possible: ${total}`);
console.log(`Capped at: ${capped}`);
console.log(`+ Base templates: 30`);
console.log(`= Total templates: ${withBase}`);
