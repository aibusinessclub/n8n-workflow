/**
 * n8n Workflow Embeddings Generator
 * 
 * Generates vector embeddings for n8n workflow templates.
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Types
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

export interface EmbeddingOptions {
  model?: string;
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface EmbeddingResult {
  success: boolean;
  embeddings: WorkflowEmbedding[];
  failed: { workflow_id: string; error: string }[];
  total_processed: number;
  total_time_ms: number;
}

// ============================================================================
// Embedding Generator Class
// ============================================================================

export class EmbeddingGenerator {
  private ai: any;
  private vectorize: any;
  private options: Required<EmbeddingOptions>;

  constructor(ai: any, vectorize: any, options: EmbeddingOptions = {}) {
    this.ai = ai;
    this.vectorize = vectorize;
    this.options = {
      model: options.model || '@cf/baai/bge-base-en-v1.5',
      batchSize: options.batchSize || 10,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
    };
  }

  async generateEmbedding(workflow: {
    id: string;
    name: string;
    description: string;
    nodes: any[];
    structure: any;
    metadata: any;
    classification?: { category: string; complexity: string };
  }): Promise<WorkflowEmbedding> {
    const text = this.prepareWorkflowText(workflow);
    const embedding = await this.generateVector(text);

    const metadata: EmbeddingMetadata = {
      name: workflow.name,
      description: workflow.description,
      category: workflow.classification?.category || 'Unknown',
      complexity: workflow.classification?.complexity || 'beginner',
      tags: workflow.metadata?.tags || [],
      integrations: workflow.metadata?.integrations || [],
      trigger: workflow.structure?.trigger_type || 'unknown',
      node_count: workflow.nodes.length,
      source: workflow.metadata?.source || 'unknown',
      created_at: new Date().toISOString(),
    };

    return {
      id: `emb_${randomUUID()}`,
      workflow_id: workflow.id,
      vector: embedding,
      metadata,
      model: this.options.model,
      dimensions: embedding.length,
      created_at: new Date().toISOString(),
    };
  }

  async generateEmbeddings(workflows: {
    id: string;
    name: string;
    description: string;
    nodes: any[];
    structure: any;
    metadata: any;
    classification?: { category: string; complexity: string };
  }[]): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const embeddings: WorkflowEmbedding[] = [];
    const failed: { workflow_id: string; error: string }[] = [];

    for (let i = 0; i < workflows.length; i += this.options.batchSize) {
      const batch = workflows.slice(i, i + this.options.batchSize);

      for (const workflow of batch) {
        try {
          const embedding = await this.generateEmbeddingWithRetry(workflow);
          embeddings.push(embedding);
        } catch (error) {
          failed.push({
            workflow_id: workflow.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const totalTime = Date.now() - startTime;

    return {
      success: failed.length === 0,
      embeddings,
      failed,
      total_processed: workflows.length,
      total_time_ms: totalTime,
    };
  }

  async storeEmbeddings(embeddings: WorkflowEmbedding[]): Promise<void> {
    if (embeddings.length === 0) return;

    const vectors = embeddings.map(emb => ({
      id: emb.workflow_id,
      vector: emb.vector,
      metadata: {
        ...emb.metadata,
        embedding_id: emb.id,
        model: emb.model,
        dimensions: emb.dimensions,
      },
    }));

    await this.vectorize.upsert(vectors);
  }

  async generateAndStore(workflows: {
    id: string;
    name: string;
    description: string;
    nodes: any[];
    structure: any;
    metadata: any;
    classification?: { category: string; complexity: string };
  }[]): Promise<EmbeddingResult> {
    const result = await this.generateEmbeddings(workflows);

    if (result.embeddings.length > 0) {
      await this.storeEmbeddings(result.embeddings);
    }

    return result;
  }

  private async generateEmbeddingWithRetry(workflow: any): Promise<WorkflowEmbedding> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await this.generateEmbedding(workflow);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Attempt ${attempt} failed for workflow ${workflow.id}:`, lastError);

        if (attempt < this.options.maxRetries) {
          await this.delay(this.options.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  private async generateVector(text: string): Promise<number[]> {
    const response = await this.ai.run(this.options.model, { text });

    if (!response || !response.data) {
      throw new Error('Failed to generate embedding');
    }

    return response.data;
  }

  private prepareWorkflowText(workflow: {
    name: string;
    description: string;
    nodes: any[];
    structure: any;
    metadata: any;
    classification?: { category: string };
  }): string {
    const parts: string[] = [];

    parts.push(`Workflow: ${workflow.name}`);
    if (workflow.description) {
      parts.push(`Description: ${workflow.description}`);
    }

    if (workflow.classification?.category) {
      parts.push(`Category: ${workflow.classification.category}`);
    }

    const integrations = workflow.metadata?.integrations || [];
    if (integrations.length > 0) {
      parts.push(`Integrations: ${integrations.join(', ')}`);
    }

    const triggers = workflow.metadata?.triggers || [];
    if (triggers.length > 0) {
      parts.push(`Triggers: ${triggers.join(', ')}`);
    }

    const nodeTypes = workflow.nodes.map((n: any) => n.type);
    if (nodeTypes.length > 0) {
      parts.push(`Nodes: ${nodeTypes.join(', ')}`);
    }

    const tags = workflow.metadata?.tags || [];
    if (tags.length > 0) {
      parts.push(`Tags: ${tags.join(', ')}`);
    }

    if (workflow.structure) {
      parts.push(`Trigger Type: ${workflow.structure.trigger_type}`);
      parts.push(`Complexity: ${workflow.structure.complexity_score}`);
    }

    parts.push('This n8n workflow handles automation tasks with various integrations and triggers.');

    return parts.join('\n');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Search Functions
// ============================================================================

export interface SearchQuery {
  text: string;
  filters?: {
    category?: string;
    complexity?: string[];
    integrations?: string[];
    trigger?: string;
  };
  limit?: number;
  minScore?: number;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: EmbeddingMetadata;
}

export async function searchSimilarWorkflows(
  vectorize: any,
  query: SearchQuery
): Promise<SearchResult[]> {
  const filter: Record<string, any> = {};

  if (query.filters) {
    if (query.filters.category) {
      filter.category = query.filters.category;
    }
    if (query.filters.complexity && query.filters.complexity.length > 0) {
      filter.complexity = { $in: query.filters.complexity };
    }
    if (query.filters.integrations && query.filters.integrations.length > 0) {
      filter['metadata.integrations'] = { $in: query.filters.integrations };
    }
    if (query.filters.trigger) {
      filter.trigger = query.filters.trigger;
    }
  }

  const results = await vectorize.query(query.text, {
    limit: query.limit || 10,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    returnMetadata: true,
  });

  const minScore = query.minScore || 0;
  return results.matches
    .filter((match: any) => match.score >= minScore)
    .map((match: any) => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata,
    }));
}

export function createEmbeddingGenerator(
  ai: any,
  vectorize: any,
  options?: EmbeddingOptions
): EmbeddingGenerator {
  return new EmbeddingGenerator(ai, vectorize, options);
}
