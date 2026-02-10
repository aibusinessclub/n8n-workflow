/**
 * Finish remaining pipeline stages with smaller batches and longer pauses.
 * Status: 5000 collected, 5000 cleaned, 4000 classified, 0 embedded
 * Need: classify remaining 1000, embed all 5000
 */
const BASE = 'https://n8n-workflow-mcp.aibusinessclub98.workers.dev';

async function callStage(stage, body = {}) {
  const res = await fetch(`${BASE}/api/pipeline/stage/${stage}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { success: false, details: { error: `HTTP ${res.status}` }, duration_ms: 0 };
  }
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runStage(name, limit, getCount, maxRounds, pauseMs) {
  console.log(`\n--- ${name.toUpperCase()} (limit=${limit}, pause=${pauseMs}ms) ---`);
  let total = 0, round = 0, consecutiveFails = 0;

  while (round < maxRounds) {
    round++;
    process.stdout.write(`  [${round}] `);
    try {
      const result = await callStage(name, { limit });
      if (!result.success) {
        consecutiveFails++;
        console.log(`❌ ${result.details?.error || 'failed'}`);
        if (consecutiveFails >= 3) { console.log('  3 consecutive fails. Pausing 30s...'); await sleep(30000); consecutiveFails = 0; }
        else await sleep(pauseMs * 2);
        continue;
      }
      consecutiveFails = 0;
      const d = result.details || {};
      const count = getCount(d);
      const remaining = d.remaining ?? 0;
      total += count;
      console.log(`✅ +${count} (total: ${total}, remaining: ${remaining}) [${result.duration_ms}ms]`);
      if (remaining <= 0 || count === 0) { console.log(`  ✓ Done!`); break; }
    } catch (e) {
      consecutiveFails++;
      console.log(`❌ ${e.message}`);
      if (consecutiveFails >= 3) { console.log('  Pausing 30s...'); await sleep(30000); consecutiveFails = 0; }
      else await sleep(pauseMs * 2);
      continue;
    }
    await sleep(pauseMs);
  }
  console.log(`  Total: ${total}\n`);
  return total;
}

async function main() {
  const t0 = Date.now();
  console.log('=== Finishing Pipeline (classify + embed) ===');
  console.log('Waiting 15s for rate limits to cool down...');
  await sleep(15000);

  // Classify remaining ~1000 with smaller batches
  await runStage('classify', 200, d => d.classified || 0, 10, 3000);

  // Embed all ~5000 with small batches and long pauses
  await runStage('embed', 50, d => d.embedded || 0, 120, 3000);

  console.log(`\n⏱️  Time: ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

main().catch(console.error);
