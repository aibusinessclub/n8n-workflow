/**
 * Pipeline Runner - Indexes all 5000 templates into D1/Vectorize
 * 
 * Runs each stage with pagination to respect Cloudflare Worker limits:
 * - Collect: 500 templates per call × 10 calls = 5000
 * - Clean: processes all 'collecting' status workflows
 * - Classify: processes all 'cleaning' status workflows
 * - Embed: 100 templates per call × 50 calls = 5000
 */

const BASE = 'https://n8n-workflow-mcp.aibusinessclub98.workers.dev';

async function callStage(stage, body = {}) {
  const res = await fetch(`${BASE}/api/pipeline/stage/${stage}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Pipeline Runner: Indexing 5000 Templates ===\n');
  const startTime = Date.now();

  // Stage 1: Collect (paginated, 500 per call)
  console.log('📦 STAGE 1: COLLECT');
  let offset = 0;
  const collectLimit = 500;
  let totalCollected = 0;
  
  while (true) {
    console.log(`  Collecting offset=${offset} limit=${collectLimit}...`);
    const result = await callStage('collect', { offset, limit: collectLimit });
    
    if (!result.success) {
      console.log(`  ❌ Collect failed:`, result.details);
      // Try to continue with next batch
    }
    
    const details = result.details || {};
    const collected = details.collected || 0;
    const remaining = details.remaining || 0;
    totalCollected += collected;
    
    console.log(`  ✅ Collected ${collected} (total: ${totalCollected}, remaining: ${remaining}) [${result.duration_ms}ms]`);
    
    if (remaining <= 0 || collected === 0) break;
    offset += collectLimit;
    await sleep(1000); // Brief pause between batches
  }
  console.log(`  📦 Total collected: ${totalCollected}\n`);

  // Stage 2: Clean
  console.log('🧹 STAGE 2: CLEAN');
  const cleanResult = await callStage('clean');
  const cleanDetails = cleanResult.details || {};
  console.log(`  ✅ Cleaned ${cleanDetails.cleaned || 0}, failed ${cleanDetails.failed || 0} [${cleanResult.duration_ms}ms]\n`);

  // Stage 3: Classify
  console.log('🏷️  STAGE 3: CLASSIFY');
  const classifyResult = await callStage('classify');
  const classifyDetails = classifyResult.details || {};
  console.log(`  ✅ Classified ${classifyDetails.classified || 0}, failed ${classifyDetails.failed || 0} [${classifyResult.duration_ms}ms]\n`);

  // Stage 4: Embed (paginated, 100 per call)
  console.log('🧠 STAGE 4: EMBED');
  let totalEmbedded = 0;
  let embedRound = 0;
  
  while (true) {
    embedRound++;
    console.log(`  Embedding batch ${embedRound} (limit=100)...`);
    const result = await callStage('embed', { limit: 100 });
    
    if (!result.success) {
      console.log(`  ❌ Embed failed:`, result.details);
      break;
    }
    
    const details = result.details || {};
    const embedded = details.embedded || 0;
    const remaining = details.remaining || 0;
    totalEmbedded += embedded;
    
    console.log(`  ✅ Embedded ${embedded} (total: ${totalEmbedded}, remaining: ${remaining}) [${result.duration_ms}ms]`);
    
    if (remaining <= 0 || embedded === 0) break;
    await sleep(2000); // Pause to respect AI rate limits
  }
  console.log(`  🧠 Total embedded: ${totalEmbedded}\n`);

  // Check final status
  console.log('📊 FINAL STATUS:');
  const statusRes = await fetch(`${BASE}/api/pipeline/status`, { method: 'POST' });
  const status = await statusRes.json();
  console.log('  Workflow status:', JSON.stringify(status.workflow_status, null, 2));
  console.log('  Categories:', status.categories?.length || 0);
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️  Total time: ${totalTime}s`);
  console.log(`\n✅ Pipeline complete! ${totalCollected} templates collected, ${totalEmbedded} embedded.`);
}

main().catch(console.error);
