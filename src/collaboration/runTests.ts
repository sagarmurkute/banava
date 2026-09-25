/**
 * Phase 8 Real-Time Multiplayer Collaboration Test Runner
 */

import { runCollaborationTests } from './collaborationEngine.test';

async function main() {
  console.log('====================================================');
  console.log('  BANAVA — PHASE 8 MULTIPLAYER COLLABORATION TESTS');
  console.log('====================================================\n');

  const results = runCollaborationTests();

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
  } else if (typeof (globalThis as any).process !== 'undefined') {
    (globalThis as any).process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error running Phase 8 tests:', err);
  if (typeof (globalThis as any).process !== 'undefined') {
    (globalThis as any).process.exit(1);
  }
});
