/**
 * Semantic Search Engine
 * 
 * Performs semantic search over workflow templates using:
 * 1. Vector similarity via Cloudflare Vectorize
 * 2. Keyword matching via D1 database
 * 3. Combined ranking with configurable weights
 */

import type { Env, SearchQuery, SearchFilters, SearchResult, SearchResponse, WorkflowRow } from '../models/types';
import { log } from '../utils/logger';
import { textSimilarity } from '../utils/helpers';

// Scoring weights
const WEIGHTS = {
  vector_similarity: 0.50,
  keyword_match: 0.25,
  integration_match: 0.15,
  complexity_match: 0.10,
};

/**
 * Generate embedding for search query using Cloudflare AI
 */
async function getQueryEmbedding(env: Env, query: string): Promise<number[]> {
  const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [query],
  }) as unknown as { data: number[][] };

  if (!response.data || response.data.length === 0) {
    throw new Error('Failed to generate query embedding');
  }

  return response.data[0] as number[];
}

/**
 * Search using Vectorize for semantic similarity
 */
async function vectorSearch(
  env: Env,
  queryEmbedding: number[],
  limit: number,
  filters?: { category?: string }
): Promise<Array<{ id: string; score: number }>> {
  const vectorQuery: VectorizeQueryOptions = {
    topK: limit,
    returnValues: false,
    returnMetadata: 'all',
  };

  // Add metadata filter if category specified
  if (filters?.category) {
    vectorQuery.filter = { category: filters.category };
  }

  const results = await env.VECTORIZE.query(queryEmbedding, vectorQuery);

  return results.matches.map(match => ({
    id: (match.metadata?.workflow_id as string) || match.id.replace('wf-', ''),
    score: match.score,
  }));
}

/**
 * Search using D1 database for keyword matching
 */
async function keywordSearch(
  env: Env,
  query: string,
  filters?: SearchFilters,
  limit?: number
): Promise<WorkflowRow[]> {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const maxResults = limit || 10;

  let sql = "SELECT * FROM workflows WHERE processing_status = 'ready'";
  const params: string[] = [];

  // Category filter
  if (filters?.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }

  // Complexity filter
  if (filters?.complexity && filters.complexity.length > 0) {
    const placeholders = filters.complexity.map(() => '?').join(',');
    sql += ` AND complexity IN (${placeholders})`;
    params.push(...filters.complexity);
  }

  // Keyword search across name, description, and tags
  if (searchTerms.length > 0) {
    const termConditions = searchTerms.map(() =>
      "(LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ?)"
    ).join(' OR ');
    sql += ` AND (${termConditions})`;
    for (const term of searchTerms) {
      params.push(`%${term}%`, `%${term}%`, `%${term}%`);
    }
  }

  sql += ` LIMIT ?`;
  params.push(String(maxResults));

  const stmt = env.DB.prepare(sql);
  const bound = stmt.bind(...params);
  const results = await bound.all<WorkflowRow>();

  return results.results;
}

/**
 * Calculate integration match score
 */
function integrationMatchScore(workflowTags: string[], queryIntegrations: string[]): number {
  if (queryIntegrations.length === 0) return 0;
  const tagSet = new Set(workflowTags.map(t => t.toLowerCase()));
  let matches = 0;
  for (const integration of queryIntegrations) {
    if (tagSet.has(integration.toLowerCase()) ||
        workflowTags.some(t => t.toLowerCase().includes(integration.toLowerCase()))) {
      matches++;
    }
  }
  return matches / queryIntegrations.length;
}

/**
 * Calculate complexity match score
 */
function complexityMatchScore(workflowComplexity: string, preferredComplexity?: string[]): number {
  if (!preferredComplexity || preferredComplexity.length === 0) return 0.5;
  return preferredComplexity.includes(workflowComplexity) ? 1.0 : 0.2;
}

/**
 * Perform combined semantic + keyword search
 */
export async function searchWorkflows(env: Env, searchQuery: SearchQuery): Promise<SearchResponse> {
  const startTime = Date.now();
  const limit = searchQuery.filters?.limit || 10;

  log('info', 'Performing search', { query: searchQuery.query, filters: searchQuery.filters });

  // Run vector search and keyword search in parallel
  let vectorResults: Array<{ id: string; score: number }> = [];
  let keywordResults: WorkflowRow[] = [];

  try {
    const queryEmbedding = await getQueryEmbedding(env, searchQuery.query);
    [vectorResults, keywordResults] = await Promise.all([
      vectorSearch(env, queryEmbedding, limit * 2, { category: searchQuery.filters?.category }),
      keywordSearch(env, searchQuery.query, searchQuery.filters, limit * 2),
    ]);
  } catch (error) {
    log('warn', 'Vector search failed, falling back to keyword only', {
      error: error instanceof Error ? error.message : String(error),
    });
    keywordResults = await keywordSearch(env, searchQuery.query, searchQuery.filters, limit * 2);
  }

  // Build a map of vector scores
  const vectorScoreMap = new Map<string, number>();
  for (const vr of vectorResults) {
    vectorScoreMap.set(vr.id, vr.score);
  }

  // Merge all candidate IDs
  const allIds = new Set<string>([
    ...vectorResults.map(r => r.id),
    ...keywordResults.map(r => r.id),
  ]);

  // Fetch full data for all candidates
  const candidateMap = new Map<string, WorkflowRow>();
  for (const row of keywordResults) {
    candidateMap.set(row.id, row);
  }

  // Fetch any vector-only results from DB
  for (const id of allIds) {
    if (!candidateMap.has(id)) {
      const row = await env.DB.prepare(
        'SELECT * FROM workflows WHERE id = ?'
      ).bind(id).first<WorkflowRow>();
      if (row) candidateMap.set(id, row);
    }
  }

  // Score and rank all candidates
  const scoredResults: SearchResult[] = [];
  const queryIntegrations = searchQuery.filters?.integrations || [];

  for (const [id, row] of candidateMap) {
    const tags = row.tags ? JSON.parse(row.tags) as string[] : [];
    const vectorScore = vectorScoreMap.get(id) || 0;
    const keywordScore = textSimilarity(searchQuery.query, `${row.name} ${row.description}`);
    const intScore = integrationMatchScore(tags, queryIntegrations);
    const compScore = complexityMatchScore(
      row.complexity || 'intermediate',
      searchQuery.filters?.complexity
    );

    const combinedScore =
      (WEIGHTS.vector_similarity * vectorScore) +
      (WEIGHTS.keyword_match * keywordScore) +
      (WEIGHTS.integration_match * intScore) +
      (WEIGHTS.complexity_match * compScore);

    // Fetch integrations for this workflow
    const services = await env.DB.prepare(`
      SELECT s.service_name FROM integration_services s
      JOIN workflow_services ws ON s.id = ws.service_id
      WHERE ws.workflow_id = ?
    `).bind(id).all<{ service_name: string }>();

    scoredResults.push({
      id: row.id,
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      complexity: row.complexity || '',
      tags,
      similarity_score: Math.round(combinedScore * 1000) / 1000,
      integrations: services.results.map(s => s.service_name),
      pattern: '', // Will be extracted from workflow JSON
    });
  }

  // Sort by combined score descending
  scoredResults.sort((a, b) => b.similarity_score - a.similarity_score);

  // Limit results
  const finalResults = scoredResults.slice(0, limit);

  const processingTime = Date.now() - startTime;
  log('info', 'Search complete', {
    total_candidates: allIds.size,
    returned: finalResults.length,
    processing_time_ms: processingTime,
  });

  return {
    results: finalResults,
    total_results: finalResults.length,
    query: searchQuery.query,
    processing_time_ms: processingTime,
  };
}

/**
 * Get workflow by ID from database
 */
export async function getWorkflowById(env: Env, id: string): Promise<WorkflowRow | null> {
  return await env.DB.prepare('SELECT * FROM workflows WHERE id = ?').bind(id).first<WorkflowRow>();
}

/**
 * Get all categories with counts
 */
export async function getCategories(env: Env): Promise<Array<{ name: string; count: number }>> {
  const results = await env.DB.prepare(
    "SELECT category, COUNT(*) as count FROM workflows WHERE processing_status = 'ready' GROUP BY category ORDER BY count DESC"
  ).all<{ category: string; count: number }>();
  return results.results.map(r => ({ name: r.category, count: r.count }));
}
