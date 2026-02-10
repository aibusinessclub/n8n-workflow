/**
 * Run remaining pipeline stages: clean → classify → embed
 * All stages are paginated (500 per call for clean/classify, 100 for embed).
 * Templates are already collected in D1.
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPaginatedStage(name, emoji, limit, maxRounds, pauseMs) {
  console.log(`${emoji} ${name}`);
  let total = 0;
  let round = 0;
  let failures = 0;

  while (round < maxRounds) {
    round++;
    process.stdout.write(`  Batch ${round} (limit=${limit})... `);

    try {
      const result = await callStage(name.toLowerCase(), { limit });

      if (!result.success) {
        failures++;
        console.log(`❌ Failed: ${JSON.stringify(result.details).slice(0, 200)}`);
        if (failures > 3) { console.log('  Too many failures, moving on.'); break; }
        await sleep(5000);
        continue;
      }
      failures = 0;

      const d = result.details || {};
      const processed = d.cleaned || d.classified || d.embedded || 0;
      const remaining = d.remaining || 0;
      total += processed;
      console.log(`✅ ${processed} processed (total: ${total}, remaining: ${remaining}) [${result.duration_ms}ms]`);

      if (remaining <= 0 || processed === 0) {
        console.log('  ✓ Stage complete!');
        break;
      }
    } catch (e) {
      failures++;
      console.log(`❌ Error: ${e.message}`);
      if (failures > 3) { console.log('  Too many failures, moving on.'); break; }
      await sleep(5000);
      continue;
    }

    await sleep(pauseMs);
  }
  console.log(`  Total: ${total}\n`);
  return total;
}

async function main() {
  console.log('=== Pipeline: Clean → Classify → Embed (5000 templates) ===\n');

  // Check status
  console.log('📊 Current DB status:');
  try {
    const statusRes = await fetch(`${BASE}/api/pipeline/status`, { method: 'POST' });
    const status = await statusRes.json();
    console.log('  ', JSON.stringify(status.workflow_status));
  } catch (e) { console.log('  Could not fetch status'); }
  console.log('');

  // Clean: 500 per call, max 15 rounds
  await runPaginatedStage('clean', '🧹', 500, 15, 1000);

  // Classify: 500 per call, max 15 rounds  
  await runPaginatedStage('classify', '🏷️', 500, 15, 1000);

  // Embed: 100 per call, max 60 rounds, longer pause for AI rate limits
  await runPaginatedStage('embed', '🧠', 100, 60, 2000);

  // Final status
  console.log('📊 FINAL STATUS:');
  try {
    const statusRes = await fetch(`${BASE}/api/pipeline/status`, { method: 'POST' });
    const status = await statusRes.json();
    console.log('  Workflow status:', JSON.stringify(status.workflow_status, null, 2));
  } catch (e) { console.log('  Could not fetch status'); }

  console.log('\n✅ Pipeline complete!');
}

main().catch(console.error);
