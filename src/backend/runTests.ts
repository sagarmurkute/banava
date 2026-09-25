/**
 * Phase 7 Backend & Supabase Integration Test Runner
 */

import { runBackendTests } from './backendEngine.test';

async function main() {
  console.log('====================================================');
  console.log('  BANAVA — PHASE 7 BACKEND & CLOUD TESTS');
  console.log('====================================================\n');

  const results = runBackendTests();

  let passedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    if (r.passed) {
      console.log(`  ✓ [PASS] ${r.name}`);
      passedCount++;
    } else {
      console.log(`  ✗ [FAIL] ${r.name}`);
      if (r.error) console.log(`      Error: ${r.error}`);
      failedCount++;
    }
  }

  console.log('\n----------------------------------------------------');
  console.log(`  Results: ${passedCount} passed, ${failedCount} failed (${results.length} total)`);
  console.log('====================================================\n');

  if (failedCount > 0 && typeof (globalThis as any).process !== 'undefined') {
    (globalThis as any).process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running Phase 7 tests:', err);
  if (typeof (globalThis as any).process !== 'undefined') {
    (globalThis as any).process.exit(1);
  }
});
