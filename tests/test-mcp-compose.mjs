// Test the enhanced MCP compose_workflow with the complex multi-agent research prompt
const REQUEST = 'create a workflow using different agent browsers that search for technical terms on the internet using headless browsers, then brings it to another agent that analyzes classifies categorizes, then another agent validates the source URL and makes sure everything is proven. Then write a full report with a sub-agent and generate 4 images. Send daily articles to email aibusinessclub98@gmail.com';

async function main() {
  console.log('=== Testing Enhanced MCP Compose Workflow ===\n');

  const response = await fetch('https://n8n-workflow-mcp.aibusinessclub98.workers.dev/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'compose_workflow',
        arguments: {
          request: REQUEST,
          requirements: {
            trigger_type: 'schedule',
            complexity: 'advanced',
            include_error_handling: true,
          },
        },
      },
    }),
  });

  const result = await response.json();

  if (result.error) {
    console.log('ERROR:', result.error);
    return;
  }

  // The result could be in different formats depending on the tool
  let workflowData;
  if (result.result?.content) {
    workflowData = JSON.parse(result.result.content[0].text);
  } else {
    workflowData = result.result;
  }

  const wf = workflowData.workflow || workflowData;
  const meta = workflowData.metadata || {};

  console.log('Workflow Name:', wf.name);
  console.log('Total Nodes:', wf.nodes?.length || 0);
  console.log('Strategy:', meta.generation_strategy || 'unknown');
  console.log('Confidence:', meta.confidence_score || 'N/A');
  console.log('\nNodes:');
  (wf.nodes || []).forEach((n, i) => {
    const hasParams = Object.keys(n.parameters || {}).length > 0;
    console.log(`  ${i + 1}. ${n.name} (${n.type}) ${hasParams ? '✅ has params' : '⚠️ empty params'}`);
  });

  console.log('\nConnections:');
  const connKeys = Object.keys(wf.connections || {});
  console.log(`  ${connKeys.length} nodes have outgoing connections`);
  connKeys.forEach(key => {
    const targets = wf.connections[key]?.main?.[0]?.map(c => c.node) || [];
    console.log(`  ${key} → ${targets.join(', ')}`);
  });

  // Save the workflow
  const fs = await import('fs');
  fs.writeFileSync('generated-workflows/mcp-qwq-test.json', JSON.stringify(wf, null, 2));
  console.log('\n✅ Saved to generated-workflows/mcp-qwq-test.json');

  // Quality check
  console.log('\n=== QUALITY CHECK ===');
  const nodeCount = wf.nodes?.length || 0;
  const hasRealParams = wf.nodes?.filter(n => Object.keys(n.parameters || {}).length > 2).length || 0;
  const hasConnections = connKeys.length;
  const hasTrigger = wf.nodes?.some(n => n.type?.includes('trigger') || n.type?.includes('Trigger'));
  const hasErrorHandling = wf.nodes?.some(n => n.type?.includes('error'));
  const hasEmail = wf.nodes?.some(n => n.type?.includes('email'));

  console.log(`  Nodes >= 10: ${nodeCount >= 10 ? '✅' : '❌'} (${nodeCount})`);
  console.log(`  Nodes with real params: ${hasRealParams >= 5 ? '✅' : '❌'} (${hasRealParams})`);
  console.log(`  Has connections: ${hasConnections >= 5 ? '✅' : '❌'} (${hasConnections})`);
  console.log(`  Has trigger: ${hasTrigger ? '✅' : '❌'}`);
  console.log(`  Has error handling: ${hasErrorHandling ? '✅' : '❌'}`);
  console.log(`  Has email delivery: ${hasEmail ? '✅' : '❌'}`);

  const score = [nodeCount >= 10, hasRealParams >= 5, hasConnections >= 5, hasTrigger, hasErrorHandling, hasEmail].filter(Boolean).length;
  console.log(`\n  QUALITY SCORE: ${score}/6 ${score >= 5 ? '🟢 PASS' : score >= 3 ? '🟡 PARTIAL' : '🔴 FAIL'}`);
}

main().catch(console.error);
