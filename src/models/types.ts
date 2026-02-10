/**
 * Core type definitions for the n8n Workflow MCP Server
 */

// ============================================================================
// Environment & Configuration Types
// ============================================================================

export interface Env {
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  DB: D1Database;
  CACHE: KVNamespace;
  AI: Ai;
  VECTORIZE: VectorizeIndex;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// Workflow Types
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  source: string;
  source_id?: string;
  name: string;
  description: string;
  workflow_json: N8nWorkflow;
  node_count: number;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  tags: string[];
  completeness_score: number;
  validity_score: number;
  popularity_score: number;
  processing_status: ProcessingStatus;
  embedding_generated: boolean;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

export type ProcessingStatus = 'pending' | 'collecting' | 'cleaning' | 'classifying' | 'embedding' | 'ready' | 'failed';

export interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, N8nConnection>;
  settings?: Record<string, unknown>;
  staticData?: Record<string, unknown>;
  active?: boolean;
}

export interface N8nNode {
  id?: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  disabled?: boolean;
  notes?: string;
}

export interface N8nConnection {
  main?: Array<Array<{ node: string; type: string; index: number }>>;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
}

export interface SearchFilters {
  category?: string;
  complexity?: string[];
  integrations?: string[];
  tags?: string[];
  limit?: number;
}

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: string;
  tags: string[];
  similarity_score: number;
  integrations: string[];
  pattern: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total_results: number;
  query: string;
  processing_time_ms: number;
}

// ============================================================================
// Composition Types
// ============================================================================

export interface ComposeRequest {
  request: string;
  requirements?: {
    integrations?: string[];
    trigger_type?: 'schedule' | 'webhook' | 'event' | 'manual';
    complexity?: 'beginner' | 'intermediate' | 'advanced';
    include_error_handling?: boolean;
    include_testing?: boolean;
  };
}

export interface ComposeResponse {
  workflow: N8nWorkflow;
  metadata: {
    matched_templates: string[];
    confidence_score: number;
    generation_strategy: string;
    integrations_used: string[];
    estimated_complexity: string;
  };
}

// ============================================================================
// Refinement Types
// ============================================================================

export interface RefineRequest {
  workflow_id: string;
  modifications: Modification[];
}

export interface Modification {
  type: 'add_node' | 'remove_node' | 'modify_node' | 'change_logic' | 'update_config';
  node_type?: string;
  node_name?: string;
  position?: number;
  config?: Record<string, unknown>;
}

export interface RefineResponse {
  workflow: N8nWorkflow;
  changes_summary: string[];
  validation_results: ValidationResult;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidateRequest {
  workflow: N8nWorkflow;
  checks?: ValidationCheck[];
}

export type ValidationCheck = 'structure' | 'nodes' | 'connections' | 'credentials' | 'best_practices';

export interface ValidationResult {
  is_valid: boolean;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: string;
  message: string;
  node?: string;
  severity: 'error' | 'warning' | 'info';
}

// ============================================================================
// Database Row Types (what D1 returns)
// ============================================================================

export interface WorkflowRow {
  id: string;
  source: string;
  source_id: string | null;
  name: string;
  description: string | null;
  workflow_json: string;
  node_count: number;
  complexity: string | null;
  category: string | null;
  tags: string | null;
  completeness_score: number;
  validity_score: number;
  popularity_score: number;
  processing_status: string;
  embedding_generated: number;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface CategoryRow {
  id: number;
  name: string;
  description: string | null;
  parent_category_id: number | null;
  workflow_count: number;
  created_at: string;
}

export interface NodeRow {
  id: number;
  workflow_id: string;
  node_id: string;
  node_name: string | null;
  node_type: string;
  node_type_version: number | null;
  position_x: number;
  position_y: number;
  is_disabled: number;
  is_trigger: number;
  parameters: string | null;
  created_at: string;
}

// ============================================================================
// MCP Types
// ============================================================================

export interface McpToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}
