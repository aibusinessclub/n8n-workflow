/**
 * n8n Workflow Data Factory
 * 
 * Unified export for all data factory modules.
 */

// Re-export all modules
export * from './collector';
export * from './cleaner';
export * from './classifier';
export * from './tagger';
export * from './embeddings';

// ============================================================================
// Main Data Factory Pipeline
// ============================================================================

import type { WorkflowTemplate, CleanedWorkflow, WorkflowClassification, WorkflowTag, WorkflowEmbedding } from '../models/workflow';

export interface DataFactoryConfig {
  ai: any;
  vectorize: any;
  db?: any;
  collectorOptions?: {
    maxWorkflows?: number;
    source?: 'community' | 'github' | 'local' | 'all';
  };
  cleanerOptions?: {};
  classifierOptions?: {};
  taggerOptions?: {
    minConfidence?: number;
    maxTags?: number;
  };
  embeddingOptions?: {
    model?: string;
    batchSize?: number;
    maxRetries?: number;
  };
}

export interface PipelineResult {
  collected: WorkflowTemplate[];
  cleaned: CleanedWorkflow[];
  classified: WorkflowClassification[];
  tagged: WorkflowTag[];
  embedded: WorkflowEmbedding[];
  errors: { workflow_id: string; error: string }[];
}

export interface ProcessedWorkflow {
  cleaned: CleanedWorkflow;
  classification: {
    category: string;
    subcategory?: string;
    complexity: string;
    confidence: number;
  };
  tags: WorkflowTag[];
  embedding: WorkflowEmbedding;
}
