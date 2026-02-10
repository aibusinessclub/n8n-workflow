/**
 * n8n Workflow Semantic Tagger
 * 
 * Generates semantic tags for workflows.
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface WorkflowTag {
  id: string;
  workflow_id: string;
  tag_type: 'integration' | 'pattern' | 'complexity' | 'use_case' | 'trigger' | 'industry';
  tag_value: string;
  weight: number;
  source: 'automatic' | 'manual' | 'ai';
  confidence: number;
  created_at: string;
}

export interface TaggingResult {
  tags: WorkflowTag[];
  all_tags: string[];
  primary_tags: string[];
  secondary_tags: string[];
}

// ============================================================================
// Tag Definitions
// ============================================================================

const INTEGRATION_TAGS: Record<string, string[]> = {
  'slack': ['slack', 'slack.com'],
  'discord': ['discord', 'discord.com'],
  'telegram': ['telegram', 't.me'],
  'email': ['email', 'smtp', 'mail'],
  'twilio': ['twilio', 'sms'],
  'googleSheets': ['google sheets', 'googlesheets'],
  'googleDrive': ['google drive', 'googledrive'],
  'airtable': ['airtable'],
  'notion': ['notion'],
  'dropbox': ['dropbox'],
  'box': ['box'],
  'hubspot': ['hubspot'],
  'salesforce': ['salesforce'],
  'zendesk': ['zendesk'],
  'jira': ['jira'],
  'github': ['github', 'git'],
  'postgres': ['postgresql', 'postgres'],
  'mysql': ['mysql', 'mariadb'],
  'mongodb': ['mongodb', 'mongo'],
  'redis': ['redis'],
  'stripe': ['stripe'],
  'mailchimp': ['mailchimp'],
  'sendgrid': ['sendgrid'],
  'httpRequest': ['http', 'https', 'rest', 'api'],
};

const PATTERN_TAGS: Record<string, string[]> = {
  'webhook': ['webhook', 'http trigger', 'post', 'callback'],
  'schedule': ['schedule', 'cron', 'timer', 'interval'],
  'manual': ['manual', 'button', 'click', 'on demand'],
  'conditional': ['if', 'condition', 'switch', 'branch', 'filter'],
  'error_handling': ['error', 'retry', 'catch', 'fallback'],
  'data_transform': ['set', 'transform', 'map', 'convert', 'format'],
  'api_call': ['http request', 'fetch', 'api'],
};

const USE_CASE_TAGS: Record<string, string[]> = {
  'lead_capture': ['lead', 'capture', 'form', 'submission'],
  'notifications': ['notification', 'alert', 'message', 'notify'],
  'sync': ['sync', 'synchronize', 'import', 'export'],
  'backup': ['backup', 'restore', 'archive'],
  'reporting': ['report', 'analytics', 'metric', 'dashboard'],
  'automation': ['automate', 'automation'],
  'monitoring': ['monitor', 'watch', 'check'],
};

const INDUSTRY_TAGS: Record<string, string[]> = {
  'technology': ['tech', 'software', 'saas', 'api', 'developer'],
  'marketing': ['marketing', 'advertising', 'campaign', 'digital'],
  'sales': ['sales', 'crm', 'revenue'],
  'support': ['support', 'service', 'helpdesk'],
  'finance': ['finance', 'accounting', 'payment'],
};

// ============================================================================
// Main Tagger Class
// ============================================================================

export class WorkflowTagger {
  private minConfidence: number;
  private maxTags: number;

  constructor(options: { minConfidence?: number; maxTags?: number } = {}) {
    this.minConfidence = options.minConfidence || 0.5;
    this.maxTags = options.maxTags || 20;
  }

  generateTags(workflow: {
    id: string;
    name: string;
    description: string;
    nodes: any[];
    structure: any;
    metadata: any;
    classification?: { category: string; complexity: string; confidence: number };
  }): TaggingResult {
    const tags: WorkflowTag[] = [];
    const allTags = new Set<string>();
    const primaryTags: string[] = [];
    const secondaryTags: string[] = [];

    const text = `${workflow.name} ${workflow.description}`.toLowerCase();
    const nodeTypes = workflow.nodes.map((n: any) => n.type?.toLowerCase() || '');

    // Integration tags
    for (const [integration, patterns] of Object.entries(INTEGRATION_TAGS)) {
      let matchScore = 0;
      for (const pattern of patterns) {
        if (text.includes(pattern.toLowerCase())) matchScore += 2;
      }
      for (const nodeType of nodeTypes) {
        if (patterns.some(p => nodeType.includes(p.toLowerCase()))) matchScore += 3;
      }
      if (matchScore > 0) {
        const confidence = Math.min(matchScore / 10, 1);
        const tag = this.createTag(workflow.id, 'integration', integration, confidence * 0.9);
        tags.push(tag);
        allTags.add(integration);
        if (confidence > 0.7) primaryTags.push(integration);
      }
    }

    // Pattern tags
    for (const [pattern, patterns] of Object.entries(PATTERN_TAGS)) {
      let matchScore = 0;
      for (const p of patterns) {
        if (text.includes(p.toLowerCase())) matchScore += 1;
      }
      for (const nodeType of nodeTypes) {
        if (patterns.some(p => nodeType.includes(p))) matchScore += 2;
      }
      if (workflow.structure?.has_conditional && pattern === 'conditional') matchScore += 3;
      if (workflow.structure?.has_error_handler && pattern === 'error_handling') matchScore += 3;
      if (matchScore > 0) {
        const confidence = Math.min(matchScore / 8, 1);
        const tag = this.createTag(workflow.id, 'pattern', pattern, confidence * 0.8);
        tags.push(tag);
        allTags.add(pattern);
        secondaryTags.push(pattern);
      }
    }

    // Use case tags
    const categoryUseCaseMap: Record<string, string> = {
      'Data Synchronization': 'sync',
      'Marketing Automation': 'automation',
      'Customer Support': 'notifications',
      'Reporting & Analytics': 'reporting',
      'Lead Generation & CRM': 'lead_capture',
      'Notification Systems': 'notifications',
    };

    const category = workflow.classification?.category;
    if (category && categoryUseCaseMap[category]) {
      const tag = this.createTag(workflow.id, 'use_case', categoryUseCaseMap[category], 0.8);
      tags.push(tag);
      allTags.add(categoryUseCaseMap[category]);
    }

    for (const [useCase, patterns] of Object.entries(USE_CASE_TAGS)) {
      let matchScore = 0;
      for (const p of patterns) {
        if (text.includes(p.toLowerCase())) matchScore += 1;
      }
      if (matchScore > 0) {
        const confidence = Math.min(matchScore / 5, 1);
        if (!tags.find(t => t.tag_value === useCase)) {
          const tag = this.createTag(workflow.id, 'use_case', useCase, confidence * 0.7);
          tags.push(tag);
          allTags.add(useCase);
        }
      }
    }

    // Trigger tags
    const triggerType = workflow.structure?.trigger_type || 'unknown';
    const triggerMap: Record<string, string> = {
      'webhook': 'webhook', 'schedule': 'schedule', 'manual': 'manual',
      'error': 'error', 'slack': 'slack', 'telegram': 'telegram',
      'discord': 'discord', 'email': 'email', 'event': 'event',
    };

    if (triggerMap[triggerType]) {
      const tag = this.createTag(workflow.id, 'trigger', triggerMap[triggerType], 0.95);
      tags.push(tag);
      allTags.add(triggerMap[triggerType]);
      primaryTags.push(triggerMap[triggerType]);
    }

    // Complexity tags
    const complexity = workflow.classification?.complexity || 'beginner';
    const tag = this.createTag(workflow.id, 'complexity', complexity, 0.9);
    tags.push(tag);
    allTags.add(complexity);

    // Industry tags
    for (const [industry, patterns] of Object.entries(INDUSTRY_TAGS)) {
      let matchScore = 0;
      for (const p of patterns) {
        if (text.includes(p.toLowerCase())) matchScore += 1;
      }
      if (matchScore > 0) {
        const confidence = Math.min(matchScore / 5, 0.8);
        const indTag = this.createTag(workflow.id, 'industry', industry, confidence * 0.6);
        tags.push(indTag);
        allTags.add(industry);
      }
    }

    return {
      tags: this.sortAndLimitTags(tags),
      all_tags: Array.from(allTags).slice(0, this.maxTags),
      primary_tags: primaryTags.slice(0, 5),
      secondary_tags: secondaryTags.slice(0, 10),
    };
  }

  async generateTagsForWorkflows(workflows: {
    id: string;
    name: string;
    description: string;
    nodes: any[];
    structure: any;
    metadata: any;
    classification?: { category: string; complexity: string; confidence: number };
  }[]): Promise<WorkflowTag[]> {
    const allTags: WorkflowTag[] = [];
    for (const workflow of workflows) {
      const result = this.generateTags(workflow);
      allTags.push(...result.tags);
    }
    return allTags;
  }

  private createTag(workflowId: string, tagType: WorkflowTag['tag_type'], tagValue: string, confidence: number): WorkflowTag {
    return {
      id: `tag_${randomUUID()}`,
      workflow_id: workflowId,
      tag_type: tagType,
      tag_value: tagValue,
      weight: confidence,
      source: 'automatic',
      confidence,
      created_at: new Date().toISOString(),
    };
  }

  private sortAndLimitTags(tags: WorkflowTag[]): WorkflowTag[] {
    const sorted = tags.sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight));
    const typeLimits: Record<string, number> = { integration: 10, pattern: 5, use_case: 5, trigger: 3, complexity: 3, industry: 3 };
    const limited: WorkflowTag[] = [];
    const typeCount: Record<string, number> = {};

    for (const tag of sorted) {
      const type = tag.tag_type;
      const currentCount = typeCount[type] || 0;
      if (currentCount < (typeLimits[type] || 5)) {
        limited.push(tag);
        typeCount[type] = currentCount + 1;
      }
    }
    return limited;
  }
}

export function createTagger(options?: { minConfidence?: number; maxTags?: number }): WorkflowTagger {
  return new WorkflowTagger(options);
}
