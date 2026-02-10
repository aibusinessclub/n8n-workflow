/**
 * n8n Workflow MCP Server - Main Entry Point
 * 
 * Cloudflare Worker implementing an MCP-compatible HTTP API that provides:
 * - compose_workflow: Generate n8n workflows from natural language
 * - search_workflows: Semantic search over workflow templates
 * - refine_workflow: Modify existing workflows
 * - validate_workflow: Validate workflow JSON structure
 * - run_pipeline: Trigger the Data Factory pipeline (admin)
 * - pipeline_status: Check Data Factory pipeline status (admin)
 */

import type { Env, ComposeRequest, SearchQuery, RefineRequest, ValidateRequest, N8nWorkflow, McpToolResult } from './models/types';
import { log, setLogLevel } from './utils/logger';
import { runFullPipeline, runSingleStage, getPipelineStatus } from './data-factory/pipeline';
import { searchWorkflows, getCategories } from './search/engine';
import { composeWorkflow, refineWorkflow, validateWorkflow } from './composer/generator';
import { ENHANCED_TOOL_DEFINITIONS, handleEnhancedMcpTool } from './mcp/enhanced-tools';
import { getExpandedTemplates } from './data-factory/expanded-templates';

// ============================================================================
// Tool Definitions (MCP schema)
// ============================================================================

const TOOL_DEFINITIONS = [
  {
    name: "compose_workflow",
    description: "Generate a complete n8n workflow JSON from a user's automation request. Uses semantic search to find similar templates and AI to compose a new workflow.",
    inputSchema: {
      type: "object" as const,
      properties: {
        request: { type: "string", description: "User's automation requirement description" },
        requirements: {
          type: "object",
          properties: {
            integrations: { type: "array", items: { type: "string" }, description: "Required services/integrations (e.g. 'Slack', 'Google Sheets')" },
            trigger_type: { type: "string", enum: ["schedule", "webhook", "event", "manual"], description: "Type of trigger needed" },
            complexity: { type: "string", enum: ["beginner", "intermediate", "advanced"], description: "Preferred complexity level" },
            include_error_handling: { type: "boolean", description: "Include error handling nodes" },
          },
        },
      },
      required: ["request"],
    },
  },
  {
    name: "search_workflows",
    description: "Search the semantic workflow database for similar workflows. Uses vector embeddings and keyword matching to find the best results.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Natural language search query" },
        filters: {
          type: "object",
          properties: {
            category: { type: "string", description: "Filter by category (e.g. 'Marketing Automation')" },
            complexity: { type: "array", items: { type: "string" }, description: "Complexity levels to include" },
            integrations: { type: "array", items: { type: "string" }, description: "Required integrations" },
            limit: { type: "number", description: "Max results (default 5)" },
          },
        },
      },
      required: ["query"],
    },
  },
  {
    name: "refine_workflow",
    description: "Refine and improve an existing workflow by adding, removing, or modifying nodes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workflow_id: { type: "string", description: "ID of the workflow to refine" },
        modifications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["add_node", "remove_node", "modify_node", "update_config"], description: "Modification type" },
              node_type: { type: "string", description: "Node type for add_node" },
              node_name: { type: "string", description: "Node name for modify/remove" },
              position: { type: "number", description: "Insert position" },
              config: { type: "object", description: "Node configuration" },
            },
          },
          description: "Modifications to apply",
        },
      },
      required: ["workflow_id", "modifications"],
    },
  },
  {
    name: "validate_workflow",
    description: "Validate an n8n workflow JSON for correctness, node compatibility, and best practices.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workflow: { type: "object", description: "n8n workflow JSON" },
        checks: {
          type: "array",
          items: { type: "string", enum: ["structure", "nodes", "connections", "credentials", "best_practices"] },
          description: "Checks to perform (default: structure, nodes, connections)",
        },
      },
      required: ["workflow"],
    },
  },
  {
    name: "run_pipeline",
    description: "Run the Data Factory pipeline to collect, clean, classify, and embed workflow templates. Admin tool.",
    inputSchema: { type: "object" as const, properties: {}, required: [] as string[] },
  },
  {
    name: "pipeline_status",
    description: "Get the current status of the Data Factory pipeline. Admin tool.",
    inputSchema: { type: "object" as const, properties: {}, required: [] as string[] },
  },
];

// ============================================================================
// MCP JSON-RPC Protocol Handler
// ============================================================================

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function jsonRpcSuccess(id: string | number | null | undefined, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function jsonRpcError(id: string | number | null | undefined, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message, data } };
}

/**
 * Execute an MCP tool call
 */
async function executeTool(env: Env, toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
  switch (toolName) {
    case 'compose_workflow': {
      const request: ComposeRequest = {
        request: args.request as string,
        requirements: args.requirements as ComposeRequest['requirements'],
      };
      const result = await composeWorkflow(env, request);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    case 'search_workflows': {
      const query: SearchQuery = {
        query: args.query as string,
        filters: args.filters as SearchQuery['filters'],
      };
      const result = await searchWorkflows(env, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    case 'refine_workflow': {
      const request: RefineRequest = {
        workflow_id: args.workflow_id as string,
        modifications: args.modifications as RefineRequest['modifications'],
      };
      const result = await refineWorkflow(env, request);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    case 'validate_workflow': {
      const request: ValidateRequest = {
        workflow: args.workflow as N8nWorkflow,
        checks: args.checks as ValidateRequest['checks'],
      };
      const result = validateWorkflow(request);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    case 'run_pipeline': {
      const result = await runFullPipeline(env);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    case 'pipeline_status': {
      const status = await getPipelineStatus(env);
      const categories = await getCategories(env);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ workflow_status: status, categories }, null, 2),
        }],
      };
    }

    default:
      // Try enhanced tools handler
      try {
        const result = await handleEnhancedMcpTool(env, toolName, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        log(`Enhanced tool ${toolName} failed:`, error);
        return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
      }
  }
}

/**
 * Handle MCP JSON-RPC requests
 */
async function handleMcpRequest(env: Env, rpcRequest: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { method, params, id } = rpcRequest;

  switch (method) {
    case 'initialize':
      return jsonRpcSuccess(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'n8n-workflow-composer', version: '1.0.0' },
      });

    case 'tools/list':
      return jsonRpcSuccess(id, { tools: [...TOOL_DEFINITIONS, ...ENHANCED_TOOL_DEFINITIONS] });

    case 'tools/call': {
      const toolName = params?.name as string;
      const toolArgs = (params?.arguments || {}) as Record<string, unknown>;

      if (!toolName) {
        return jsonRpcError(id, -32602, 'Missing tool name');
      }

      const toolDef = [...TOOL_DEFINITIONS, ...ENHANCED_TOOL_DEFINITIONS].find(t => t.name === toolName);
      if (!toolDef) {
        return jsonRpcError(id, -32602, `Unknown tool: ${toolName}`);
      }

      try {
        let result;
        // Check if it's an enhanced tool
        if (ENHANCED_TOOL_DEFINITIONS.some(t => t.name === toolName)) {
          result = await handleEnhancedMcpTool(env, toolName, toolArgs);
        } else {
          result = await executeTool(env, toolName, toolArgs);
        }
        return jsonRpcSuccess(id, result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log('error', `Tool execution failed: ${toolName}`, { error: errorMsg });
        return jsonRpcSuccess(id, {
          content: [{ type: 'text', text: `Error: ${errorMsg}` }],
          isError: true,
        });
      }
    }

    case 'notifications/initialized':
    case 'notifications/cancelled':
      // Notifications don't need responses
      return jsonRpcSuccess(id, {});

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

// ============================================================================
// HTTP Request Handler
// ============================================================================

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

/**
 * Handle REST API endpoints (non-MCP direct access)
 */
async function handleRestApi(env: Env, request: Request, path: string): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const body = await request.json() as Record<string, unknown>;

  switch (path) {
    case '/api/compose': {
      const result = await composeWorkflow(env, body as unknown as ComposeRequest);
      return jsonResponse(result);
    }
    case '/api/search': {
      const result = await searchWorkflows(env, body as unknown as SearchQuery);
      return jsonResponse(result);
    }
    case '/api/refine': {
      const result = await refineWorkflow(env, body as unknown as RefineRequest);
      return jsonResponse(result);
    }
    case '/api/validate': {
      const result = validateWorkflow(body as unknown as ValidateRequest);
      return jsonResponse(result);
    }
    case '/api/pipeline/run': {
      const result = await runFullPipeline(env);
      return jsonResponse(result);
    }
    case '/api/pipeline/status': {
      const status = await getPipelineStatus(env);
      const categories = await getCategories(env);
      return jsonResponse({ workflow_status: status, categories });
    }
    default: {
      // Individual pipeline stage: /api/pipeline/stage/{collect|clean|classify|embed}
      const stageMatch = path.match(/^\/api\/pipeline\/stage\/(\w+)$/);
      if (stageMatch) {
        // Use already-parsed body from line 293 (request body is consumed once)
        const params = {
          offset: Number(body?.offset) || 0,
          limit: Number(body?.limit) || undefined,
        };
        const result = await runSingleStage(env, stageMatch[1]!, params);
        return jsonResponse(result);
      }
      return jsonResponse({ error: 'Not found' }, 404);
    }
  }
}

// ============================================================================
// Cloudflare Worker Export
// ============================================================================

export { TOOL_DEFINITIONS as toolDefinitions, executeTool };

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    setLogLevel((env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error');

    const url = new URL(request.url);
    const path = url.pathname;

    log('info', 'Incoming request', { method: request.method, path });

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      // Root: Server info
      if (path === '/' && request.method === 'GET') {
        return jsonResponse({
          name: 'n8n-workflow-composer',
          version: '1.0.0',
          status: 'ready',
          tools: TOOL_DEFINITIONS.map(t => ({ name: t.name, description: t.description })),
          endpoints: {
            mcp: 'POST /mcp (JSON-RPC 2.0 + Streamable HTTP)',
            api: 'POST /api/{compose,search,refine,validate,pipeline/run,pipeline/status}',
            sse: 'GET /sse (Legacy SSE transport for MCP 2024-11-05)',
          },
        });
      }

      // ================================================================
      // Streamable HTTP MCP endpoint (2025 spec) - handles POST and GET
      // ================================================================
      if (path === '/mcp') {
        if (request.method === 'POST') {
          const rpcRequest = await request.json() as JsonRpcRequest;

          // Handle notifications/responses (no response needed)
          if (!rpcRequest.id && (rpcRequest.method?.startsWith('notifications/') || !rpcRequest.method)) {
            await handleMcpRequest(env, rpcRequest);
            return new Response(null, { status: 202, headers: corsHeaders() });
          }

          const rpcResponse = await handleMcpRequest(env, rpcRequest);

          // If client accepts SSE, stream the response as SSE
          const accept = request.headers.get('Accept') || '';
          if (accept.includes('text/event-stream')) {
            const sseData = `event: message\ndata: ${JSON.stringify(rpcResponse)}\n\n`;
            return new Response(sseData, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                ...corsHeaders(),
              },
            });
          }

          // Otherwise return JSON
          return jsonResponse(rpcResponse);
        }

        if (request.method === 'GET') {
          // Streamable HTTP: GET opens SSE stream for server-initiated messages
          // Return a simple SSE response (no long-lived connection needed for stateless worker)
          const sseData = `event: open\ndata: {"status":"connected"}\n\n`;
          return new Response(sseData, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              ...corsHeaders(),
            },
          });
        }
      }

      // ================================================================
      // Legacy SSE endpoint (MCP 2024-11-05 HTTP+SSE transport)
      // ================================================================
      if (path === '/sse' && request.method === 'GET') {
        const baseUrl = url.origin;
        const sseData = `event: endpoint\ndata: ${baseUrl}/mcp\n\n`;
        return new Response(sseData, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            ...corsHeaders(),
          },
        });
      }

      // REST API endpoints
      if (path.startsWith('/api/')) {
        return await handleRestApi(env, request, path);
      }

      // Health check
      if (path === '/health') {
        const status = await getPipelineStatus(env);
        return jsonResponse({ status: 'healthy', pipeline: status });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log('error', 'Request failed', { error: errorMsg, path });
      return jsonResponse({ error: errorMsg }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
