/**
 * n8n Workflow Classification Engine
 * 
 * Classifies workflows into categories and assesses complexity.
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface WorkflowClassification {
  id: string;
  workflow_id: string;
  category: string;
  subcategory?: string;
  complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidence: number;
  classification_criteria: ClassificationCriteria;
  classified_at: string;
}

export interface ClassificationCriteria {
  matched_keywords: string[];
  matched_nodes: string[];
  matched_patterns: string[];
  integration_types: string[];
  trigger_types: string[];
  structure_score: number;
  node_diversity_score: number;
}

// ============================================================================
// Category Definitions
// ============================================================================

const CATEGORIES: Record<string, {
  keywords: string[];
  node_patterns: string[];
  trigger_patterns: string[];
}> = {
  'Data Synchronization': {
    keywords: ['sync', 'synchronization', 'import', 'export', 'transfer', 'migrate', 'backup'],
    node_patterns: ['googleSheets', 'airtable', 'postgres', 'mysql', 'mongodb', 'redis'],
    trigger_patterns: ['schedule', 'webhook'],
  },
  'Marketing Automation': {
    keywords: ['marketing', 'campaign', 'email', 'social', 'content', 'advertising', 'promotion'],
    node_patterns: ['mailchimp', 'sendgrid', 'hubspot', 'slack', 'discord'],
    trigger_patterns: ['schedule', 'webhook'],
  },
  'Customer Support': {
    keywords: ['support', 'ticket', 'chat', 'helpdesk', 'service', 'response'],
    node_patterns: ['zendesk', 'slack', 'email', 'telegram', 'discord'],
    trigger_patterns: ['webhook', 'email'],
  },
  'Content Management': {
    keywords: ['content', 'cms', 'blog', 'article', 'publish', 'wordpress', 'notion'],
    node_patterns: ['notion', 'httpRequest'],
    trigger_patterns: ['schedule', 'webhook'],
  },
  'E-commerce Operations': {
    keywords: ['order', 'payment', 'checkout', 'product', 'inventory', 'stripe', 'sales'],
    node_patterns: ['stripe', 'httpRequest'],
    trigger_patterns: ['webhook', 'schedule'],
  },
  'DevOps & Monitoring': {
    keywords: ['deploy', 'monitor', 'alert', 'log', 'git', 'github', 'docker', 'error'],
    node_patterns: ['github', 'httpRequest', 'slack', 'discord'],
    trigger_patterns: ['schedule', 'webhook', 'error'],
  },
  'Reporting & Analytics': {
    keywords: ['report', 'analytics', 'dashboard', 'metric', 'kpi', 'data', 'visualization'],
    node_patterns: ['googleSheets', 'httpRequest', 'postgres', 'mysql'],
    trigger_patterns: ['schedule'],
  },
  'Lead Generation & CRM': {
    keywords: ['lead', 'crm', 'prospect', 'contact', 'pipeline', 'salesforce', 'hubspot', 'conversion'],
    node_patterns: ['hubspot', 'salesforce', 'airtable', 'googleSheets'],
    trigger_patterns: ['webhook', 'form'],
  },
  'Notification Systems': {
    keywords: ['notification', 'alert', 'message', 'sms', 'push', 'reminder', 'announcement'],
    node_patterns: ['slack', 'discord', 'email', 'twilio', 'telegram'],
    trigger_patterns: ['webhook', 'schedule', 'error'],
  },
  'Document Processing': {
    keywords: ['document', 'pdf', 'ocr', 'extract', 'convert', 'file', 'download'],
    node_patterns: ['httpRequest', 'dropbox', 'googleDrive'],
    trigger_patterns: ['webhook', 'schedule'],
  },
};

// ============================================================================
// Complexity Thresholds
// ============================================================================

const COMPLEXITY_THRESHOLDS = {
  beginner: { score: 10 },
  intermediate: { score: 30 },
  advanced: { score: 60 },
  expert: { score: 100 },
};

// ============================================================================
// Main Classifier Class
// ============================================================================

export class WorkflowClassifier {
  classify(workflow: {
    id: string;
    name: string;
    description: string;
    nodes: any[];
    structure: any;
    metadata: any;
  }): WorkflowClassification {
    const criteria = this.analyzeWorkflow(workflow);
    const category = this.determineCategory(criteria);
    const complexity = this.assessComplexity(workflow);
    const confidence = this.calculateConfidence(criteria, category);

    return {
      id: `clsf_${randomUUID()}`,
      workflow_id: workflow.id,
      category,
      complexity,
      confidence,
      classification_criteria: criteria,
      classified_at: new Date().toISOString(),
    };
  }

  async classifyWorkflows(workflows: {
    id: string;
    name: string;
    description: string;
    nodes: any[];
    structure: any;
    metadata: any;
  }[]): Promise<WorkflowClassification[]> {
    return workflows.map(workflow => this.classify(workflow));
  }

  // ============================================================================
  // Workflow Analysis
  // ============================================================================

  private analyzeWorkflow(workflow: { name: string; description: string; nodes: any[]; metadata: any; structure?: any }): ClassificationCriteria {
    const text = `${workflow.name} ${workflow.description}`.toLowerCase();
    const nodeTypes = workflow.nodes.map((n: any) => n.type?.toLowerCase() || '');
    const integrations = workflow.metadata?.integrations || [];
    const triggers = workflow.metadata?.triggers || [];

    const matched_keywords: string[] = [];
    const matched_nodes: string[] = [];
    const matched_patterns: string[] = [];

    for (const [category, config] of Object.entries(CATEGORIES)) {
      for (const keyword of config.keywords) {
        if (text.includes(keyword.toLowerCase())) matched_keywords.push(keyword);
      }
    }

    for (const nodeType of nodeTypes) {
      for (const [category, config] of Object.entries(CATEGORIES)) {
        for (const pattern of config.node_patterns) {
          if (nodeType.includes(pattern.toLowerCase())) {
            matched_nodes.push(pattern);
            matched_patterns.push(category);
          }
        }
      }
    }

    const structure_score = this.calculateStructureScore({ nodes: workflow.nodes, structure: workflow.structure });
    const node_diversity_score = this.calculateNodeDiversity(nodeTypes);

    return {
      matched_keywords: [...new Set(matched_keywords)],
      matched_nodes: [...new Set(matched_nodes)],
      matched_patterns: [...new Set(matched_patterns)],
      integration_types: integrations,
      trigger_types: triggers,
      structure_score,
      node_diversity_score,
    };
  }

  private determineCategory(criteria: ClassificationCriteria): string {
    const scores: Record<string, number> = {};
    for (const category of Object.keys(CATEGORIES)) scores[category] = 0;

    for (const [category, config] of Object.entries(CATEGORIES)) {
      const categoryKeywords = config.keywords || [];
      for (const keyword of categoryKeywords) {
        if (criteria.matched_keywords.includes(keyword)) {
          scores[category] = (scores[category] || 0) + 2;
        }
      }
    }

    for (const [category, config] of Object.entries(CATEGORIES)) {
      const categoryPatterns = config.node_patterns || [];
      for (const pattern of categoryPatterns) {
        if (criteria.matched_nodes.includes(pattern)) {
          scores[category] = (scores[category] || 0) + 3;
        }
      }
    }

    let maxScore = 0;
    let bestCategory = 'Data Synchronization';
    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }
    return bestCategory;
  }

  // ============================================================================
  // Complexity Assessment
  // ============================================================================

  private assessComplexity(workflow: { nodes: any[]; metadata: any; structure: any }): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    let complexity = workflow.structure?.complexity_score || 0;
    const uniqueNodeTypes = new Set(workflow.nodes.map((n: any) => n.type)).size;
    complexity += uniqueNodeTypes * 2;
    complexity += (workflow.metadata?.integrations?.length || 0) * 3;
    if (workflow.structure?.has_conditional) complexity += 5;
    if (workflow.structure?.has_loop) complexity += 10;
    if (workflow.structure?.has_error_handler) complexity += 3;

    if (complexity < COMPLEXITY_THRESHOLDS.beginner.score) return 'beginner';
    if (complexity < COMPLEXITY_THRESHOLDS.intermediate.score) return 'intermediate';
    if (complexity < COMPLEXITY_THRESHOLDS.advanced.score) return 'advanced';
    return 'expert';
  }

  private calculateConfidence(criteria: ClassificationCriteria, category: string): number {
    const categoryConfig = CATEGORIES[category];
    if (!categoryConfig) return 0.5;

    let confidence = 0.5;
    const keywordMatchCount = criteria.matched_keywords.filter(k => categoryConfig.keywords.includes(k)).length;
    confidence += Math.min(keywordMatchCount * 0.1, 0.2);
    const nodeMatchCount = criteria.matched_nodes.filter(n => categoryConfig.node_patterns.includes(n)).length;
    confidence += Math.min(nodeMatchCount * 0.15, 0.3);
    if (keywordMatchCount === 0 && nodeMatchCount === 0) confidence = 0.3;

    return Math.round(confidence * 100) / 100;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateStructureScore(workflow: { nodes: any[]; structure: any }): number {
    let score = workflow.nodes.length;
    const connectionCount = workflow.structure?.connection_count || 0;
    if (workflow.nodes.length > 0) score += (connectionCount / workflow.nodes.length) * 5;
    if (workflow.structure?.has_conditional) score += 5;
    if (workflow.structure?.has_loop) score += 10;
    if (workflow.structure?.has_error_handler) score += 3;
    return score;
  }

  private calculateNodeDiversity(nodeTypes: string[]): number {
    if (nodeTypes.length === 0) return 0;
    const uniqueTypes = new Set(nodeTypes);
    return (uniqueTypes.size / nodeTypes.length) * 100;
  }
}

export function createClassifier(): WorkflowClassifier {
  return new WorkflowClassifier();
}
