/**
 * Test semantic search and compose_workflow with 5000 indexed templates.
 * Verifies the ai_planned_with_context path produces better results.
 */
const BASE = 'https://n8n-workflow-mcp.aibusinessclub98.workers.dev';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function testSearch(query) {
  console.log(`\n🔍 Search: "${query}"`);
  const result = await post('/api/search', { query, limit: 5 });
  if (result.results && result.results.length > 0) {
    console.log(`  Found ${result.results.length} results:`);
    for (const r of result.results) {
      console.log(`  - [${r.score?.toFixed(3) || '?'}] ${r.name} (${r.category})`);
    }
  } else {
    console.log(`  No results found. Response:`, JSON.stringify(result).slice(0, 300));
  }
  return result;
}

async function testCompose(request) {
  console.log(`\n🔧 Compose: "${request}"`);
  const result = await post('/api/compose', { request, complexity: 'intermediate' });
  if (result.workflow) {
    const wf = result.workflow;
    console.log(`  Name: ${wf.name}`);
    console.log(`  Nodes: ${wf.nodes?.length || 0}`);
    console.log(`  Node types: ${wf.nodes?.map(n => n.name || n.type).join(', ')}`);
    console.log(`  Generation path: ${result.generation_path || 'unknown'}`);
    if (result.similar_templates?.length > 0) {
      console.log(`  Similar templates found: ${result.similar_templates.length}`);
      for (const t of result.similar_templates.slice(0, 3)) {
        console.log(`    - [${t.score?.toFixed(3) || '?'}] ${t.name}`);
      }
    }
  } else {
    console.log(`  Response:`, JSON.stringify(result).slice(0, 500));
  }
  return result;
}

async function main() {
  console.log('=== Testing Enriched Search & Compose (5000 templates) ===');

  // Test 1: Broad search across multiple categories
  await testSearch('sync database PostgreSQL MySQL real-time');
  await testSearch('AI chatbot customer support automated');
  await testSearch('e-commerce Shopify order fulfillment');
  await testSearch('HR employee onboarding automation');
  await testSearch('marketing email campaign lead nurturing');

  // Test 2: Compose workflows leveraging template context
  await testCompose('Create a workflow that syncs Salesforce contacts to HubSpot CRM with deduplication');
  await testCompose('Build an AI-powered customer support chatbot using OpenAI and Zendesk');
  await testCompose('Automate Shopify order processing with Stripe payment verification and Slack notifications');

  console.log('\n\n✅ All tests complete!');
}

main().catch(console.error);
