# VectorDB Schema - Semantic Search Configuration

## Overview

This document defines the VectorDB index configuration for storing and searching n8n workflow embeddings using Cloudflare Vectorize.

## Index Configuration

```json
{
  "name": "n8n-workflows",
  "dimensions": 768,
  "metric": "cosine",
  "description": "Semantic search index for n8n workflow templates"
}
```

## Index Settings

| Parameter | Value | Description |
|-----------|-------|-------------|
| `name` | `n8n-workflows` | Unique index name |
| `dimensions` | `768` | Embedding vector dimensions (BGE base model) |
| `metric` | `cosine` | Similarity metric for nearest neighbor search |
| `description` | Semantic search index for n8n workflow templates | Human-readable description |

## Vector Schema

### Workflow Embeddings

Each workflow is stored with a 768-dimensional vector representing its semantic meaning.

```typescript
interface WorkflowEmbedding {
  id: string;           // Unique workflow ID (matches D1)
  vector: number[];     // 768-dimensional embedding
  metadata: {
    name: string;        // Workflow name
    description: string; // Workflow description
    category: string;    // Classification category
    complexity: string; // beginner/intermediate/advanced/expert
    tags: string[];      // Associated tags
    integrations: string[]; // Used integrations
    trigger: string;     // Primary trigger type
    node_count: number;  // Number of nodes
    source: string;      // Data source (community/github/custom)
    created_at: string;  // ISO timestamp
  };
}
```

## Embedding Generation

### Model Configuration

| Setting | Value |
|---------|-------|
| Model | `@cf/baai/bge-base-en-v1.5` |
| Dimensions | 768 |
| Input Max Tokens | 512 |
| Output Dimensions | 768 |

### Input Processing

```typescript
async function generateWorkflowEmbedding(workflow: Workflow): Promise<number[]> {
  const textInput = `
    Workflow: ${workflow.name}
    Description: ${workflow.description}
    Category: ${workflow.category}
    Integrations: ${workflow.integrations.join(', ')}
    Triggers: ${workflow.triggers.join(', ')}
    Tags: ${workflow.tags.join(', ')}
    Complexity: ${workflow.complexity}
  `;
  
  const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: textInput
  });
  
  return response.data;
}
```

## Vector Operations

### Upsert Workflow Vector

```typescript
async function upsertWorkflowVector(
  workflowId: string,
  vector: number[],
  metadata: WorkflowEmbedding['metadata']
): Promise<void> {
  await env.VECTORIZE.upsert([
    {
      id: workflowId,
      vector: vector,
      metadata: metadata
    }
  ]);
}
```

### Search Similar Workflows

```typescript
async function searchSimilarWorkflows(
  query: string,
  options: {
    limit?: number;
    category?: string;
    complexity?: string[];
    minScore?: number;
  } = {}
): Promise<SearchResult[]> {
  // Generate query embedding
  const queryEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: query
  });
  
  // Build filter conditions
  const filter: Record<string, any> = {};
  if (options.category) {
    filter.category = options.category;
  }
  if (options.complexity) {
    filter.complexity = { $in: options.complexity };
  }
  
  // Execute search
  const results = await env.VECTORIZE.query(queryEmbedding, {
    limit: options.limit || 10,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    returnMetadata: true
  });
  
  return results.matches
    .filter(match => (options.minScore || 0) <= match.score)
    .map(match => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata
    }));
}
```

## Hybrid Search

Combine vector similarity with keyword matching for better results.

```typescript
async function hybridSearch(
  query: string,
  options: SearchOptions = {}
): Promise<HybridSearchResult[]> {
  // Vector search
  const vectorResults = await searchSimilarWorkflows(query, options);
  
  // Keyword search (from D1)
  const keywordResults = await keywordSearch(query, options);
  
  // Merge and re-rank
  const merged = mergeResults(vectorResults, keywordResults, {
    vectorWeight: 0.7,
    keywordWeight: 0.3
  });
  
  return merged;
}
```

## Index Management

### Create Index

```bash
# Using wrangler CLI
npx wrangler vectorize create n8n-workflows --dimensions=768 --metric=cosine
```

### List Indexes

```bash
npx wrangler vectorize list
```

### Delete Index

```bash
npx wrangler vectorize delete n8n-workflows
```

## Performance Optimization

### Indexing Strategy

1. **Batch Upserts**: Group multiple workflows into single upsert operations
2. **Incremental Updates**: Only re-index workflows that have changed
3. **Async Processing**: Use queues for large-scale embedding generation

### Query Optimization

1. **Result Caching**: Cache frequent query results in KV
2. **Filter Pushdown**: Apply metadata filters at VectorDB level
3. **Approximate Nearest Neighbor**: Use ANNS for faster searches with slight accuracy trade-off

## Cost Management

| Operation | Free Tier | Cost After |
|-----------|-----------|------------|
| Vector Queries | 1M/month | $0.04/1K queries |
| Vector Storage | 5M vectors | $0.025/1M vectors |
| Embedding Generation | Included in AI | $0.00004/1K tokens |

## Monitoring

### Key Metrics

- Query latency (p50, p95, p99)
- Search result quality (click-through rate)
- Index size and growth
- Embedding generation success rate

### Alerts

- Query latency > 1s
- Error rate > 1%
- Daily quota > 80%

## Security

### Access Control

- Worker environment bindings only
- No public VectorDB access
- Encrypted at rest

### Data Privacy

- No PII in metadata
- Credential-free workflow storage
- GDPR compliant

## Troubleshooting

### Common Issues

1. **No results found**: Check query embedding generation
2. **Poor relevance**: Adjust hybrid search weights
3. **Slow queries**: Enable result caching
4. **Index errors**: Verify index configuration

### Diagnostic Commands

```bash
# Check index status
npx wrangler vectorize info n8n-workflows

# List indexed vectors
npx wrangler vectorize list --index=n8n-workflows --limit=100

# Query test
npx wrangler vectorize query "test query" --index=n8n-workflows
```

## Migration Guide

### From v1 to v2

```typescript
// v1 schema
interface LegacyEmbedding {
  id: string;
  vector: number[];
  description: string;
}

// v2 schema
interface V2Embedding {
  id: string;
  vector: number[];
  metadata: {
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
  };
}

// Migration script
async function migrateToV2() {
  const v1Vectors = await env.VECTORIZE.queryAll();
  
  for (const v1 of v1Vectors) {
    const metadata = await fetchWorkflowMetadata(v1.id);
    await env.VECTORIZE.upsert([{
      id: v1.id,
      vector: v1.vector,
      metadata: {
        ...metadata,
        description: v1.description  // Move to metadata
      }
    }]);
  }
}
```

## Best Practices

1. **Index Naming**: Use descriptive names with environment prefix
2. **Metadata**: Include all searchable fields in metadata
3. **Dimensions**: Use 768 for BGE base, 1024 for BGE large
4. **Metric**: Cosine for semantic similarity, Euclidean for geometric
5. **Batch Size**: Upsert in batches of 100 for optimal performance
6. **Caching**: Cache results for frequently searched queries
7. **Monitoring**: Track query performance and error rates
8. **Testing**: Regular relevance testing with known queries
