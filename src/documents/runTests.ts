import { runDocumentTests } from './documentEngine.test';

console.log('--- Running BANAVA Document & File Engine 15-Test Suite (Phase 6) ---');
const results = runDocumentTests();

let passed = 0;
let failed = 0;

for (const res of results) {
  if (res.passed) {
    console.log(`✓ PASS: ${res.name}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${res.name}`);
    console.error(`  Error: ${res.error}`);
    failed++;
  }
}

console.log('\n================================');
console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
console.log('================================');

if (failed > 0 && typeof (globalThis as any).process !== 'undefined') {
  (globalThis as any).process.exit(1);
}
