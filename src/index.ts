/**
 * n8n Workflow MCP Server - Main Entry Point
 * 
 * This Cloudflare Worker provides MCP tools for AI agents to:
 * - Compose n8n workflows from user requests
 * - Search semantic workflow database
 * - Refine and validate workflows
 * 
 * Built with @modelcontextprotocol/sdk for MCP server support.
 */

import { Server } from "@modelcontextprotocol/sdk/server";

/**
 * Environment configuration interface
 */
interface Env {
  ENVIRONMENT: string;
  LOG_LEVEL: string;
}

/**
 * Log levels type
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logging utility function
 */
function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const env = (globalThis as { env?: Env }).env;
  const logLevel = (env?.LOG_LEVEL || 'info') as LogLevel;
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  
  if (levels.indexOf(level) >= levels.indexOf(logLevel)) {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : '');
  }
}

/**
 * Tool definitions
 */
const toolDefinitions = [
  {
    name: "compose_workflow",
    description: "Generate a complete n8n workflow JSON from a user's automation request. Uses semantic search and AI to compose workflows based on proven templates.",
    inputSchema: {
      type: "object",
      properties: {
        request: {
          type: "string",
          description: "User's automation requirement description"
        },
        requirements: {
          type: "object",
          properties: {
            integrations: {
              type: "array",
              items: { type: "string" },
              description: "Required services/integrations"
            },
            trigger_type: {
              type: "string",
              enum: ["schedule", "webhook", "event", "manual"],
              description: "Type of trigger needed"
            },
            complexity: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced"],
              description: "Preferred complexity level"
            },
            include_error_handling: {
              type: "boolean",
              default: true,
              description: "Include error handling nodes"
            },
            include_testing: {
              type: "boolean",
              default: false,
              description: "Include testing/debug nodes"
            }
          }
        }
      },
      required: ["request"]
    }
  },
  {
    name: "search_workflows",
    description: "Search the semantic workflow database for similar workflows. Uses vector embeddings to find workflows matching the query.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query describing the workflow"
        },
        filters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Filter by workflow category"
            },
            complexity: {
              type: "array",
              items: { type: "string" },
              description: "Filter by complexity levels"
            },
            integrations: {
              type: "array",
              items: { type: "string" },
              description: "Filter by required integrations"
            },
            limit: {
              type: "number",
              default: 5,
              description: "Maximum number of results"
            }
          }
        }
      },
      required: ["query"]
    }
  },
  {
    name: "refine_workflow",
    description: "Refine and improve an existing workflow with modifications like adding nodes, changing logic, or updating configurations.",
    inputSchema: {
      type: "object",
      properties: {
        workflow_id: {
          type: "string",
          description: "ID of the workflow to refine"
        },
        modifications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["add_node", "remove_node", "modify_node", "change_logic", "update_config"],
                description: "Type of modification"
              },
              node_type: {
                type: "string",
                description: "Type of node to add/modify"
              },
              position: {
                type: "number",
                description: "Position in workflow"
              },
              config: {
                type: "object",
                description: "Node configuration"
              }
            }
          },
          description: "List of modifications to apply"
        }
      },
      required: ["workflow_id", "modifications"]
    }
  },
  {
    name: "validate_workflow",
    description: "Validate an n8n workflow JSON structure for correctness, node compatibility, and best practices.",
    inputSchema: {
      type: "object",
      properties: {
        workflow: {
          type: "object",
          description: "n8n workflow JSON object"
        },
        checks: {
          type: "array",
          items: {
            type: "string",
            enum: ["structure", "nodes", "connections", "credentials", "best_practices"]
          },
          default: ["structure", "nodes", "connections"],
          description: "Validation checks to perform"
        }
      },
      required: ["workflow"]
    }
  }
];

/**
 * Initialize the MCP Server with all tools
 */
function createMcpServer(): Server {
  const server = new Server({
    name: "n8n-workflow-composer",
    version: "1.0.0"
  });

  // TODO: Implement full MCP server with transport
  // For now, this is a placeholder structure
  
  return server;
}

/**
 * Export server factory for testing
 */
export { createMcpServer, toolDefinitions };

/**
 * Export types for testing and module usage
 */
export type { Env, LogLevel };

/**
 * Default export for Cloudflare Worker
 */
export default {
  async fetch(request: Request, env: Env, _ctx: unknown): Promise<Response> {
    // Set environment for logging
    (globalThis as { env?: Env }).env = env;
    
    log('info', 'Incoming request', { method: request.method, url: request.url });
    
    // Create a new server instance for each request
    const server = createMcpServer();
    
    // Return a placeholder response since we're running in Cloudflare Workers
    // Full MCP transport implementation will be added in later phases
    
    return new Response(
      JSON.stringify({
        status: "ready",
        message: "n8n Workflow MCP Server is running",
        version: "1.0.0",
        tools: toolDefinitions.map(t => t.name),
        phase: "Phase 1: Project Setup Complete",
        nextSteps: [
          "Phase 2: Implement Data Factory pipeline",
          "Phase 3: Implement Semantic Search Engine",
          "Phase 4: Build AI Agent Workflow Composer",
          "Phase 5: Create MCP server integration"
        ]
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
} as { fetch(request: Request, env: Env, ctx: unknown): Promise<Response> };
