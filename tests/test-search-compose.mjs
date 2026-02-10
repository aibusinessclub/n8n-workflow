/**
 * Test semantic search and compose with pauses to avoid rate limits.
 */
const BASE = 'https://n8n-workflow-mcp.aibusinessclub98.workers.dev';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return res.json();
}

async function main() {
  console.log('=== Testing Search & Compose (5000 templates indexed) ===\n');

  // Test 1: Search
  console.log('--- SEARCH TESTS ---');
  const queries = [
    'sync database PostgreSQL MySQL real-time',
    'AI chatbot customer support automated',
    'Shopify order fulfillment e-commerce',
    'HR onboarding employee automation',
    'marketing email campaign lead nurturing',
  ];

  for (const q of queries) {
    console.log(`\n🔍 "${q}"`);
    const r = await post('/api/search', { query: q, limit: 5 });
    if (r.error) { console.log(`  ❌ ${r.error}`); await sleep(5000); continue; }
    if (r.results?.length > 0) {
      for (const t of r.results.slice(0, 3)) {
        console.log(`  ✅ ${t.name} [${t.category}]`);
      }
      console.log(`  (${r.results.length} total results)`);
    } else {
      console.log(`  No results`);
    }
    await sleep(3000);
  }

  // Test 2: Compose (with template context)
  console.log('\n\n--- COMPOSE TESTS ---');
  const composeRequests = [
    'Create a workflow that syncs Salesforce contacts to HubSpot CRM with deduplication',
    'Build an AI-powered customer support chatbot using OpenAI and Zendesk',
  ];

  for (const req of composeRequests) {
    console.log(`\n🔧 "${req}"`);
    const r = await post('/api/compose', { request: req, complexity: 'intermediate' });
    if (r.error) { console.log(`  ❌ ${r.error}`); await sleep(5000); continue; }
    if (r.workflow) {
      console.log(`  Name: ${r.workflow.name}`);
      console.log(`  Nodes: ${r.workflow.nodes?.length || 0}`);
      console.log(`  Path: ${r.generation_path || 'unknown'}`);
      if (r.similar_templates?.length > 0) {
        console.log(`  Template context: ${r.similar_templates.length} similar templates found`);
        for (const t of r.similar_templates.slice(0, 2)) {
          console.log(`    → ${t.name}`);
        }
      }
    } else {
      console.log(`  Response: ${JSON.stringify(r).slice(0, 300)}`);
    }
    await sleep(5000);
  }

  console.log('\n\n✅ Tests complete!');
}

main().catch(console.error);
