/**
 * AI Workflow Composer
 * 
 * Uses Cloudflare AI (LLM) to generate n8n workflows from user requests.
 * Hybrid approach: LLM plans the architecture, code builds detailed JSON.
 */

import type {
  Env, ComposeRequest, ComposeResponse, N8nWorkflow, N8nNode,
  SearchResult, RefineRequest, RefineResponse, ValidateRequest, ValidationResult,
  ValidationCheck, ValidationIssue
} from '../models/types';
import { log } from '../utils/logger';
import { searchWorkflows } from '../search/engine';

// ============================================================================
// Node Builder Library - Real n8n node definitions with actual parameters
// ============================================================================

interface NodeBlueprint {
  type: string;
  typeVersion: number;
  parameters: Record<string, unknown>;
}

function buildScheduleTrigger(cron: string = '0 8 * * *', tz: string = 'UTC'): NodeBlueprint {
  return {
    type: 'n8n-nodes-base.scheduleTrigger',
    typeVersion: 1,
    parameters: { rule: { interval: [{ field: 'cronExpression', cronExpression: cron }] }, timezone: tz },
  };
}

function buildWebhookTrigger(path: string = '/webhook', method: string = 'POST'): NodeBlueprint {
  return {
    type: 'n8n-nodes-base.webhook',
    typeVersion: 1,
    parameters: { path, httpMethod: method, responseMode: 'onReceived' },
  };
}

function buildHttpRequest(method: string, url: string, headers: Array<{name:string;value:string}> = [], bodyParams: Array<{name:string;value:string}> = []): NodeBlueprint {
  const params: Record<string, unknown> = { method, url, options: {} };
  if (headers.length > 0) {
    params.authentication = 'genericCredentialType';
    params.genericAuthType = 'httpHeaderAuth';
    params.sendHeaders = true;
    params.headerParameters = { parameters: headers };
  }
  if (bodyParams.length > 0) {
    params.sendBody = true;
    params.bodyParameters = { parameters: bodyParams };
  }
  return { type: 'n8n-nodes-base.httpRequest', typeVersion: 4.1, parameters: params };
}

function buildOpenAiChat(systemPrompt: string, userPrompt: string, temp: number = 0.3, maxTokens: number = 2000): NodeBlueprint {
  return buildHttpRequest('POST', 'https://api.openai.com/v1/chat/completions',
    [
      { name: 'Authorization', value: 'Bearer {{ $credentials.openAiApi.apiKey }}' },
      { name: 'Content-Type', value: 'application/json' },
    ],
    [
      { name: 'model', value: 'gpt-4' },
      { name: 'messages', value: `=[{"role":"system","content":"${systemPrompt}"},{"role":"user","content":"${userPrompt}"}]` },
      { name: 'temperature', value: String(temp) },
      { name: 'max_tokens', value: String(maxTokens) },
    ]
  );
}

function buildBrowserScrape(urlExpr: string): NodeBlueprint {
  return buildHttpRequest('POST', 'https://api.browserless.io/scrape',
    [
      { name: 'Authorization', value: 'Bearer {{ $credentials.browserlessApi.apiKey }}' },
      { name: 'Content-Type', value: 'application/json' },
    ],
    [
      { name: 'url', value: urlExpr },
      { name: 'elements', value: '=[{"selector":"body","attribute":"text"}]' },
      { name: 'waitFor', value: '3000' },
    ]
  );
}

function buildImageGeneration(promptExpr: string, count: number = 4): NodeBlueprint {
  return buildHttpRequest('POST', 'https://api.openai.com/v1/images/generations',
    [
      { name: 'Authorization', value: 'Bearer {{ $credentials.openAiApi.apiKey }}' },
      { name: 'Content-Type', value: 'application/json' },
    ],
    [
      { name: 'model', value: 'dall-e-3' },
      { name: 'prompt', value: promptExpr },
      { name: 'n', value: String(count) },
      { name: 'size', value: '1024x1024' },
      { name: 'quality', value: 'hd' },
    ]
  );
}

function buildEmailSend(to: string, subjectExpr: string, bodyExpr: string, html: boolean = true): NodeBlueprint {
  return {
    type: 'n8n-nodes-base.emailSend',
    typeVersion: 2.1,
    parameters: {
      fromEmail: 'system@aibusinessclub.com',
      toEmail: to,
      subject: subjectExpr,
      emailType: html ? 'html' : 'text',
      message: bodyExpr,
      options: {},
    },
  };
}

function buildCode(jsCode: string): NodeBlueprint {
  return { type: 'n8n-nodes-base.code', typeVersion: 2, parameters: { jsCode } };
}

function buildMerge(mode: string = 'combine'): NodeBlueprint {
  return { type: 'n8n-nodes-base.merge', typeVersion: 2.1, parameters: { mode, combineBy: 'combineAll' } };
}

function buildIfNode(condition: string): NodeBlueprint {
  return { type: 'n8n-nodes-base.if', typeVersion: 1, parameters: { conditions: { string: [{ value1: condition, operation: 'isNotEmpty' }] } } };
}

function buildErrorTrigger(): NodeBlueprint {
  return { type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, parameters: {} };
}

function buildSlack(channel: string, messageExpr: string): NodeBlueprint {
  return {
    type: 'n8n-nodes-base.slack',
    typeVersion: 2.1,
    parameters: { channel, text: messageExpr, authentication: 'oAuth2' },
  };
}

function buildGoogleSheets(operation: string, sheetId: string = '{{ $credentials.googleSheets.sheetId }}'): NodeBlueprint {
  return {
    type: 'n8n-nodes-base.googleSheets',
    typeVersion: 4.1,
    parameters: { operation, documentId: sheetId, sheetName: 'Sheet1' },
  };
}

// ============================================================================
// Workflow Assembler - Builds complete n8n workflow JSON from node list
// ============================================================================

interface NodeSpec {
  name: string;
  blueprint: NodeBlueprint;
  connectsTo?: string[];
  branch?: number; // y-offset for parallel branches
}

function assembleWorkflow(name: string, nodeSpecs: NodeSpec[]): N8nWorkflow {
  const nodes: N8nNode[] = [];
  const connections: Record<string, { main: Array<Array<{node: string; type: string; index: number}>> }> = {};

  nodeSpecs.forEach((spec, index) => {
    const yOffset = spec.branch || 0;
    nodes.push({
      id: String(index + 1),
      name: spec.name,
      type: spec.blueprint.type,
      typeVersion: spec.blueprint.typeVersion,
      position: [50 + (index * 220), 50 + yOffset],
      parameters: spec.blueprint.parameters as Record<string, unknown>,
    });

    if (spec.connectsTo && spec.connectsTo.length > 0) {
      connections[spec.name] = {
        main: [spec.connectsTo.map(target => ({ node: target, type: 'main', index: 0 }))],
      };
    }
  });

  return {
    name,
    nodes,
    connections,
    settings: { executionOrder: 'v1' },
    active: false,
  };
}

// ============================================================================
// AI Planning Prompt - Asks LLM to plan architecture, NOT generate JSON
// ============================================================================

function buildPlanningPrompt(
  request: ComposeRequest,
  similarWorkflows: SearchResult[]
): string {
  const templateContext = similarWorkflows.map(w =>
    `- "${w.name}" (${w.category}, ${w.complexity}): ${w.description}. Integrations: ${w.integrations.join(', ')}`
  ).join('\n');

  return `You are an expert n8n workflow architect. Plan a detailed workflow based on the user request.

USER REQUEST: ${request.request}

${request.requirements ? `REQUIREMENTS:
- Integrations: ${request.requirements.integrations?.join(', ') || 'any'}
- Trigger: ${request.requirements.trigger_type || 'any'}
- Complexity: ${request.requirements.complexity || 'intermediate'}
- Error handling: ${request.requirements.include_error_handling !== false}
` : ''}

SIMILAR WORKFLOWS FOR REFERENCE:
${templateContext || 'None found.'}

Respond with ONLY a JSON array of node specifications. Each node must have:
- "name": descriptive node name
- "type": one of: schedule_trigger, webhook_trigger, http_request, openai_chat, browser_scrape, image_generation, email_send, code, merge, if_condition, error_trigger, slack, google_sheets
- "purpose": what this node does
- "config": key configuration details (prompts, URLs, expressions)
- "connects_to": array of node names this connects to

IMPORTANT: Design 10-20 nodes for advanced workflows. Include:
- A trigger node
- Data collection nodes with real API calls
- AI processing nodes with detailed prompts
- Data transformation with Code nodes containing real JavaScript
- Error handling nodes
- Output/delivery nodes (email, storage)
- Use parallel branches where appropriate (e.g. images + text generated simultaneously)

Respond with ONLY the JSON array, no markdown, no explanation:`;
}

/**
 * Parse LLM planning response to extract node specifications
 */
function parsePlanningResponse(response: string): Array<{name: string; type: string; purpose: string; config: Record<string, string>; connects_to: string[]}> {
  let jsonStr = response.trim();

  // Remove markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1]!.trim();

  // Find JSON array
  const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrMatch) jsonStr = arrMatch[0];

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    log('warn', 'Failed to parse LLM planning response');
  }
  return [];
}

/**
 * Convert an LLM-planned node spec into a real NodeBlueprint
 */
function planNodeToBlueprint(plan: {name: string; type: string; purpose: string; config: Record<string, string>; connects_to: string[]}): NodeSpec {
  const cfg = plan.config || {};
  let blueprint: NodeBlueprint;

  switch (plan.type) {
    case 'schedule_trigger':
      blueprint = buildScheduleTrigger(cfg.cron || '0 8 * * *', cfg.timezone || 'UTC');
      break;
    case 'webhook_trigger':
      blueprint = buildWebhookTrigger(cfg.path || '/webhook', cfg.method || 'POST');
      break;
    case 'openai_chat':
      blueprint = buildOpenAiChat(
        cfg.system_prompt || 'You are a helpful assistant.',
        cfg.user_prompt || plan.purpose,
        parseFloat(cfg.temperature || '0.3'),
        parseInt(cfg.max_tokens || '2000', 10)
      );
      break;
    case 'browser_scrape':
      blueprint = buildBrowserScrape(cfg.url || '=https://www.google.com/search?q={{ $json.term }}');
      break;
    case 'image_generation':
      blueprint = buildImageGeneration(cfg.prompt || `=Create a professional diagram for: {{ $json.term }}`, parseInt(cfg.count || '4', 10));
      break;
    case 'email_send':
      blueprint = buildEmailSend(cfg.to || 'user@example.com', cfg.subject || '={{ $json.subject }}', cfg.body || '={{ $json.html }}', cfg.html !== 'false');
      break;
    case 'code':
      blueprint = buildCode(cfg.code || cfg.jsCode || `// ${plan.purpose}\nreturn $input.all();`);
      break;
    case 'merge':
      blueprint = buildMerge(cfg.mode || 'combine');
      break;
    case 'if_condition':
      blueprint = buildIfNode(cfg.condition || '={{ $json.data }}');
      break;
    case 'error_trigger':
      blueprint = buildErrorTrigger();
      break;
    case 'slack':
      blueprint = buildSlack(cfg.channel || '#general', cfg.message || '={{ $json.text }}');
      break;
    case 'google_sheets':
      blueprint = buildGoogleSheets(cfg.operation || 'append');
      break;
    case 'http_request':
      blueprint = buildHttpRequest(
        cfg.method || 'GET',
        cfg.url || 'https://api.example.com',
        cfg.headers ? JSON.parse(cfg.headers) : [],
        cfg.body ? JSON.parse(cfg.body) : []
      );
      break;
    default:
      blueprint = buildCode(`// ${plan.purpose}\nreturn $input.all();`);
  }

  return {
    name: plan.name,
    blueprint,
    connectsTo: plan.connects_to || [],
    branch: plan.type === 'error_trigger' ? 200 : (plan.type === 'image_generation' ? 200 : 0),
  };
}

/**
 * Build an intelligent fallback workflow based on request analysis
 */
function buildIntelligentFallback(request: ComposeRequest): N8nWorkflow {
  const req = request.request.toLowerCase();
  const specs: NodeSpec[] = [];

  // Determine trigger
  const isScheduled = req.includes('daily') || req.includes('schedule') || req.includes('every day') || req.includes('cron') || request.requirements?.trigger_type === 'schedule';
  if (isScheduled) {
    specs.push({ name: 'Daily Schedule Trigger', blueprint: buildScheduleTrigger('0 8 * * *'), connectsTo: [] });
  } else {
    specs.push({ name: 'Webhook Trigger', blueprint: buildWebhookTrigger('/webhook'), connectsTo: [] });
  }

  // Detect intent keywords
  const wantsSearch = req.includes('search') || req.includes('browse') || req.includes('google') || req.includes('scrape') || req.includes('internet') || req.includes('web');
  const wantsAI = req.includes('analyz') || req.includes('classif') || req.includes('categoriz') || req.includes('ai') || req.includes('agent');
  const wantsValidation = req.includes('validat') || req.includes('source') || req.includes('credib') || req.includes('fact') || req.includes('proven');
  const wantsReport = req.includes('report') || req.includes('article') || req.includes('writ') || req.includes('content');
  const wantsImages = req.includes('image') || req.includes('diagram') || req.includes('picture') || req.includes('visual');
  const wantsEmail = req.includes('email') || req.includes('mail') || req.includes('send');
  const wantsSlack = req.includes('slack') || req.includes('notification');
  const wantsSheets = req.includes('sheet') || req.includes('spreadsheet') || req.includes('google sheet');

  // Extract email address if present
  const emailMatch = req.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const emailTo = emailMatch ? emailMatch[0] : 'user@example.com';

  // Build nodes based on detected intent
  let prevNodeName = specs[0]!.name;

  if (wantsSearch || wantsAI) {
    // Topic generator
    const topicNode: NodeSpec = {
      name: 'Topic Generator Agent',
      blueprint: buildOpenAiChat(
        'You are a research topic expert.',
        `Generate 5 trending topics related to: ${request.request.slice(0, 100)}. Return as JSON array with fields: term, category, priority.`,
        0.7, 1000
      ),
      connectsTo: ['Parse Topics'],
    };
    specs[specs.length - 1]!.connectsTo = [topicNode.name];
    specs.push(topicNode);

    // Parser
    const parserNode: NodeSpec = {
      name: 'Parse Topics',
      blueprint: buildCode(`const response = $input.first().json;\nconst items = [];\ntry {\n  const content = response.choices ? response.choices[0].message.content : JSON.stringify(response);\n  const parsed = JSON.parse(content);\n  if (Array.isArray(parsed)) {\n    parsed.forEach((item, i) => {\n      items.push({\n        id: 'topic_' + (i+1),\n        term: typeof item === 'string' ? item : (item.term || item.name || String(item)),\n        category: item.category || 'general',\n        priority: item.priority || 'medium',\n        timestamp: new Date().toISOString()\n      });\n    });\n  }\n} catch(e) {\n  items.push({ id: 'topic_1', term: '${request.request.slice(0, 60)}', category: 'general', priority: 'high', timestamp: new Date().toISOString() });\n}\nreturn items.map(item => ({ json: item }));`),
      connectsTo: [],
    };
    specs.push(parserNode);
    prevNodeName = parserNode.name;
  }

  if (wantsSearch) {
    const searchNode: NodeSpec = {
      name: 'Browser Search Agent',
      blueprint: buildBrowserScrape('=https://www.google.com/search?q={{ $json.term }}+technical+documentation+2024'),
      connectsTo: [],
    };
    specs[specs.length - 1]!.connectsTo = [searchNode.name];
    specs.push(searchNode);
    prevNodeName = searchNode.name;
  }

  if (wantsAI) {
    const analysisNode: NodeSpec = {
      name: 'Content Analysis Agent',
      blueprint: buildOpenAiChat(
        'You are a technical content analyst. Always respond with structured JSON.',
        `Analyze and categorize this content. Provide: 1) Category 2) Complexity level 3) Key insights (5 points) 4) Technical questions raised 5) Relevance score 1-10. Content: {{ $json }}`,
        0.3, 2000
      ),
      connectsTo: [],
    };
    specs[specs.length - 1]!.connectsTo = [analysisNode.name];
    specs.push(analysisNode);
    prevNodeName = analysisNode.name;
  }

  if (wantsValidation) {
    const validationNode: NodeSpec = {
      name: 'Source Validation Agent',
      blueprint: buildOpenAiChat(
        'You are a fact-checking and source validation expert. Always respond with structured JSON.',
        `Validate credibility of this analysis: {{ $json.choices[0].message.content }}. Check: 1) Source credibility (1-10) 2) Fact-check results 3) Bias detection 4) Freshness 5) Cross-reference verification. Return JSON report.`,
        0.2, 1500
      ),
      connectsTo: [],
    };
    specs[specs.length - 1]!.connectsTo = [validationNode.name];
    specs.push(validationNode);
    prevNodeName = validationNode.name;
  }

  // Orchestration hub if we have parallel branches coming
  if (wantsReport && wantsImages) {
    const hubNode: NodeSpec = {
      name: 'Orchestration Hub',
      blueprint: buildMerge('combine'),
      connectsTo: ['Report Generation Agent', 'Image Generation Agent'],
    };
    specs[specs.length - 1]!.connectsTo = [hubNode.name];
    specs.push(hubNode);
  }

  if (wantsReport) {
    const reportNode: NodeSpec = {
      name: 'Report Generation Agent',
      blueprint: buildOpenAiChat(
        'You are an expert technical writer. Write comprehensive, professional reports.',
        `Write a comprehensive report (2000+ words) based on this research: {{ JSON.stringify($input.all()) }}. Include: 1) Executive summary 2) Technical deep dive 3) Practical applications 4) Future implications 5) Sources cited. Format in markdown. Include 4 image placeholders: [IMAGE_1] through [IMAGE_4].`,
        0.4, 4000
      ),
      connectsTo: [],
    };
    if (!(wantsReport && wantsImages)) {
      specs[specs.length - 1]!.connectsTo = [reportNode.name];
    }
    specs.push(reportNode);

    // Enhancement sub-agent
    const enhanceNode: NodeSpec = {
      name: 'Content Enhancement Agent',
      blueprint: buildOpenAiChat(
        'You are a content enhancement specialist.',
        `Enhance this report: {{ $json.choices[0].message.content }}. Add: 1) SEO meta description 2) Social media summary 3) Call-to-action 4) Improved formatting. Return enhanced markdown.`,
        0.3, 3000
      ),
      connectsTo: [],
    };
    reportNode.connectsTo = [enhanceNode.name];
    specs.push(enhanceNode);
    prevNodeName = enhanceNode.name;
  }

  if (wantsImages) {
    const imageNode: NodeSpec = {
      name: 'Image Generation Agent',
      blueprint: buildImageGeneration('=Create a professional technical diagram for: {{ $json.term || $json.choices[0].message.content.substring(0,100) }}. Modern, clean, professional illustration.', 4),
      connectsTo: [],
      branch: 200,
    };
    if (!(wantsReport && wantsImages)) {
      specs[specs.length - 1]!.connectsTo = [imageNode.name];
    }
    specs.push(imageNode);
  }

  // Final assembly if we had parallel branches
  if (wantsReport && wantsImages) {
    const assemblyNode: NodeSpec = {
      name: 'Final Assembly',
      blueprint: buildMerge('combine'),
      connectsTo: [],
    };
    // Connect enhancement and images to assembly
    const enhanceIdx = specs.findIndex(s => s.name === 'Content Enhancement Agent');
    const imageIdx = specs.findIndex(s => s.name === 'Image Generation Agent');
    if (enhanceIdx >= 0) specs[enhanceIdx]!.connectsTo = [assemblyNode.name];
    if (imageIdx >= 0) specs[imageIdx]!.connectsTo = [assemblyNode.name];
    specs.push(assemblyNode);
    prevNodeName = assemblyNode.name;
  }

  // Email formatter + sender
  if (wantsEmail || wantsReport) {
    const formatterNode: NodeSpec = {
      name: 'HTML Email Formatter',
      blueprint: buildCode(`const data = $input.all();\nconst report = data.find(i => i.json.choices)?.json.choices[0].message.content || '';\nconst images = data.find(i => i.json.data)?.json.data || [];\nconst today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });\nconst html = '<html><head><style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;border-radius:12px;text-align:center}.content{padding:20px;line-height:1.6}.img-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:20px 0}.footer{background:#f8f9fa;padding:20px;border-radius:8px;text-align:center;color:#6c757d}</style></head><body><div class="header"><h1>Technical Research Report</h1><p>' + today + '</p></div><div class="content">' + report.replace(/\\n/g,'<br>') + '<div class="img-grid">' + images.map((img,i) => '<div><img src="' + img.url + '" style="width:100%;border-radius:8px"><p>Figure ' + (i+1) + '</p></div>').join('') + '</div></div><div class="footer"><p>Generated by Multi-Agent Research System</p></div></body></html>';\nreturn [{ json: { html, subject: 'Technical Research Report - ' + today, text: report, images } }];`),
      connectsTo: [],
    };
    specs[specs.length - 1]!.connectsTo = [formatterNode.name];
    specs.push(formatterNode);

    const emailNode: NodeSpec = {
      name: 'Send Email Report',
      blueprint: buildEmailSend(emailTo, '={{ $json.subject }}', '={{ $json.html }}', true),
      connectsTo: [],
    };
    formatterNode.connectsTo = [emailNode.name];
    specs.push(emailNode);
    prevNodeName = emailNode.name;
  }

  if (wantsSlack) {
    const slackNode: NodeSpec = {
      name: 'Send Slack Notification',
      blueprint: buildSlack('#general', '={{ $json.text || $json.subject || "Workflow completed" }}'),
      connectsTo: [],
    };
    specs[specs.length - 1]!.connectsTo = [slackNode.name];
    specs.push(slackNode);
  }

  if (wantsSheets) {
    const sheetsNode: NodeSpec = {
      name: 'Save to Google Sheets',
      blueprint: buildGoogleSheets('append'),
      connectsTo: [],
    };
    specs[specs.length - 1]!.connectsTo = [sheetsNode.name];
    specs.push(sheetsNode);
  }

  // Error handling
  if (request.requirements?.include_error_handling !== false) {
    const errorTrigger: NodeSpec = {
      name: 'Error Handler',
      blueprint: buildErrorTrigger(),
      connectsTo: ['Error Notification'],
      branch: 300,
    };
    const errorEmail: NodeSpec = {
      name: 'Error Notification',
      blueprint: buildEmailSend(emailTo, '=Workflow Error Alert', '=Error in workflow: {{ $json.errorMessage }}\nNode: {{ $json.nodeName }}\nTime: {{ $json.timestamp }}', false),
      connectsTo: [],
      branch: 300,
    };
    specs.push(errorTrigger, errorEmail);
  }

  return assembleWorkflow(`Advanced ${request.request.slice(0, 80)}`, specs);
}

/**
 * Compose a workflow using AI + semantic search
 * Hybrid approach: LLM plans architecture, code builds detailed JSON
 */
export async function composeWorkflow(env: Env, request: ComposeRequest): Promise<ComposeResponse> {
  log('info', 'Composing workflow', { request: request.request });

  // Step 1: Find similar workflows via semantic search
  let searchResults = { results: [] as SearchResult[], total_results: 0, query: request.request, processing_time_ms: 0 };
  try {
    searchResults = await searchWorkflows(env, {
      query: request.request,
      filters: {
        complexity: request.requirements?.complexity ? [request.requirements.complexity] : undefined,
        integrations: request.requirements?.integrations,
        limit: 5,
      },
    });
  } catch (searchError) {
    log('warn', 'Search failed, proceeding without templates', {
      error: searchError instanceof Error ? searchError.message : String(searchError),
    });
  }

  // Step 2: Build planning prompt with context
  const prompt = buildPlanningPrompt(request, searchResults.results);

  // Step 3: Ask LLM to plan the workflow architecture
  let workflow: N8nWorkflow;
  let generationStrategy = 'ai_planned';

  try {
    const aiResponse = await (env.AI as any).run('@cf/qwen/qwq-32b', {
      messages: [
        { role: 'system', content: 'You are an expert n8n workflow architect. Respond ONLY with a JSON array of node specifications. No thinking, no explanation, no markdown — pure JSON array only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0.4,
    }) as { response: string };

    const plan = parsePlanningResponse(aiResponse.response || '');

    if (plan.length >= 3) {
      // Successfully got a plan from LLM — build real workflow from it
      const nodeSpecs = plan.map(p => planNodeToBlueprint(p));
      workflow = assembleWorkflow(`${request.request.slice(0, 80)}`, nodeSpecs);
      generationStrategy = searchResults.results.length > 0 ? 'ai_planned_with_context' : 'ai_planned';
      log('info', 'AI planning succeeded', { nodes: plan.length });
    } else {
      // LLM plan was too small or empty — use intelligent fallback
      log('warn', 'AI plan too small, using intelligent fallback', { plan_size: plan.length });
      workflow = buildIntelligentFallback(request);
      generationStrategy = 'intelligent_fallback';
    }
  } catch (error) {
    log('warn', 'AI planning failed, using intelligent fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
    workflow = buildIntelligentFallback(request);
    generationStrategy = 'intelligent_fallback';
  }

  // Step 4: Cache result in KV
  const cacheKey = `compose:${simpleHash(request.request)}`;
  try {
    await env.CACHE.put(cacheKey, JSON.stringify(workflow), { expirationTtl: 3600 });
  } catch {
    // KV cache is best-effort
  }

  return {
    workflow,
    metadata: {
      matched_templates: searchResults.results.map(r => r.id),
      confidence_score: searchResults.results.length > 0
        ? searchResults.results[0]!.similarity_score
        : 0.7,
      generation_strategy: generationStrategy,
      integrations_used: request.requirements?.integrations || [],
      estimated_complexity: request.requirements?.complexity || 'intermediate',
    },
  };
}

/**
 * Refine an existing workflow with modifications
 */
export async function refineWorkflow(env: Env, request: RefineRequest): Promise<RefineResponse> {
  log('info', 'Refining workflow', { workflow_id: request.workflow_id });

  // Fetch the workflow
  const row = await env.DB.prepare('SELECT * FROM workflows WHERE id = ?')
    .bind(request.workflow_id).first<{ workflow_json: string; name: string }>();

  let workflow: N8nWorkflow;
  if (row) {
    workflow = JSON.parse(row.workflow_json) as N8nWorkflow;
  } else {
    // Try to get from KV cache
    const cached = await env.CACHE.get(`compose:${request.workflow_id}`);
    if (cached) {
      workflow = JSON.parse(cached) as N8nWorkflow;
    } else {
      throw new Error(`Workflow ${request.workflow_id} not found`);
    }
  }

  const changesSummary: string[] = [];

  // Apply modifications
  for (const mod of request.modifications) {
    switch (mod.type) {
      case 'add_node': {
        const newNode: N8nNode = {
          id: `node_${workflow.nodes.length}`,
          name: mod.node_name || mod.node_type || 'New Node',
          type: mod.node_type ? `n8n-nodes-base.${mod.node_type}` : 'n8n-nodes-base.noOp',
          typeVersion: 1,
          position: [250 + (workflow.nodes.length * 200), 300],
          parameters: (mod.config || {}) as Record<string, unknown>,
        };

        if (mod.position !== undefined && mod.position < workflow.nodes.length) {
          workflow.nodes.splice(mod.position, 0, newNode);
        } else {
          workflow.nodes.push(newNode);
        }

        // Connect to previous node if exists
        if (workflow.nodes.length >= 2) {
          const prevNode = workflow.nodes[workflow.nodes.length - 2];
          if (prevNode) {
            workflow.connections[prevNode.name] = {
              main: [[{ node: newNode.name, type: 'main', index: 0 }]]
            };
          }
        }

        changesSummary.push(`Added node "${newNode.name}" (${newNode.type})`);
        break;
      }
      case 'remove_node': {
        const nodeName = mod.node_name || '';
        const nodeIndex = workflow.nodes.findIndex(n => n.name === nodeName);
        if (nodeIndex >= 0) {
          workflow.nodes.splice(nodeIndex, 1);
          delete workflow.connections[nodeName];
          // Remove references in other connections
          for (const [key, conn] of Object.entries(workflow.connections)) {
            if (conn.main) {
              conn.main = conn.main.map(outputs =>
                outputs.filter(o => o.node !== nodeName)
              );
            }
          }
          changesSummary.push(`Removed node "${nodeName}"`);
        }
        break;
      }
      case 'modify_node': {
        const targetNode = workflow.nodes.find(n => n.name === mod.node_name);
        if (targetNode && mod.config) {
          targetNode.parameters = { ...targetNode.parameters, ...(mod.config as Record<string, unknown>) };
          changesSummary.push(`Modified node "${mod.node_name}" parameters`);
        }
        break;
      }
      case 'update_config': {
        if (mod.config) {
          workflow.settings = { ...workflow.settings, ...(mod.config as Record<string, unknown>) };
          changesSummary.push('Updated workflow settings');
        }
        break;
      }
    }
  }

  // Validate the modified workflow
  const validationResult = validateWorkflow({ workflow, checks: ['structure', 'nodes', 'connections'] });

  return {
    workflow,
    changes_summary: changesSummary,
    validation_results: validationResult,
  };
}

/**
 * Validate a workflow JSON structure
 */
export function validateWorkflow(request: ValidateRequest): ValidationResult {
  const { workflow, checks = ['structure', 'nodes', 'connections'] } = request;
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const suggestions: string[] = [];

  // Structure check
  if (checks.includes('structure')) {
    if (!workflow.name) {
      issues.push({ type: 'structure', message: 'Workflow name is missing', severity: 'error' });
    }
    if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      issues.push({ type: 'structure', message: 'Workflow has no nodes', severity: 'error' });
    }
    if (!workflow.connections || typeof workflow.connections !== 'object') {
      issues.push({ type: 'structure', message: 'Connections object is missing', severity: 'error' });
    }
    if (!workflow.settings) {
      warnings.push({ type: 'structure', message: 'Workflow settings are missing', severity: 'warning' });
      suggestions.push('Add settings with executionOrder: "v1"');
    }
  }

  // Nodes check
  if (checks.includes('nodes') && Array.isArray(workflow.nodes)) {
    const nodeNames = new Set<string>();
    let hasTrigger = false;

    for (const node of workflow.nodes) {
      if (!node.name) {
        issues.push({ type: 'node', message: 'Node is missing a name', severity: 'error', node: node.id });
      }
      if (!node.type) {
        issues.push({ type: 'node', message: `Node "${node.name}" is missing a type`, severity: 'error', node: node.name });
      }
      if (!Array.isArray(node.position) || node.position.length !== 2) {
        warnings.push({ type: 'node', message: `Node "${node.name}" has invalid position`, severity: 'warning', node: node.name });
      }
      if (node.name && nodeNames.has(node.name)) {
        issues.push({ type: 'node', message: `Duplicate node name: "${node.name}"`, severity: 'error', node: node.name });
      }
      if (node.name) nodeNames.add(node.name);

      if (node.type?.toLowerCase().includes('trigger') || node.type?.toLowerCase().includes('webhook')) {
        hasTrigger = true;
      }
    }

    if (!hasTrigger) {
      warnings.push({ type: 'node', message: 'No trigger node found', severity: 'warning' });
      suggestions.push('Add a trigger node (webhook, schedule, or manual trigger) to start the workflow');
    }
  }

  // Connections check
  if (checks.includes('connections') && workflow.connections && Array.isArray(workflow.nodes)) {
    const nodeNames = new Set(workflow.nodes.map(n => n.name));

    for (const [sourceName, connection] of Object.entries(workflow.connections)) {
      if (!nodeNames.has(sourceName)) {
        issues.push({
          type: 'connection',
          message: `Connection source "${sourceName}" does not match any node`,
          severity: 'error',
          node: sourceName,
        });
      }
      if (connection.main) {
        for (const outputs of connection.main) {
          for (const output of outputs) {
            if (!nodeNames.has(output.node)) {
              issues.push({
                type: 'connection',
                message: `Connection target "${output.node}" does not match any node`,
                severity: 'error',
                node: output.node,
              });
            }
          }
        }
      }
    }

    // Check for orphan nodes (no connections in or out)
    for (const node of workflow.nodes) {
      const isSource = node.name in workflow.connections;
      const isTarget = Object.values(workflow.connections).some(conn =>
        conn.main?.some(outputs => outputs.some(o => o.node === node.name))
      );
      const isTrigger = node.type?.toLowerCase().includes('trigger');

      if (!isSource && !isTarget && !isTrigger && workflow.nodes.length > 1) {
        warnings.push({
          type: 'connection',
          message: `Node "${node.name}" is not connected to any other node`,
          severity: 'warning',
          node: node.name,
        });
      }
    }
  }

  // Best practices
  if (checks.includes('best_practices')) {
    if (workflow.nodes && workflow.nodes.length > 20) {
      suggestions.push('Consider breaking this workflow into sub-workflows for maintainability');
    }
    const hasErrorHandling = workflow.nodes?.some(n =>
      n.type?.includes('errorTrigger') || n.type?.includes('stopAndError')
    );
    if (!hasErrorHandling && workflow.nodes && workflow.nodes.length > 3) {
      suggestions.push('Consider adding error handling nodes for robustness');
    }
  }

  return {
    is_valid: issues.length === 0,
    issues,
    warnings,
    suggestions,
  };
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
