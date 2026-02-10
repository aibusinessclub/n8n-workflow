/**
 * Data Factory - Data Cleaner
 * 
 * Cleans and validates workflow templates:
 * - Removes sensitive information (credentials, API keys)
 * - Normalizes node names and types
 * - Validates JSON structure
 * - Extracts core workflow structure
 */

import type { Env, N8nWorkflow, WorkflowRow } from '../models/types';
import { log } from '../utils/logger';
import { stripCredentials } from '../utils/helpers';

export interface CleaningResult {
  workflow_id: string;
  cleaned: boolean;
  issues: string[];
  validity_score: number;
  completeness_score: number;
}

/**
 * Validate that a workflow JSON has the required structure
 */
function validateWorkflowStructure(workflow: N8nWorkflow): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!workflow.name || typeof workflow.name !== 'string') {
    issues.push('Missing or invalid workflow name');
  }
  if (!Array.isArray(workflow.nodes)) {
    issues.push('Missing or invalid nodes array');
  } else if (workflow.nodes.length === 0) {
    issues.push('Workflow has no nodes');
  }
  if (!workflow.connections || typeof workflow.connections !== 'object') {
    issues.push('Missing or invalid connections object');
  }

  // Check each node
  if (Array.isArray(workflow.nodes)) {
    for (const node of workflow.nodes) {
      if (!node.name) issues.push(`Node missing name`);
      if (!node.type) issues.push(`Node "${node.name}" missing type`);
      if (!Array.isArray(node.position) || node.position.length !== 2) {
        issues.push(`Node "${node.name}" has invalid position`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Calculate completeness score for a workflow (0.0 - 1.0)
 */
function calculateCompletenessScore(workflow: N8nWorkflow, description: string): number {
  let score = 0;
  const checks = 6;

  if (workflow.name && workflow.name.length > 3) score++;
  if (description && description.length > 10) score++;
  if (workflow.nodes && workflow.nodes.length > 0) score++;
  if (workflow.connections && Object.keys(workflow.connections).length > 0) score++;
  // Has at least one trigger
  if (workflow.nodes?.some(n => n.type.toLowerCase().includes('trigger') || n.type.toLowerCase().includes('webhook'))) score++;
  // Has settings
  if (workflow.settings) score++;

  return Math.round((score / checks) * 100) / 100;
}

/**
 * Calculate validity score for a workflow (0.0 - 1.0)
 */
function calculateValidityScore(workflow: N8nWorkflow): number {
  const { issues } = validateWorkflowStructure(workflow);
  const maxIssues = 5;
  const score = Math.max(0, 1 - (issues.length / maxIssues));
  return Math.round(score * 100) / 100;
}

/**
 * Normalize node types to standard n8n format
 */
function normalizeNodeType(type: string): string {
  if (!type.startsWith('n8n-nodes-base.')) {
    return `n8n-nodes-base.${type.toLowerCase().replace(/\s+/g, '')}`;
  }
  return type;
}

/**
 * Clean a single workflow
 */
function cleanWorkflow(workflow: N8nWorkflow): N8nWorkflow {
  // Strip credentials
  const cleaned = stripCredentials(workflow);

  // Normalize node types
  cleaned.nodes = cleaned.nodes.map(node => ({
    ...node,
    type: normalizeNodeType(node.type),
    parameters: node.parameters || {},
  }));

  return cleaned;
}

/**
 * Clean all pending workflows in the database (batched D1 operations)
 */
export async function cleanAllWorkflows(env: Env, limit: number = 500): Promise<{ cleaned: number; failed: number; remaining: number; results: CleaningResult[] }> {
  const rows = await env.DB.prepare(
    "SELECT * FROM workflows WHERE processing_status = 'collecting' LIMIT ?"
  ).bind(limit).all<WorkflowRow>();

  const countResult = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM workflows WHERE processing_status = 'collecting'"
  ).first<{ cnt: number }>();
  const totalPending = countResult?.cnt || 0;

  const results: CleaningResult[] = [];
  const updateStmts: D1PreparedStatement[] = [];
  const logStmts: D1PreparedStatement[] = [];

  for (const row of rows.results) {
    try {
      const workflow = JSON.parse(row.workflow_json) as N8nWorkflow;
      const cleanedWorkflow = cleanWorkflow(workflow);
      const { issues } = validateWorkflowStructure(cleanedWorkflow);
      const validityScore = calculateValidityScore(cleanedWorkflow);
      const completenessScore = calculateCompletenessScore(cleanedWorkflow, row.description || '');

      updateStmts.push(
        env.DB.prepare(`
          UPDATE workflows SET workflow_json = ?, validity_score = ?, completeness_score = ?,
          processing_status = 'cleaning', updated_at = datetime('now') WHERE id = ?
        `).bind(JSON.stringify(cleanedWorkflow), validityScore, completenessScore, row.id)
      );

      logStmts.push(
        env.DB.prepare("INSERT INTO processing_log (workflow_id, stage, status, metadata) VALUES (?, 'clean', 'success', ?)")
          .bind(row.id, JSON.stringify({ issues, validity_score: validityScore, completeness_score: completenessScore }))
      );

      results.push({ workflow_id: row.id, cleaned: true, issues, validity_score: validityScore, completeness_score: completenessScore });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logStmts.push(
        env.DB.prepare("INSERT INTO processing_log (workflow_id, stage, status, error_message) VALUES (?, 'clean', 'failed', ?)")
          .bind(row.id, errorMsg)
      );
      results.push({ workflow_id: row.id, cleaned: false, issues: [errorMsg], validity_score: 0, completeness_score: 0 });
    }
  }

  // Execute all updates in sub-batches of 100 (D1 limit)
  for (let i = 0; i < updateStmts.length; i += 100) {
    await env.DB.batch(updateStmts.slice(i, i + 100));
  }
  for (let i = 0; i < logStmts.length; i += 100) {
    await env.DB.batch(logStmts.slice(i, i + 100));
  }

  const cleaned = results.filter(r => r.cleaned).length;
  const failed = results.filter(r => !r.cleaned).length;
  const remaining = Math.max(0, totalPending - cleaned);
  log('info', 'Cleaning complete (batched)', { cleaned, failed, remaining });
  return { cleaned, failed, remaining, results };
}
