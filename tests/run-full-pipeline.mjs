/**
 * Full Pipeline Runner - Collects, cleans, classifies, embeds all 5000 templates
 * All stages paginated to respect Cloudflare Worker limits.
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
    return { success: false, details: { error: `HTTP ${res.status}`, body: text.slice(0, 200) }, duration_ms: 0 };
  }
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runPaginated(stageName, emoji, bodyFn, getProcessed, limit, maxRounds, pauseMs) {
  console.log(`\n${emoji} ${stageName.toUpperCase()}`);
  let total = 0, round = 0, failures = 0;

  while (round < maxRounds) {
    round++;
    const body = bodyFn(round, total);
    process.stdout.write(`  [${round}] `);

    try {
      const result = await callStage(stageName, body);
      if (!result.success) {
        failures++;
        console.log(`❌ ${JSON.stringify(result.details).slice(0, 150)}`);
        if (failures > 3) { console.log('  Stopping after 3+ failures.'); break; }
        await sleep(5000); continue;
      }
      failures = 0;
      const d = result.details || {};
      const processed = getProcessed(d);
      const remaining = d.remaining ?? 0;
      total += processed;
      console.log(`✅ +${processed} (total: ${total}, remaining: ${remaining}) [${result.duration_ms}ms]`);
      if (remaining <= 0 || processed === 0) { console.log(`  ✓ ${stageName} complete!`); break; }
    } catch (e) {
      failures++;
      console.log(`❌ ${e.message}`);
      if (failures > 3) { console.log('  Stopping.'); break; }
      await sleep(5000); continue;
    }
    await sleep(pauseMs);
  }
  console.log(`  Total ${stageName}: ${total}`);
  return total;
}

async function main() {
  const t0 = Date.now();
  console.log('=== Full Pipeline: 5000 Templates → D1 + Vectorize ===');

  // 1. COLLECT (500 per call, offset increments)
  let collectOffset = 0;
  await runPaginated('collect', '📦',
    (round) => ({ offset: (round - 1) * 500, limit: 500 }),
    (d) => d.collected || 0,
    500, 12, 1000
  );

  // 2. CLEAN (500 per call)
  await runPaginated('clean', '🧹',
    () => ({ limit: 500 }),
    (d) => d.cleaned || 0,
    500, 15, 1000
  );

  // 3. CLASSIFY (500 per call)
  await runPaginated('classify', '🏷️',
    () => ({ limit: 500 }),
    (d) => d.classified || 0,
    500, 15, 1000
  );

  // 4. EMBED (100 per call, longer pause for AI rate limits)
  await runPaginated('embed', '🧠',
    () => ({ limit: 100 }),
    (d) => d.embedded || 0,
    100, 60, 2000
  );

  // Final status check
  console.log('\n📊 FINAL DB STATUS:');
  try {
    const r = await callStage('collect', { offset: 0, limit: 0 });
    console.log(`  Total templates in generator: ${r.details?.total || '?'}`);
  } catch {}

  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n⏱️  Total time: ${elapsed}s`);
  console.log('✅ Done!');
}

main().catch(console.error);
