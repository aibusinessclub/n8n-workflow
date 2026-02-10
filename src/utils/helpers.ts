/**
 * Helper utilities for the n8n Workflow MCP Server
 */

import type { WorkflowRow, WorkflowTemplate, N8nWorkflow } from '../models/types';

/**
 * Convert a D1 database row to a WorkflowTemplate object
 */
export function rowToTemplate(row: WorkflowRow): WorkflowTemplate {
  return {
    id: row.id,
    source: row.source,
    source_id: row.source_id ?? undefined,
    name: row.name,
    description: row.description ?? '',
    workflow_json: JSON.parse(row.workflow_json) as N8nWorkflow,
    node_count: row.node_count,
    complexity: row.complexity as WorkflowTemplate['complexity'],
    category: row.category ?? '',
    tags: row.tags ? JSON.parse(row.tags) as string[] : [],
    completeness_score: row.completeness_score,
    validity_score: row.validity_score,
    popularity_score: row.popularity_score,
    processing_status: row.processing_status as WorkflowTemplate['processing_status'],
    embedding_generated: row.embedding_generated === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
    processed_at: row.processed_at ?? undefined,
  };
}

/**
 * Generate a unique workflow ID
 */
export function generateWorkflowId(category: string, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const catSlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 15);
  const hash = simpleHash(name + category + Date.now().toString()).toString(36).slice(0, 6);
  return `${catSlug}-${slug}-${hash}`;
}

/**
 * Simple hash function for ID generation
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Extract integration names from workflow nodes
 */
export function extractIntegrations(workflow: N8nWorkflow): string[] {
  const integrations = new Set<string>();
  for (const node of workflow.nodes) {
    const type = node.type.toLowerCase();
    // Skip utility nodes
    if (['n8n-nodes-base.noOp', 'n8n-nodes-base.set', 'n8n-nodes-base.if',
         'n8n-nodes-base.switch', 'n8n-nodes-base.merge', 'n8n-nodes-base.code',
         'n8n-nodes-base.function', 'n8n-nodes-base.start'].includes(node.type)) {
      continue;
    }
    // Extract service name from type
    const match = type.match(/n8n-nodes-base\.(.+)/);
    if (match?.[1]) {
      integrations.add(match[1].replace(/trigger$/i, '').replace(/-/g, ' ').trim());
    }
  }
  return Array.from(integrations);
}

/**
 * Determine workflow complexity from node count and structure
 */
export function assessComplexity(workflow: N8nWorkflow): 'beginner' | 'intermediate' | 'advanced' {
  const nodeCount = workflow.nodes.length;
  const hasConditionals = workflow.nodes.some(n =>
    ['n8n-nodes-base.if', 'n8n-nodes-base.switch'].includes(n.type)
  );
  const hasLoops = workflow.nodes.some(n =>
    ['n8n-nodes-base.splitInBatches'].includes(n.type)
  );
  const hasErrorHandling = workflow.nodes.some(n =>
    n.type.includes('errorTrigger') || n.type.includes('stopAndError')
  );

  if (nodeCount <= 4 && !hasConditionals && !hasLoops) return 'beginner';
  if (nodeCount <= 8 || (hasConditionals && !hasLoops && !hasErrorHandling)) return 'intermediate';
  return 'advanced';
}

/**
 * Detect trigger types in a workflow
 */
export function detectTriggerTypes(workflow: N8nWorkflow): string[] {
  const triggers: string[] = [];
  for (const node of workflow.nodes) {
    if (node.type.toLowerCase().includes('trigger') || node.type.toLowerCase().includes('webhook')) {
      triggers.push(node.type);
    }
  }
  return triggers;
}

/**
 * Generate a text description for embedding from workflow data
 */
export function generateEmbeddingText(template: {
  name: string;
  description: string;
  category: string;
  tags: string[];
  nodes?: Array<{ type: string; name: string }>;
}): string {
  const parts = [
    template.name,
    template.description,
    `Category: ${template.category}`,
    `Tags: ${template.tags.join(', ')}`,
  ];
  if (template.nodes) {
    parts.push(`Nodes: ${template.nodes.map(n => n.name || n.type).join(', ')}`);
  }
  return parts.join('. ');
}

/**
 * Strip credentials from workflow JSON for security
 */
export function stripCredentials(workflow: N8nWorkflow): N8nWorkflow {
  return {
    ...workflow,
    nodes: workflow.nodes.map(node => ({
      ...node,
      credentials: undefined,
    })),
  };
}

/**
 * Calculate a simple text similarity score (0-1) using Jaccard similarity
 */
export function textSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
