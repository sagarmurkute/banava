import { runFullSystemTestSuite } from './systemEngine.test';

console.log('--- Running BANAVA System Engine 20-Test Suite (Phase 4) ---');
const results = runFullSystemTestSuite();
let passed = 0;
let failed = 0;

results.forEach((r) => {
  if (r.passed) {
    console.log(`✓ PASS: ${r.name}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${r.name} -> ${r.error}`);
    failed++;
  }
});

console.log(`\n================================`);
console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
console.log(`================================`);

const nodeProcess = (globalThis as unknown as { process?: { exit: (code: number) => void } }).process;
if (failed > 0) {
  nodeProcess?.exit(1);
} else {
  nodeProcess?.exit(0);
}
