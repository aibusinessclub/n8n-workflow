/**
 * Data Factory - Pipeline Orchestrator
 * 
 * Orchestrates the full data pipeline:
 * 1. Collect templates → 2. Clean data → 3. Classify → 4. Generate embeddings
 */

import type { Env } from '../models/types';
import { log } from '../utils/logger';
import { collectAndStoreTemplates } from './collector';
import { cleanAllWorkflows } from './cleaner';
import { classifyAllWorkflows } from './classifier';
import { generateAllEmbeddings } from './embeddings';

export interface PipelineResult {
  stage: string;
  success: boolean;
  details: Record<string, unknown>;
  duration_ms: number;
}

export interface FullPipelineResult {
  success: boolean;
  stages: PipelineResult[];
  total_duration_ms: number;
}

/**
 * Run a single pipeline stage with timing
 */
async function runStage<T>(
  name: string,
  fn: () => Promise<T>
): Promise<PipelineResult & { result?: T }> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    log('info', `Pipeline stage "${name}" completed`, { duration_ms: duration });
    return {
      stage: name,
      success: true,
      details: result as Record<string, unknown>,
      duration_ms: duration,
      result,
    };
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    log('error', `Pipeline stage "${name}" failed`, { error: errorMsg, duration_ms: duration });
    return {
      stage: name,
      success: false,
      details: { error: errorMsg },
      duration_ms: duration,
    };
  }
}

/**
 * Run the full data factory pipeline
 */
export async function runFullPipeline(env: Env): Promise<FullPipelineResult> {
  const totalStart = Date.now();
  const stages: PipelineResult[] = [];

  log('info', '=== Starting Data Factory Pipeline ===');

  // Stage 1: Collect templates
  const collectResult = await runStage('collect', () => collectAndStoreTemplates(env));
  stages.push(collectResult);
  if (!collectResult.success) {
    return { success: false, stages, total_duration_ms: Date.now() - totalStart };
  }

  // Stage 2: Clean workflows
  const cleanResult = await runStage('clean', () => cleanAllWorkflows(env));
  stages.push(cleanResult);
  if (!cleanResult.success) {
    return { success: false, stages, total_duration_ms: Date.now() - totalStart };
  }

  // Stage 3: Classify workflows
  const classifyResult = await runStage('classify', () => classifyAllWorkflows(env));
  stages.push(classifyResult);
  if (!classifyResult.success) {
    return { success: false, stages, total_duration_ms: Date.now() - totalStart };
  }

  // Stage 4: Generate embeddings
  const embedResult = await runStage('embed', () => generateAllEmbeddings(env));
  stages.push(embedResult);

  const totalDuration = Date.now() - totalStart;
  log('info', '=== Data Factory Pipeline Complete ===', { total_duration_ms: totalDuration });

  return {
    success: stages.every(s => s.success),
    stages,
    total_duration_ms: totalDuration,
  };
}

/**
 * Run a single named pipeline stage with optional pagination params.
 * For 'collect': offset/limit control which templates to process (default 500 per call).
 * For 'embed': limit controls how many to embed per call (default 100).
 */
export async function runSingleStage(
  env: Env,
  stageName: string,
  params: { offset?: number; limit?: number } = {}
): Promise<PipelineResult> {
  switch (stageName) {
    case 'collect':
      return runStage('collect', () => collectAndStoreTemplates(env, params.offset || 0, params.limit || 500));
    case 'clean':
      return runStage('clean', () => cleanAllWorkflows(env, params.limit || 500));
    case 'classify':
      return runStage('classify', () => classifyAllWorkflows(env, params.limit || 500));
    case 'embed':
      return runStage('embed', () => generateAllEmbeddings(env, params.limit || 100));
    default:
      return { stage: stageName, success: false, details: { error: `Unknown stage: ${stageName}` }, duration_ms: 0 };
  }
}

/**
 * Get pipeline status from the database
 */
export async function getPipelineStatus(env: Env): Promise<Record<string, number>> {
  const result = await env.DB.prepare(`
    SELECT processing_status, COUNT(*) as count 
    FROM workflows 
    GROUP BY processing_status
  `).all<{ processing_status: string; count: number }>();

  const status: Record<string, number> = {};
  for (const row of result.results) {
    status[row.processing_status] = row.count;
  }
  return status;
}
