/**
 * Data Factory - Embeddings Generator
 * 
 * Generates vector embeddings for workflows using Cloudflare AI
 * and stores them in Vectorize for semantic search.
 */

import type { Env, WorkflowRow } from '../models/types';
import { log } from '../utils/logger';
import { generateEmbeddingText } from '../utils/helpers';

/**
 * Generate embedding for a single text using Cloudflare AI
 */
async function generateEmbedding(env: Env, text: string): Promise<number[]> {
  const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [text],
  }) as unknown as { data: number[][] };

  if (!response.data || response.data.length === 0) {
    throw new Error('No embedding returned from AI model');
  }

  return response.data[0] as number[];
}

/**
 * Generate embeddings for classified workflows and store in Vectorize.
 * Supports pagination: processes `limit` workflows starting at those with status 'classifying'.
 * Uses batch AI calls for efficiency (multiple texts per API call).
 */
export async function generateAllEmbeddings(
  env: Env,
  limit: number = 100
): Promise<{ embedded: number; failed: number; remaining: number }> {
  const rows = await env.DB.prepare(
    "SELECT * FROM workflows WHERE processing_status = 'classifying' LIMIT ?"
  ).bind(limit).all<WorkflowRow>();

  // Count remaining
  const countResult = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM workflows WHERE processing_status = 'classifying'"
  ).first<{ cnt: number }>();
  const totalClassifying = countResult?.cnt || 0;

  let embedded = 0;
  let failed = 0;

  // Process in batches — use batch AI call (multiple texts at once)
  const batchSize = 20;
  for (let i = 0; i < rows.results.length; i += batchSize) {
    const batch = rows.results.slice(i, i + batchSize);

    try {
      // Prepare all texts for batch embedding
      const textsAndMeta: { row: WorkflowRow; text: string; tags: string[] }[] = [];
      for (const row of batch) {
        const tags = row.tags ? JSON.parse(row.tags) as string[] : [];
        const text = generateEmbeddingText({
          name: row.name,
          description: row.description || '',
          category: row.category || '',
          tags,
        });
        textsAndMeta.push({ row, text, tags });
      }

      // Single AI call for entire batch
      const allTexts = textsAndMeta.map(t => t.text);
      const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: allTexts,
      }) as unknown as { data: number[][] };

      if (!response.data || response.data.length === 0) {
        throw new Error('No embeddings returned from AI model');
      }

      // Build vectors and DB statements
      const vectors: VectorizeVector[] = [];
      const metaStmts: D1PreparedStatement[] = [];
      const statusStmts: D1PreparedStatement[] = [];
      const logStmts: D1PreparedStatement[] = [];

      for (let j = 0; j < textsAndMeta.length; j++) {
        const { row, text, tags } = textsAndMeta[j]!;
        const values = response.data[j];
        if (!values) continue;

        const vectorId = `wf-${row.id}`;
        vectors.push({
          id: vectorId,
          values,
          metadata: {
            workflow_id: row.id,
            name: row.name,
            category: row.category || '',
            complexity: row.complexity || '',
            tags: tags.join(','),
          },
        });

        metaStmts.push(
          env.DB.prepare(`
            INSERT OR REPLACE INTO embeddings_metadata
            (workflow_id, vector_id, embedding_model, embedding_dimension, text_content)
            VALUES (?, ?, ?, ?, ?)
          `).bind(row.id, vectorId, '@cf/baai/bge-base-en-v1.5', 768, text)
        );

        statusStmts.push(
          env.DB.prepare(`
            UPDATE workflows SET processing_status = 'embedding',
            embedding_generated = 1, processed_at = datetime('now'), updated_at = datetime('now')
            WHERE id = ?
          `).bind(row.id)
        );

        logStmts.push(
          env.DB.prepare(
            "INSERT INTO processing_log (workflow_id, stage, status, metadata) VALUES (?, 'embed', 'success', ?)"
          ).bind(row.id, JSON.stringify({ vector_id: vectorId, dimensions: 768 }))
        );

        embedded++;
      }

      // Batch DB operations (sub-batch to respect D1 limits)
      if (metaStmts.length > 0) await env.DB.batch(metaStmts);
      if (statusStmts.length > 0) await env.DB.batch(statusStmts);
      if (logStmts.length > 0) await env.DB.batch(logStmts);

      // Batch upsert vectors into Vectorize
      if (vectors.length > 0) {
        await env.VECTORIZE.upsert(vectors);
        log('info', `Upserted ${vectors.length} vectors to Vectorize`);
      }
    } catch (error) {
      // Mark entire batch as failed
      for (const row of batch) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        try {
          await env.DB.prepare(
            "INSERT INTO processing_log (workflow_id, stage, status, error_message) VALUES (?, 'embed', 'failed', ?)"
          ).bind(row.id, errorMsg).run();
        } catch { /* ignore log errors */ }
      }
      log('error', 'Batch embedding failed', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Mark all successfully embedded workflows as ready
  await env.DB.prepare(`
    UPDATE workflows SET processing_status = 'ready' WHERE processing_status = 'embedding'
  `).run();

  const remaining = Math.max(0, totalClassifying - embedded);
  log('info', 'Embedding generation complete', { embedded, failed, remaining });
  return { embedded, failed, remaining };
}
