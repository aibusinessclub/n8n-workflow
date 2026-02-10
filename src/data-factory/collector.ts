/**
 * Data Factory - Template Collector
 * 
 * Collects n8n workflow templates from the knowledge base and stores them in D1.
 * Templates are sourced from the curated knowledge base defined in the plans.
 */

import type { Env, N8nWorkflow, N8nNode, N8nConnection } from '../models/types';
import { log } from '../utils/logger';
import { getExpandedTemplates } from './expanded-templates';

export interface RawTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  use_cases: string[];
  nodes: string[];
  integrations: string[];
  triggers: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  pattern: string;
}

/**
 * Get all curated workflow templates from the knowledge base
 */
export function getKnowledgeBaseTemplates(): RawTemplate[] {
  return [
    // 1. Data Synchronization
    {
      id: 'sync-airtable-gsheets-001',
      name: 'Airtable to Google Sheets Sync',
      category: 'Data Synchronization',
      description: 'Automatically sync records from Airtable to Google Sheets on a schedule or when records are created/updated',
      use_cases: ['Keep spreadsheets updated with database changes', 'Share Airtable data with non-Airtable users', 'Create backup copies of Airtable data'],
      nodes: ['Airtable Trigger', 'Google Sheets', 'Schedule Trigger'],
      integrations: ['Airtable', 'Google Sheets'],
      triggers: ['Schedule', 'Airtable Trigger'],
      complexity: 'beginner',
      tags: ['sync', 'airtable', 'google-sheets', 'backup', 'data-transfer'],
      pattern: 'Schedule → Fetch → Transform → Store'
    },
    {
      id: 'sync-db-crm-001',
      name: 'Database to CRM Sync',
      category: 'Data Synchronization',
      description: 'Bi-directional sync between database and CRM system to keep customer data consistent',
      use_cases: ['Sync customer records between systems', 'Update contact information across platforms', 'Maintain data consistency'],
      nodes: ['PostgreSQL', 'HubSpot', 'Schedule Trigger', 'Compare Datasets'],
      integrations: ['PostgreSQL', 'HubSpot'],
      triggers: ['Schedule'],
      complexity: 'intermediate',
      tags: ['sync', 'database', 'crm', 'bi-directional', 'customer-data'],
      pattern: 'Schedule → Fetch → Compare → Update'
    },
    {
      id: 'sync-contacts-multi-001',
      name: 'Multi-Platform Contact Sync',
      category: 'Data Synchronization',
      description: 'Sync contacts across multiple platforms including Google Contacts, Outlook, and CRM',
      use_cases: ['Centralize contact management', 'Keep contact lists updated everywhere', 'Prevent duplicate entries'],
      nodes: ['Google Contacts', 'Microsoft Outlook', 'CRM', 'Merge', 'Deduplicate'],
      integrations: ['Google Contacts', 'Microsoft Outlook', 'CRM'],
      triggers: ['Schedule', 'Webhook'],
      complexity: 'advanced',
      tags: ['contacts', 'sync', 'multi-platform', 'deduplication'],
      pattern: 'Schedule → Fetch Multiple → Merge → Deduplicate → Distribute'
    },
    // 2. Marketing Automation
    {
      id: 'marketing-typeform-email-001',
      name: 'Typeform to Email Campaign',
      category: 'Marketing Automation',
      description: 'Automatically add Typeform respondents to email marketing campaigns based on their answers',
      use_cases: ['Lead capture from forms', 'Segment leads based on responses', 'Trigger personalized email sequences'],
      nodes: ['Typeform Trigger', 'IF', 'Mailchimp', 'Google Sheets'],
      integrations: ['Typeform', 'Mailchimp', 'Google Sheets'],
      triggers: ['Typeform Trigger'],
      complexity: 'beginner',
      tags: ['marketing', 'typeform', 'email', 'lead-capture', 'segmentation'],
      pattern: 'Trigger → Conditional → Action → Store'
    },
    {
      id: 'marketing-social-leads-001',
      name: 'Social Media Lead Generation',
      category: 'Marketing Automation',
      description: 'Monitor social media for keywords, capture leads, and add to CRM with enrichment',
      use_cases: ['Social listening for sales opportunities', 'Automated lead qualification', 'Social media prospecting'],
      nodes: ['Twitter', 'Clearbit', 'CRM', 'Slack'],
      integrations: ['Twitter', 'Clearbit', 'CRM', 'Slack'],
      triggers: ['Schedule', 'Webhook'],
      complexity: 'intermediate',
      tags: ['social-media', 'lead-generation', 'enrichment', 'crm'],
      pattern: 'Poll → Filter → Enrich → Store → Notify'
    },
    {
      id: 'marketing-cart-recovery-001',
      name: 'Abandoned Cart Recovery',
      category: 'Marketing Automation',
      description: 'Send automated email sequences to customers who abandoned their shopping carts',
      use_cases: ['Recover lost sales', 'Personalized cart reminders', 'Discount offers for abandoned carts'],
      nodes: ['Shopify', 'Wait', 'Email', 'IF', 'Database'],
      integrations: ['Shopify', 'Email Service'],
      triggers: ['Webhook'],
      complexity: 'intermediate',
      tags: ['e-commerce', 'cart-recovery', 'email', 'automation'],
      pattern: 'Event → Wait → Check Status → Conditional Email'
    },
    // 3. Customer Support
    {
      id: 'support-email-ticket-001',
      name: 'Email to Ticket System',
      category: 'Customer Support',
      description: 'Automatically create support tickets from emails and notify team in Slack',
      use_cases: ['Centralize support requests', 'Auto-route tickets to teams', 'Track email-based support'],
      nodes: ['Email Trigger', 'Zendesk', 'Slack', 'IF'],
      integrations: ['Email', 'Zendesk', 'Slack'],
      triggers: ['Email Trigger'],
      complexity: 'beginner',
      tags: ['support', 'email', 'ticketing', 'slack', 'automation'],
      pattern: 'Trigger → Create → Notify'
    },
    {
      id: 'support-feedback-loop-001',
      name: 'Customer Feedback Loop',
      category: 'Customer Support',
      description: 'Collect customer feedback via survey, analyze sentiment, and route to appropriate teams',
      use_cases: ['Automated feedback collection', 'Sentiment analysis', 'Priority routing for negative feedback'],
      nodes: ['Typeform Trigger', 'Sentiment Analysis', 'IF', 'CRM', 'Slack', 'Email'],
      integrations: ['Typeform', 'CRM', 'Slack', 'Email'],
      triggers: ['Survey Trigger'],
      complexity: 'intermediate',
      tags: ['feedback', 'survey', 'sentiment', 'routing', 'customer-satisfaction'],
      pattern: 'Trigger → Analyze → Conditional Route → Store → Notify'
    },
    {
      id: 'support-chatbot-escalation-001',
      name: 'Chatbot to Human Escalation',
      category: 'Customer Support',
      description: 'Handle customer queries with chatbot, escalate complex issues to human agents',
      use_cases: ['First-line automated support', 'Smart escalation', '24/7 initial response'],
      nodes: ['Webhook', 'AI', 'IF', 'Zendesk', 'Slack', 'Database'],
      integrations: ['Chatbot Platform', 'Zendesk', 'Slack'],
      triggers: ['Webhook'],
      complexity: 'advanced',
      tags: ['chatbot', 'escalation', 'support', 'automation', 'ai'],
      pattern: 'Event → Process → Conditional → Escalate/Resolve'
    },
    // 4. Content Management
    {
      id: 'content-rss-social-001',
      name: 'RSS to Social Media',
      category: 'Content Management',
      description: 'Automatically post new RSS feed items to multiple social media platforms',
      use_cases: ['Blog post distribution', 'Content syndication', 'Multi-platform posting'],
      nodes: ['RSS Feed Trigger', 'Twitter', 'LinkedIn', 'Facebook'],
      integrations: ['RSS', 'Twitter', 'LinkedIn', 'Facebook'],
      triggers: ['RSS Feed Trigger'],
      complexity: 'beginner',
      tags: ['rss', 'social-media', 'content', 'distribution', 'automation'],
      pattern: 'Trigger → Transform → Multi-Distribute'
    },
    {
      id: 'content-publishing-pipeline-001',
      name: 'Content Publishing Pipeline',
      category: 'Content Management',
      description: 'Manage content from draft to published across CMS, social media, and email',
      use_cases: ['Coordinated content launches', 'Multi-channel publishing', 'Content calendar automation'],
      nodes: ['Notion', 'WordPress', 'Social Media', 'Email', 'Schedule'],
      integrations: ['Notion', 'WordPress', 'Social Media', 'Email Service'],
      triggers: ['Schedule', 'Webhook'],
      complexity: 'intermediate',
      tags: ['publishing', 'cms', 'content-calendar', 'multi-channel'],
      pattern: 'Schedule → Fetch → Conditional → Multi-Publish'
    },
    {
      id: 'content-media-processing-001',
      name: 'Media Processing and Distribution',
      category: 'Content Management',
      description: 'Process uploaded media (resize, optimize, watermark) and distribute to CDN and platforms',
      use_cases: ['Image optimization', 'Video processing', 'Asset distribution'],
      nodes: ['Webhook', 'Image Processing', 'AWS S3', 'Database', 'Notification'],
      integrations: ['Cloudinary', 'AWS S3', 'CDN'],
      triggers: ['Webhook'],
      complexity: 'advanced',
      tags: ['media', 'processing', 'cdn', 'optimization', 'distribution'],
      pattern: 'Event → Process → Store → Distribute → Notify'
    },
    // 5. E-commerce Operations
    {
      id: 'ecommerce-order-processing-001',
      name: 'Order Processing Automation',
      category: 'E-commerce Operations',
      description: 'Automate order processing from payment to fulfillment with customer notifications',
      use_cases: ['End-to-end order automation', 'Customer communication', 'Inventory updates'],
      nodes: ['Shopify', 'Stripe', 'ShipStation', 'Email', 'Database'],
      integrations: ['Shopify', 'Stripe', 'ShipStation', 'Email'],
      triggers: ['Webhook'],
      complexity: 'intermediate',
      tags: ['e-commerce', 'orders', 'fulfillment', 'payment', 'automation'],
      pattern: 'Event → Process → Fulfill → Notify → Update'
    },
    {
      id: 'ecommerce-inventory-alerts-001',
      name: 'Inventory Monitoring and Alerts',
      category: 'E-commerce Operations',
      description: 'Monitor inventory levels and send alerts when stock is low or out',
      use_cases: ['Prevent stockouts', 'Automated reordering', 'Inventory tracking'],
      nodes: ['Shopify', 'Schedule', 'IF', 'Email', 'Slack', 'Database'],
      integrations: ['Shopify', 'Email', 'Slack'],
      triggers: ['Schedule'],
      complexity: 'beginner',
      tags: ['inventory', 'monitoring', 'alerts', 'e-commerce', 'stock'],
      pattern: 'Schedule → Fetch → Compare → Conditional Alert'
    },
    {
      id: 'ecommerce-product-sync-001',
      name: 'Multi-Channel Product Sync',
      category: 'E-commerce Operations',
      description: 'Sync product information across multiple sales channels and marketplaces',
      use_cases: ['Multi-marketplace selling', 'Consistent product data', 'Centralized inventory'],
      nodes: ['Shopify', 'Amazon', 'eBay', 'Etsy', 'Database'],
      integrations: ['Shopify', 'Amazon', 'eBay', 'Etsy'],
      triggers: ['Webhook', 'Schedule'],
      complexity: 'advanced',
      tags: ['multi-channel', 'products', 'sync', 'marketplace', 'e-commerce'],
      pattern: 'Event → Transform → Multi-Distribute → Verify'
    },
    // 6. DevOps & Monitoring
    {
      id: 'devops-github-slack-001',
      name: 'GitHub to Slack Deployment Notifications',
      category: 'DevOps & Monitoring',
      description: 'Send Slack notifications for GitHub events including commits, PRs, and deployments',
      use_cases: ['Team notifications', 'Deployment tracking', 'Code review alerts'],
      nodes: ['GitHub Trigger', 'Slack', 'IF', 'Database'],
      integrations: ['GitHub', 'Slack'],
      triggers: ['GitHub Webhook'],
      complexity: 'beginner',
      tags: ['github', 'slack', 'notifications', 'devops', 'deployment'],
      pattern: 'Event → Transform → Notify'
    },
    {
      id: 'devops-monitoring-incident-001',
      name: 'Server Monitoring and Incident Management',
      category: 'DevOps & Monitoring',
      description: 'Monitor server health, create incidents for issues, and notify on-call team',
      use_cases: ['Uptime monitoring', 'Automated incident creation', 'On-call notifications'],
      nodes: ['HTTP Request', 'IF', 'PagerDuty', 'Slack', 'Database'],
      integrations: ['Monitoring Service', 'PagerDuty', 'Slack'],
      triggers: ['Schedule'],
      complexity: 'intermediate',
      tags: ['monitoring', 'incidents', 'alerts', 'devops', 'uptime'],
      pattern: 'Poll → Check → Conditional → Create Incident → Notify'
    },
    {
      id: 'devops-backup-verification-001',
      name: 'Automated Backup and Verification',
      category: 'DevOps & Monitoring',
      description: 'Automated database backups with verification and reporting',
      use_cases: ['Scheduled backups', 'Backup verification', 'Disaster recovery'],
      nodes: ['Database', 'AWS S3', 'Verification', 'Email', 'Slack'],
      integrations: ['Database', 'AWS S3', 'Email', 'Slack'],
      triggers: ['Schedule'],
      complexity: 'intermediate',
      tags: ['backup', 'database', 'verification', 'disaster-recovery', 'automation'],
      pattern: 'Schedule → Backup → Verify → Store → Report'
    },
    // 7. Reporting & Analytics
    {
      id: 'analytics-data-aggregation-001',
      name: 'Multi-Source Data Aggregation',
      category: 'Reporting & Analytics',
      description: 'Aggregate data from multiple sources into a central reporting database',
      use_cases: ['Unified reporting', 'Cross-platform analytics', 'Data warehouse population'],
      nodes: ['Schedule', 'HTTP Request', 'Transform', 'Database', 'Google Sheets'],
      integrations: ['Various APIs', 'Database', 'Google Sheets'],
      triggers: ['Schedule'],
      complexity: 'intermediate',
      tags: ['analytics', 'aggregation', 'reporting', 'data-warehouse', 'etl'],
      pattern: 'Schedule → Fetch Multiple → Transform → Aggregate → Store'
    },
    {
      id: 'analytics-scheduled-reports-001',
      name: 'Scheduled Report Generation',
      category: 'Reporting & Analytics',
      description: 'Generate and distribute reports on a schedule via email or Slack',
      use_cases: ['Daily/weekly reports', 'Automated dashboards', 'Stakeholder updates'],
      nodes: ['Schedule', 'Database', 'Transform', 'Email', 'Slack'],
      integrations: ['Database', 'Email', 'Slack'],
      triggers: ['Schedule'],
      complexity: 'beginner',
      tags: ['reports', 'scheduling', 'email', 'analytics', 'automation'],
      pattern: 'Schedule → Fetch → Transform → Generate → Distribute'
    },
    {
      id: 'analytics-realtime-dashboard-001',
      name: 'Real-Time Dashboard Updates',
      category: 'Reporting & Analytics',
      description: 'Push real-time data updates to dashboards and visualization tools',
      use_cases: ['Live dashboards', 'Real-time metrics', 'Instant data visualization'],
      nodes: ['Webhook', 'Transform', 'Dashboard API', 'Database'],
      integrations: ['Data Source', 'Grafana', 'Database'],
      triggers: ['Webhook'],
      complexity: 'advanced',
      tags: ['real-time', 'dashboard', 'visualization', 'analytics', 'streaming'],
      pattern: 'Event → Transform → Push → Update'
    },
    // 8. Lead Generation & CRM
    {
      id: 'crm-linkedin-leads-001',
      name: 'LinkedIn Lead Capture',
      category: 'Lead Generation & CRM',
      description: 'Capture LinkedIn leads, enrich with additional data, and add to CRM',
      use_cases: ['LinkedIn prospecting', 'Lead enrichment', 'Sales pipeline automation'],
      nodes: ['LinkedIn', 'Clearbit', 'CRM', 'Email', 'Slack'],
      integrations: ['LinkedIn', 'Clearbit', 'CRM', 'Email', 'Slack'],
      triggers: ['Schedule', 'Webhook'],
      complexity: 'intermediate',
      tags: ['linkedin', 'leads', 'enrichment', 'crm', 'sales'],
      pattern: 'Fetch → Enrich → Store → Notify'
    },
    {
      id: 'crm-form-scoring-001',
      name: 'Website Form to CRM with Scoring',
      category: 'Lead Generation & CRM',
      description: 'Capture website form submissions, score leads, and route to sales team',
      use_cases: ['Lead qualification', 'Automated scoring', 'Sales routing'],
      nodes: ['Webhook', 'Lead Scoring', 'IF', 'CRM', 'Email', 'Slack'],
      integrations: ['Form Service', 'CRM', 'Email', 'Slack'],
      triggers: ['Webhook'],
      complexity: 'intermediate',
      tags: ['forms', 'lead-scoring', 'crm', 'qualification', 'routing'],
      pattern: 'Event → Score → Conditional Route → Store → Notify'
    },
    {
      id: 'crm-email-tracking-001',
      name: 'Email Campaign Response Tracking',
      category: 'Lead Generation & CRM',
      description: 'Track email campaign responses and update CRM with engagement data',
      use_cases: ['Email engagement tracking', 'Lead nurturing', 'Campaign analytics'],
      nodes: ['Email Service', 'Webhook', 'CRM', 'Database', 'Analytics'],
      integrations: ['Email Service', 'CRM', 'Database'],
      triggers: ['Webhook'],
      complexity: 'beginner',
      tags: ['email', 'tracking', 'crm', 'engagement', 'campaigns'],
      pattern: 'Event → Parse → Update → Analyze'
    },
    // 9. Notification Systems
    {
      id: 'notification-multi-channel-001',
      name: 'Multi-Channel Alert System',
      category: 'Notification Systems',
      description: 'Send alerts across multiple channels (Email, Slack, SMS, Push) based on priority',
      use_cases: ['Critical alerts', 'Multi-channel notifications', 'Priority-based routing'],
      nodes: ['Webhook', 'IF', 'Email', 'Slack', 'Twilio', 'Push Service'],
      integrations: ['Email', 'Slack', 'Twilio', 'Push Notification Service'],
      triggers: ['Webhook'],
      complexity: 'intermediate',
      tags: ['notifications', 'alerts', 'multi-channel', 'priority', 'routing'],
      pattern: 'Event → Prioritize → Multi-Channel Notify'
    },
    {
      id: 'notification-digest-001',
      name: 'Digest Notifications',
      category: 'Notification Systems',
      description: 'Aggregate events and send periodic digest notifications',
      use_cases: ['Daily summaries', 'Reduced notification noise', 'Batch updates'],
      nodes: ['Schedule', 'Database', 'Aggregate', 'Email', 'Slack'],
      integrations: ['Database', 'Email', 'Slack'],
      triggers: ['Schedule'],
      complexity: 'beginner',
      tags: ['digest', 'notifications', 'aggregation', 'summary', 'batch'],
      pattern: 'Schedule → Fetch → Aggregate → Format → Send'
    },
    {
      id: 'notification-smart-routing-001',
      name: 'Smart Notification Routing',
      category: 'Notification Systems',
      description: 'Route notifications to appropriate team members based on rules and availability',
      use_cases: ['On-call routing', 'Team-based notifications', 'Escalation paths'],
      nodes: ['Webhook', 'IF', 'Database', 'Email', 'Slack', 'SMS'],
      integrations: ['Database', 'Email', 'Slack', 'SMS Service'],
      triggers: ['Webhook'],
      complexity: 'advanced',
      tags: ['routing', 'notifications', 'on-call', 'escalation', 'smart'],
      pattern: 'Event → Check Rules → Route → Notify → Track'
    },
    // 10. Document Processing
    {
      id: 'document-invoice-processing-001',
      name: 'Invoice Processing and Extraction',
      category: 'Document Processing',
      description: 'Extract data from invoices using OCR and store in accounting system',
      use_cases: ['Automated invoice processing', 'Data extraction', 'Accounting automation'],
      nodes: ['Email Trigger', 'OCR Service', 'Transform', 'QuickBooks', 'Database'],
      integrations: ['Email', 'OCR', 'QuickBooks'],
      triggers: ['Email Trigger', 'Webhook'],
      complexity: 'advanced',
      tags: ['ocr', 'invoices', 'extraction', 'accounting', 'automation'],
      pattern: 'Event → Extract → Validate → Store → Notify'
    },
    {
      id: 'document-template-generation-001',
      name: 'Document Generation from Templates',
      category: 'Document Processing',
      description: 'Generate documents (PDFs, contracts) from templates with dynamic data',
      use_cases: ['Contract generation', 'Report creation', 'Document automation'],
      nodes: ['Webhook', 'Database', 'Template Engine', 'PDF Generator', 'Storage'],
      integrations: ['Database', 'Template Service', 'PDF Service', 'Cloud Storage'],
      triggers: ['Webhook', 'Schedule'],
      complexity: 'intermediate',
      tags: ['documents', 'templates', 'pdf', 'generation', 'automation'],
      pattern: 'Event → Fetch Data → Populate Template → Generate → Store'
    },
    {
      id: 'document-approval-workflow-001',
      name: 'Document Approval Workflow',
      category: 'Document Processing',
      description: 'Route documents for approval with notifications and tracking',
      use_cases: ['Approval processes', 'Document review', 'Workflow management'],
      nodes: ['Webhook', 'Database', 'Email', 'Slack', 'IF', 'Wait'],
      integrations: ['Database', 'Email', 'Slack', 'Document Storage'],
      triggers: ['Webhook'],
      complexity: 'intermediate',
      tags: ['approval', 'workflow', 'documents', 'review', 'tracking'],
      pattern: 'Event → Route → Notify → Wait → Check → Update'
    },
  ];
}

/**
 * Build a minimal n8n workflow JSON from a raw template
 */
export function buildWorkflowJson(template: RawTemplate): N8nWorkflow {
  const nodes: N8nNode[] = template.nodes.map((nodeName, index) => {
    const isTrigger = nodeName.toLowerCase().includes('trigger') ||
                      nodeName.toLowerCase().includes('webhook') ||
                      nodeName.toLowerCase().includes('schedule');
    return {
      id: `node_${index}`,
      name: nodeName,
      type: `n8n-nodes-base.${nodeName.toLowerCase().replace(/\s+/g, '')}`,
      typeVersion: 1,
      position: [250 + (index * 200), 300],
      parameters: {},
      disabled: false,
      ...(isTrigger ? {} : {}),
    };
  });

  // Build connections: chain nodes linearly
  const connections: Record<string, N8nConnection> = {};
  for (let i = 0; i < nodes.length - 1; i++) {
    const currentNode = nodes[i];
    const nextNode = nodes[i + 1];
    if (currentNode && nextNode) {
      connections[currentNode.name] = {
        main: [[{ node: nextNode.name, type: 'main', index: 0 }]]
      };
    }
  }

  return {
    name: template.name,
    nodes,
    connections,
    settings: {
      executionOrder: 'v1'
    },
    active: false,
  };
}

/**
 * Get ALL templates: base (30) + expanded (~4970) = ~5000 total
 */
export function getAllTemplates(): RawTemplate[] {
  const base = getKnowledgeBaseTemplates();
  const expanded = getExpandedTemplates();
  const baseIds = new Set(base.map(t => t.id));
  const merged = [...base, ...expanded.filter(t => !baseIds.has(t.id))];
  log('info', `Total templates: ${merged.length} (${base.length} base + ${expanded.length - (merged.length - base.length)} expanded)`);
  return merged;
}

/**
 * Collect all templates and insert them into D1 database using batched operations.
 * Uses DB.batch() to minimize subrequests and avoid Cloudflare limits.
 * Supports pagination: offset/limit to process chunks per Worker invocation.
 */
export async function collectAndStoreTemplates(
  env: Env,
  offset: number = 0,
  limit: number = 500
): Promise<{ collected: number; errors: number; total: number; remaining: number }> {
  const allTemplates = getAllTemplates();
  const templates = allTemplates.slice(offset, offset + limit);
  let collected = 0;
  let errors = 0;
  const total = allTemplates.length;
  const remaining = Math.max(0, total - offset - limit);

  // Helper: split statements into sub-batches of 100 (D1 limit)
  async function batchExec(stmts: D1PreparedStatement[], size = 100) {
    for (let i = 0; i < stmts.length; i += size) {
      await env.DB.batch(stmts.slice(i, i + size));
    }
  }

  try {
    // Batch 1: Insert all workflows (sub-batched)
    const workflowStmts = templates.map(template => {
      const workflowJson = buildWorkflowJson(template);
      return env.DB.prepare(`
        INSERT OR REPLACE INTO workflows (
          id, source, name, description, workflow_json, node_count, complexity,
          category, tags, processing_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        template.id,
        'knowledge-base',
        template.name,
        template.description + '\n\nUse cases: ' + template.use_cases.join('; '),
        JSON.stringify(workflowJson),
        template.nodes.length,
        template.complexity,
        template.category,
        JSON.stringify(template.tags),
        'collecting'
      );
    });
    await batchExec(workflowStmts);
    log('info', `Inserted ${templates.length} workflows`);

    // Batch 2: Insert all unique integration services
    const allIntegrations = new Set<string>();
    for (const t of templates) {
      for (const i of t.integrations) allIntegrations.add(i);
    }
    const serviceStmts = Array.from(allIntegrations).map(name =>
      env.DB.prepare('INSERT OR IGNORE INTO integration_services (service_name, service_type) VALUES (?, ?)').bind(name, 'API')
    );
    await batchExec(serviceStmts);

    // Batch 3: Insert all unique tags
    const allTags = new Set<string>();
    for (const t of templates) {
      for (const tag of t.tags) allTags.add(tag);
    }
    const tagStmts = Array.from(allTags).map(tag =>
      env.DB.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').bind(tag)
    );
    await batchExec(tagStmts);

    // Batch 4: Insert all unique node types
    const allNodeTypes = new Set<string>();
    const nodeTypeStmts: D1PreparedStatement[] = [];
    for (const t of templates) {
      for (const nodeName of t.nodes) {
        const typeName = `n8n-nodes-base.${nodeName.toLowerCase().replace(/\s+/g, '')}`;
        if (!allNodeTypes.has(typeName)) {
          allNodeTypes.add(typeName);
          const isTrigger = nodeName.toLowerCase().includes('trigger') || nodeName.toLowerCase().includes('webhook');
          nodeTypeStmts.push(
            env.DB.prepare('INSERT OR IGNORE INTO node_types (type_name, display_name, is_trigger) VALUES (?, ?, ?)')
              .bind(typeName, nodeName, isTrigger ? 1 : 0)
          );
        }
      }
    }
    if (nodeTypeStmts.length > 0) {
      await batchExec(nodeTypeStmts);
    }

    // Fetch service and tag IDs for junction tables
    const serviceRows = await env.DB.prepare('SELECT id, service_name FROM integration_services').all<{ id: number; service_name: string }>();
    const serviceMap = new Map(serviceRows.results.map(r => [r.service_name, r.id]));

    const tagRows = await env.DB.prepare('SELECT id, name FROM tags').all<{ id: number; name: string }>();
    const tagMap = new Map(tagRows.results.map(r => [r.name, r.id]));

    // Batch 5: Insert workflow-service junction records
    const wsStmts: D1PreparedStatement[] = [];
    for (const t of templates) {
      for (const integration of t.integrations) {
        const serviceId = serviceMap.get(integration);
        if (serviceId) {
          wsStmts.push(
            env.DB.prepare('INSERT OR IGNORE INTO workflow_services (workflow_id, service_id) VALUES (?, ?)').bind(t.id, serviceId)
          );
        }
      }
    }
    if (wsStmts.length > 0) {
      await batchExec(wsStmts);
    }

    // Batch 6: Insert workflow-tag junction records
    const wtStmts: D1PreparedStatement[] = [];
    for (const t of templates) {
      for (const tag of t.tags) {
        const tagId = tagMap.get(tag);
        if (tagId) {
          wtStmts.push(
            env.DB.prepare('INSERT OR IGNORE INTO workflow_tags (workflow_id, tag_id, is_auto_generated) VALUES (?, ?, 1)').bind(t.id, tagId)
          );
        }
      }
    }
    if (wtStmts.length > 0) {
      await batchExec(wtStmts);
    }

    // Batch 7: Insert workflow nodes
    const nodeStmts: D1PreparedStatement[] = [];
    for (const t of templates) {
      for (let i = 0; i < t.nodes.length; i++) {
        const nodeName = t.nodes[i]!;
        const isTrigger = nodeName.toLowerCase().includes('trigger') || nodeName.toLowerCase().includes('webhook');
        nodeStmts.push(
          env.DB.prepare(`
            INSERT OR IGNORE INTO workflow_nodes (workflow_id, node_id, node_name, node_type, is_trigger, position_x, position_y)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(t.id, `node_${i}`, nodeName, `n8n-nodes-base.${nodeName.toLowerCase().replace(/\s+/g, '')}`, isTrigger ? 1 : 0, 250 + (i * 200), 300)
        );
      }
    }
    if (nodeStmts.length > 0) {
      await batchExec(nodeStmts);
    }

    collected = templates.length;
    log('info', 'Collection complete (batched)', { collected, errors, offset, limit, remaining });
  } catch (error) {
    errors = templates.length;
    log('error', 'Batch collection failed', { error: error instanceof Error ? error.message : String(error) });
  }

  return { collected, errors, total, remaining };
}
