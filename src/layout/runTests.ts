import { runFullLayoutTestSuite } from './layoutEngine.test';

console.log('--- Running BANAVA Layout Engine 18-Test Suite ---');
const results = runFullLayoutTestSuite();
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
