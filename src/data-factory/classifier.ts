/**
 * Data Factory - Classification Engine
 * 
 * Classifies workflows into categories and assigns semantic tags.
 * Uses node composition, trigger types, and integration patterns.
 */

import type { Env, WorkflowRow, N8nWorkflow } from '../models/types';
import { log } from '../utils/logger';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Data Synchronization': ['sync', 'transfer', 'backup', 'replicate', 'migrate', 'import', 'export', 'etl'],
  'Marketing Automation': ['marketing', 'campaign', 'lead', 'newsletter', 'email-marketing', 'drip', 'nurture'],
  'Customer Support': ['support', 'ticket', 'helpdesk', 'feedback', 'customer-service', 'escalation'],
  'Content Management': ['content', 'publish', 'cms', 'blog', 'social-media', 'rss', 'post'],
  'E-commerce Operations': ['order', 'inventory', 'cart', 'product', 'shopify', 'woocommerce', 'payment'],
  'DevOps & Monitoring': ['deploy', 'monitor', 'incident', 'github', 'ci-cd', 'backup', 'server'],
  'Reporting & Analytics': ['report', 'analytics', 'dashboard', 'aggregate', 'metric', 'kpi'],
  'Lead Generation & CRM': ['lead', 'crm', 'prospect', 'pipeline', 'sales', 'scoring', 'qualification'],
  'Notification Systems': ['notification', 'alert', 'digest', 'routing', 'sms', 'push'],
  'Document Processing': ['document', 'pdf', 'invoice', 'ocr', 'contract', 'approval', 'template'],
};

const INTEGRATION_TO_SERVICE: Record<string, string> = {
  'airtable': 'Airtable',
  'google sheets': 'Google Sheets',
  'slack': 'Slack',
  'hubspot': 'HubSpot',
  'salesforce': 'Salesforce',
  'typeform': 'Typeform',
  'mailchimp': 'Mailchimp',
  'sendgrid': 'SendGrid',
  'github': 'GitHub',
  'shopify': 'Shopify',
  'stripe': 'Stripe',
  'twilio': 'Twilio',
  'zendesk': 'Zendesk',
  'notion': 'Notion',
  'wordpress': 'WordPress',
  'linkedin': 'LinkedIn',
  'twitter': 'Twitter',
  'facebook': 'Facebook',
  'postgresql': 'PostgreSQL',
  'mysql': 'MySQL',
  'mongodb': 'MongoDB',
  'aws s3': 'AWS S3',
  'google drive': 'Google Drive',
  'dropbox': 'Dropbox',
  'jira': 'Jira',
  'trello': 'Trello',
  'asana': 'Asana',
  'pagerduty': 'PagerDuty',
  'grafana': 'Grafana',
  'quickbooks': 'QuickBooks',
  'clearbit': 'Clearbit',
};

/**
 * Classify a workflow into a category based on its metadata
 */
function classifyWorkflow(
  name: string,
  description: string,
  tags: string[],
  nodeTypes: string[]
): string {
  const textToSearch = [name, description, ...tags, ...nodeTypes]
    .join(' ')
    .toLowerCase();

  let bestCategory = 'Data Synchronization';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (textToSearch.includes(keyword)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Generate semantic tags from workflow data
 */
function generateTags(
  name: string,
  description: string,
  nodeTypes: string[],
  existingTags: string[]
): string[] {
  const allTags = new Set<string>(existingTags);
  const text = `${name} ${description}`.toLowerCase();

  // Add integration-based tags
  for (const [keyword, _service] of Object.entries(INTEGRATION_TO_SERVICE)) {
    if (text.includes(keyword) || nodeTypes.some(n => n.toLowerCase().includes(keyword))) {
      allTags.add(keyword.replace(/\s+/g, '-'));
    }
  }

  // Add pattern-based tags
  if (text.includes('schedule') || text.includes('cron')) allTags.add('scheduled');
  if (text.includes('webhook')) allTags.add('webhook');
  if (text.includes('trigger')) allTags.add('event-driven');
  if (text.includes('sync')) allTags.add('synchronization');
  if (text.includes('automat')) allTags.add('automation');
  if (text.includes('notif') || text.includes('alert')) allTags.add('notifications');
  if (text.includes('email')) allTags.add('email');
  if (text.includes('api')) allTags.add('api-integration');
  if (text.includes('real-time') || text.includes('realtime')) allTags.add('real-time');
  if (text.includes('batch')) allTags.add('batch-processing');

  return Array.from(allTags);
}

/**
 * Classify all cleaned workflows in the database (batched D1 operations)
 */
export async function classifyAllWorkflows(env: Env, limit: number = 500): Promise<{ classified: number; failed: number; remaining: number }> {
  const rows = await env.DB.prepare(
    "SELECT * FROM workflows WHERE processing_status = 'cleaning' LIMIT ?"
  ).bind(limit).all<WorkflowRow>();

  const countResult = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM workflows WHERE processing_status = 'cleaning'"
  ).first<{ cnt: number }>();
  const totalPending = countResult?.cnt || 0;

  const updateStmts: D1PreparedStatement[] = [];
  const logStmts: D1PreparedStatement[] = [];
  const newTags = new Set<string>();
  const categoryCounts = new Map<string, number>();

  // Phase 1: Compute classifications in memory
  interface ClassifiedRow { id: string; category: string; allTags: string[] }
  const classified: ClassifiedRow[] = [];
  let failedCount = 0;

  for (const row of rows.results) {
    try {
      const workflow = JSON.parse(row.workflow_json) as N8nWorkflow;
      const existingTags = row.tags ? JSON.parse(row.tags) as string[] : [];
      const nodeTypes = workflow.nodes.map(n => n.type);

      const category = row.category || classifyWorkflow(row.name, row.description || '', existingTags, nodeTypes);
      const allTags = generateTags(row.name, row.description || '', nodeTypes, existingTags);

      for (const tag of allTags) newTags.add(tag);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

      updateStmts.push(
        env.DB.prepare("UPDATE workflows SET category = ?, tags = ?, processing_status = 'classifying', updated_at = datetime('now') WHERE id = ?")
          .bind(category, JSON.stringify(allTags), row.id)
      );
      logStmts.push(
        env.DB.prepare("INSERT INTO processing_log (workflow_id, stage, status, metadata) VALUES (?, 'classify', 'success', ?)")
          .bind(row.id, JSON.stringify({ category, tags_count: allTags.length }))
      );
      classified.push({ id: row.id, category, allTags });
    } catch (error) {
      failedCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      logStmts.push(
        env.DB.prepare("INSERT INTO processing_log (workflow_id, stage, status, error_message) VALUES (?, 'classify', 'failed', ?)")
          .bind(row.id, errorMsg)
      );
    }
  }

  // Phase 2: Batch update workflows (sub-batch for D1 limit)
  for (let i = 0; i < updateStmts.length; i += 100) {
    await env.DB.batch(updateStmts.slice(i, i + 100));
  }

  // Phase 3: Batch insert new tags
  const tagInsertStmts = Array.from(newTags).map(tag =>
    env.DB.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').bind(tag)
  );
  for (let i = 0; i < tagInsertStmts.length; i += 100) {
    await env.DB.batch(tagInsertStmts.slice(i, i + 100));
  }

  // Phase 4: Update category counts
  const catStmts = Array.from(categoryCounts.entries()).map(([cat, count]) =>
    env.DB.prepare('UPDATE categories SET workflow_count = workflow_count + ? WHERE name = ?').bind(count, cat)
  );
  if (catStmts.length > 0) {
    for (let i = 0; i < catStmts.length; i += 100) {
      await env.DB.batch(catStmts.slice(i, i + 100));
    }
  }

  // Phase 5: Fetch tag IDs and batch insert junction records
  const tagRows = await env.DB.prepare('SELECT id, name FROM tags').all<{ id: number; name: string }>();
  const tagMap = new Map(tagRows.results.map(r => [r.name, r.id]));

  const wtStmts: D1PreparedStatement[] = [];
  for (const cr of classified) {
    for (const tag of cr.allTags) {
      const tagId = tagMap.get(tag);
      if (tagId) {
        wtStmts.push(
          env.DB.prepare('INSERT OR IGNORE INTO workflow_tags (workflow_id, tag_id, is_auto_generated) VALUES (?, ?, 1)').bind(cr.id, tagId)
        );
      }
    }
  }
  if (wtStmts.length > 0) {
    for (let i = 0; i < wtStmts.length; i += 50) {
      await env.DB.batch(wtStmts.slice(i, i + 50));
    }
  }

  // Phase 6: Batch insert logs (sub-batched)
  for (let i = 0; i < logStmts.length; i += 100) {
    await env.DB.batch(logStmts.slice(i, i + 100));
  }

  const remaining = Math.max(0, totalPending - classified.length);
  log('info', 'Classification complete (batched)', { classified: classified.length, failed: failedCount, remaining });
  return { classified: classified.length, failed: failedCount, remaining };
}
