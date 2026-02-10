/**
 * Workflow Data Models
 * 
 * Core data models for n8n workflow templates and processing.
 */

// ============================================================================
// Workflow Core Types
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  description: string;
  workflow_json: string;
  nodes_json: string;
  connections_json?: string;
  created_at?: string;
  updated_at?: string;
  source: 'community' | 'github' | 'local' | 'custom';
  is_valid?: boolean;
  is_duplicate?: boolean;
  version?: string;
  author?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: NodeCredentials;
  disabled?: boolean;
  notes?: string;
  continueOnFail?: boolean;
}

export interface NodeCredentials {
  id: string;
  name: string;
  type: string;
}

export interface WorkflowConnection {
  node: string;
  type: string;
  color?: string;
  label?: string;
}

// ============================================================================
// Processed Workflow Types
// ============================================================================

export interface CleanedWorkflow {
  id: string;
  original_id: string;
  name: string;
  description: string;
  nodes: NormalizedNode[];
  connections: NormalizedConnection[];
  structure: WorkflowStructure;
  metadata: CleanedMetadata;
  validation: ValidationResult;
  cleaned_at: string;
}

export interface NormalizedNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  disabled?: boolean;
  notes?: string;
  continueOnFail?: boolean;
}

export interface NormalizedConnection {
  node: string;
  type: string;
  color?: string;
  label?: string;
}

export interface WorkflowStructure {
  trigger_type: string;
  trigger_name?: string;
  node_count: number;
  connection_count: number;
  has_error_handler: boolean;
  has_conditional: boolean;
  has_loop: boolean;
  complexity_score: number;
}

export interface CleanedMetadata {
  integrations: string[];
  triggers: string[];
  patterns: string[];
  categories: string[];
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// Classification Types
// ============================================================================

export interface WorkflowClassification {
  id: string;
  workflow_id: string;
  category: string;
  subcategory?: string;
  complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidence: number;
  classification_criteria: ClassificationCriteria;
  classified_at: string;
}

export interface ClassificationCriteria {
  matched_keywords: string[];
  matched_nodes: string[];
  matched_patterns: string[];
  integration_types: string[];
  trigger_types: string[];
  structure_score: number;
  node_diversity_score: number;
}

// ============================================================================
// Tag Types
// ============================================================================

export interface WorkflowTag {
  id: string;
  workflow_id: string;
  tag_type: 'integration' | 'pattern' | 'complexity' | 'use_case' | 'trigger' | 'industry';
  tag_value: string;
  weight: number;
  source: 'automatic' | 'manual' | 'ai';
  confidence: number;
  created_at: string;
}

// ============================================================================
// Embedding Types
// ============================================================================

export interface WorkflowEmbedding {
  id: string;
  workflow_id: string;
  vector: number[];
  metadata: EmbeddingMetadata;
  model: string;
  dimensions: number;
  created_at: string;
}

export interface EmbeddingMetadata {
  name: string;
  description: string;
  category: string;
  complexity: string;
  tags: string[];
  integrations: string[];
  trigger: string;
  node_count: number;
  source: string;
  created_at: string;
}

// ============================================================================
// Search Types
// ============================================================================

export interface WorkflowSearchResult {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: string;
  similarity_score: number;
  tags: string[];
  integrations: string[];
  trigger: string;
  excerpt?: string;
}

export interface SearchFilters {
  category?: string;
  complexity?: string[];
  integrations?: string[];
  triggers?: string[];
  tags?: string[];
  min_similarity?: number;
  limit?: number;
}

// ============================================================================
// Composition Types
// ============================================================================

export interface WorkflowCompositionRequest {
  request: string;
  requirements?: CompositionRequirements;
  options?: CompositionOptions;
}

export interface CompositionRequirements {
  integrations?: string[];
  trigger?: string;
  complexity?: 'beginner' | 'intermediate' | 'advanced';
  output_format?: 'n8n_json' | 'n8n_yaml' | 'detailed';
}

export interface CompositionOptions {
  include_error_handling?: boolean;
  include_testing?: boolean;
  include_documentation?: boolean;
  max_nodes?: number;
}

export interface WorkflowComposition {
  workflow: WorkflowTemplate;
  metadata: CompositionMetadata;
}

export interface WorkflowTemplate {
  name: string;
  nodes: WorkflowNode[];
  connections: Record<string, Array<{ node: string; type: string; index?: number }>>;
  settings?: WorkflowSettings;
}

export interface WorkflowSettings {
  saveManualExecutions?: boolean;
  callerPolicy?: 'any' | 'none' | 'workflowsFromSameOwner';
  executionOrder?: 'v1' | 'v2';
}

export interface CompositionMetadata {
  matched_templates: string[];
  confidence_score: number;
  generation_strategy: 'semantic_composition' | 'template_based' | 'ai_generated';
  suggested_integrations: string[];
  warnings?: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

export type ComplexityLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type TagType = 'integration' | 'pattern' | 'complexity' | 'use_case' | 'trigger' | 'industry';

export type WorkflowSource = 'community' | 'github' | 'local' | 'custom';

export type ValidationStatus = 'valid' | 'invalid' | 'warning';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface WorkflowListResponse {
  workflows: WorkflowSearchResult[];
  total: number;
  page: number;
  limit: number;
}

export interface RecommendationResponse {
  primary_recommendation: WorkflowSearchResult;
  alternatives: WorkflowSearchResult[];
  adaptation_needed: AdaptationGuide;
}

export interface AdaptationGuide {
  keep: string[];
  modify: string[];
  add: string[];
  remove: string[];
}

// ============================================================================
// Database Types (D1/SQLite compatible)
// ============================================================================

export interface DbWorkflow {
  id: string;
  source: string;
  source_id: string | null;
  name: string;
  description: string | null;
  workflow_json: string;
  node_count: number | null;
  complexity: string | null;
  category: string | null;
  tags: string | null;
  version: number;
  original_created_at: string | null;
  last_modified_at: string | null;
  completeness_score: number;
  validity_score: number;
  documentation_score: number;
  popularity_score: number;
  processing_status: string;
  processed_at: string | null;
  embedding_generated: number;
  created_at: string;
  updated_at: string;
}

export interface DbWorkflowNode {
  id: number;
  workflow_id: string;
  node_id: string;
  node_name: string | null;
  node_type: string;
  node_type_version: number | null;
  position_x: number | null;
  position_y: number | null;
  is_disabled: number;
  is_trigger: number;
  parameters: string | null;
  credentials: string | null;
  created_at: string;
}

export interface DbCategory {
  id: number;
  name: string;
  description: string | null;
  parent_category_id: number | null;
  workflow_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbTag {
  id: number;
  name: string;
  usage_count: number;
  created_at: string;
}

export interface DbProcessingLog {
  id: number;
  workflow_id: string;
  stage: string;
  status: string;
  processing_time_ms: number | null;
  error_message: string | null;
  metadata: string | null;
  created_at: string;
}

export interface DbEmbedding {
  id: number;
  workflow_id: string;
  vector_id: string;
  embedding_model: string | null;
  embedding_dimension: number | null;
  text_content: string | null;
  generated_at: string;
}
