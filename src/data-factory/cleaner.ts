/**
 * n8n Workflow Data Cleaner
 * 
 * Cleans and normalizes n8n workflow templates.
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface CleanedWorkflow {
  id: string;
  original_id: string;
  name: string;
  description: string;
  nodes: NormalizedNode[];
  connections: NormalizedConnection[];
  structure: WorkflowStructure;
  metadata: CleanedMetadata;
  validation: ValidationResult;
  cleaned_at: string;
}

export interface NormalizedNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  disabled?: boolean;
  notes?: string;
  continueOnFail?: boolean;
}

export interface NormalizedConnection {
  node: string;
  type: string;
  color?: string;
  label?: string;
}

export interface WorkflowStructure {
  trigger_type: string;
  trigger_name?: string;
  node_count: number;
  connection_count: number;
  has_error_handler: boolean;
  has_conditional: boolean;
  has_loop: boolean;
  complexity_score: number;
}

export interface CleanedMetadata {
  integrations: string[];
  triggers: string[];
  patterns: string[];
  categories: string[];
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// Credential Patterns
// ============================================================================

const CREDENTIAL_PATTERNS = [
  /credential/i, /api[_-]?key/i, /auth[_-]?token/i, /bearer[_-]?token/i,
  /secret/i, /password/i, /access[_-]?token/i, /refresh[_-]?token/i,
  /client[_-]?secret/i, /private[_-]?key/i, /oauth_/i,
];

const NODE_TYPE_NORMALIZATIONS: Record<string, string> = {
  'n8n-nodes-base.httpRequest': 'httpRequest',
  'n8n-nodes-base.webhook': 'webhook',
  'n8n-nodes-base.schedule': 'schedule',
  'n8n-nodes-base.errorTrigger': 'errorTrigger',
  'n8n-nodes-base.noOp': 'noOp',
  'n8n-nodes-base.set': 'set',
  'n8n-nodes-base.slack': 'slack',
  'n8n-nodes-base.googleSheets': 'googleSheets',
  'n8n-nodes-base.airtable': 'airtable',
  'n8n-nodes-base.discord': 'discord',
  'n8n-nodes-base.github': 'github',
  'n8n-nodes-base.postgres': 'postgres',
  'n8n-nodes-base.mysql': 'mysql',
  'n8n-nodes-base.mongodb': 'mongodb',
  'n8n-nodes-base.notion': 'notion',
  'n8n-nodes-base.email': 'email',
  'n8n-nodes-base.function': 'function',
  'n8n-nodes-base.code': 'code',
};

// ============================================================================
// Main Cleaner Class
// ============================================================================

export class WorkflowCleaner {
  async cleanWorkflow(workflow: {
    id: string;
    name: string;
    description: string;
    workflow_json: string;
    nodes_json: string;
    connections_json?: string;
    source: string;
  }): Promise<CleanedWorkflow> {
    let workflowData: any = {};
    try {
      workflowData = JSON.parse(workflow.workflow_json);
    } catch {
      workflowData = { nodes: [], connections: {} };
    }

    let nodes: any[] = [];
    try {
      nodes = JSON.parse(workflow.nodes_json);
    } catch {
      nodes = workflowData.nodes || [];
    }

    let connections: any = {};
    try {
      connections = workflow.connections_json ? JSON.parse(workflow.connections_json) : {};
    } catch {
      connections = workflowData.connections || {};
    }

    const normalizedNodes = this.normalizeNodes(nodes);
    const structure = this.extractStructure(normalizedNodes, connections);
    const cleanedNodes = this.removeSensitiveData(normalizedNodes);
    const metadata = this.extractMetadata(cleanedNodes, structure);
    const validation = this.validateWorkflow(cleanedNodes, connections);

    return {
      id: `cleaned_${randomUUID()}`,
      original_id: workflow.id,
      name: this.cleanText(workflow.name),
      description: this.cleanText(workflow.description),
      nodes: cleanedNodes,
      connections: this.normalizeConnections(connections),
      structure,
      metadata,
      validation,
      cleaned_at: new Date().toISOString(),
    };
  }

  async cleanWorkflows(workflows: {
    id: string;
    name: string;
    description: string;
    workflow_json: string;
    nodes_json: string;
    connections_json?: string;
    source: string;
  }[]): Promise<CleanedWorkflow[]> {
    const cleaned: CleanedWorkflow[] = [];
    for (const wf of workflows) {
      try {
        const cleanedWf = await this.cleanWorkflow(wf);
        if (cleanedWf.validation.is_valid) {
          cleaned.push(cleanedWf);
        }
      } catch (error) {
        console.error(`Error cleaning workflow ${wf.id}:`, error);
      }
    }
    return cleaned;
  }

  // ============================================================================
  // Node Normalization
  // ============================================================================

  private normalizeNodes(nodes: any[]): NormalizedNode[] {
    return nodes.map((node: any, index: number) => {
      const type = this.normalizeNodeType(node.type);
      return {
        id: node.id || `node_${index}`,
        name: this.normalizeNodeName(node.name, type),
        type: type,
        typeVersion: node.typeVersion,
        position: this.normalizePosition(node.position),
        parameters: node.parameters || {},
        disabled: node.disabled || false,
        notes: node.notes,
        continueOnFail: node.continueOnFail,
      };
    });
  }

  private normalizeNodeType(type: string): string {
    if (!type) return 'unknown';
    if (NODE_TYPE_NORMALIZATIONS[type]) return NODE_TYPE_NORMALIZATIONS[type];
    const parts = type.split('.');
    const baseType = parts[parts.length - 1];
    return baseType ? baseType.toLowerCase() : 'unknown';
  }

  private normalizeNodeName(name: string, type: string): string {
    if (!name) return `${type.charAt(0).toUpperCase() + type.slice(1)} ${Math.floor(Math.random() * 1000)}`;
    return name.replace(/[^a-zA-Z0-9\s_-]/g, '').trim() || `${type.charAt(0).toUpperCase() + type.slice(1)}`;
  }

  private normalizePosition(position: any): [number, number] {
    if (!position || !Array.isArray(position)) return [0, 0];
    return [parseFloat(position[0]) || 0, parseFloat(position[1]) || 0];
  }

  // ============================================================================
  // Sensitive Data Removal
  // ============================================================================

  private removeSensitiveData(nodes: NormalizedNode[]): NormalizedNode[] {
    return nodes.map(node => ({
      ...node,
      parameters: this.sanitizeParameters(node.parameters),
    }));
  }

  private sanitizeParameters(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      const isCredential = CREDENTIAL_PATTERNS.some(pattern => pattern.test(key));
      if (isCredential) {
        sanitized[key] = typeof value === 'string' ? '[REDACTED]' : null;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeParameters(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // ============================================================================
  // Structure Extraction
  // ============================================================================

  private extractStructure(nodes: NormalizedNode[], connections: any): WorkflowStructure {
    const triggerNode = nodes.find(n => this.isTriggerNode(n));
    const errorNodes = nodes.filter(n => this.isErrorNode(n));
    const conditionalNodes = nodes.filter(n => this.isConditionalNode(n));

    return {
      trigger_type: triggerNode ? this.getTriggerType(triggerNode) : 'unknown',
      trigger_name: triggerNode?.name,
      node_count: nodes.length,
      connection_count: this.countConnections(connections),
      has_error_handler: errorNodes.length > 0,
      has_conditional: conditionalNodes.length > 0,
      has_loop: false,
      complexity_score: this.calculateComplexity(nodes, connections),
    };
  }

  private isTriggerNode(node: NormalizedNode): boolean {
    const triggerTypes = ['webhook', 'schedule', 'manualTrigger', 'errorTrigger'];
    return triggerTypes.includes(node.type) || node.type.includes('trigger');
  }

  private isErrorNode(node: NormalizedNode): boolean {
    return node.type === 'errorTrigger' || node.continueOnFail || node.type.includes('error');
  }

  private isConditionalNode(node: NormalizedNode): boolean {
    const conditionalTypes = ['if', 'switch', 'filter', 'condition'];
    return conditionalTypes.includes(node.type) || node.type.includes('if');
  }

  private getTriggerType(node: NormalizedNode): string {
    const type = node.type.toLowerCase();
    if (type.includes('webhook')) return 'webhook';
    if (type.includes('schedule') || type.includes('cron')) return 'schedule';
    if (type.includes('manual')) return 'manual';
    if (type.includes('error')) return 'error';
    if (type.includes('slack')) return 'slack';
    if (type.includes('telegram')) return 'telegram';
    if (type.includes('discord')) return 'discord';
    if (type.includes('email')) return 'email';
    return 'event';
  }

  private countConnections(connections: any): number {
    let count = 0;
    if (typeof connections !== 'object' || connections === null) return 0;
    for (const sources of Object.values(connections as Record<string, any>)) {
      if (Array.isArray(sources)) {
        count += sources.flat().length;
      }
    }
    return count;
  }

  private calculateComplexity(nodes: NormalizedNode[], connections: any): number {
    let score = nodes.length * 1;
    const complexNodes = ['httpRequest', 'code', 'function', 'webhook'];
    for (const node of nodes) {
      if (complexNodes.includes(node.type)) score += 2;
    }
    score += this.countConnections(connections) * 0.5;
    return Math.round(score * 10) / 10;
  }

  // ============================================================================
  // Metadata Extraction
  // ============================================================================

  private extractMetadata(nodes: NormalizedNode[], structure: WorkflowStructure): CleanedMetadata {
    const integrations = new Set<string>();
    const triggers = new Set<string>();
    const patterns = new Set<string>();
    const categories = new Set<string>();

    for (const node of nodes) {
      const integration = this.extractIntegration(node.type);
      if (integration) integrations.add(integration);
      if (this.isTriggerNode(node)) {
        triggers.add(structure.trigger_type);
        patterns.add(`${structure.trigger_type}_trigger`);
      }
      if (this.isConditionalNode(node)) patterns.add('conditional');
      if (this.isErrorNode(node)) patterns.add('error_handling');
      if (node.type === 'httpRequest') patterns.add('api_call');
    }

    if (triggers.has('schedule')) categories.add('automation');
    if (integrations.size > 3) categories.add('multi_step');
    if (structure.has_error_handler) categories.add('production_ready');

    return {
      integrations: Array.from(integrations),
      triggers: Array.from(triggers),
      patterns: Array.from(patterns),
      categories: Array.from(categories),
    };
  }

  private extractIntegration(nodeType: string): string | null {
    const integrationMap: Record<string, string> = {
      'slack': 'slack', 'googleSheets': 'google-sheets', 'airtable': 'airtable',
      'github': 'github', 'discord': 'discord', 'postgres': 'postgresql',
      'mysql': 'mysql', 'mongodb': 'mongodb', 'redis': 'redis',
      'notion': 'notion', 'hubspot': 'hubspot', 'salesforce': 'salesforce',
      'stripe': 'stripe', 'twilio': 'twilio', 'sendgrid': 'sendgrid',
      'mailchimp': 'mailchimp', 'zendesk': 'zendesk', 'jira': 'jira',
      'dropbox': 'dropbox', 'googleDrive': 'google-drive', 'email': 'email',
    };
    return integrationMap[nodeType] || null;
  }

  // ============================================================================
  // Validation
  // ============================================================================

  private validateWorkflow(_nodes: NormalizedNode[], _connections: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    return { is_valid: true, errors, warnings, suggestions };
  }

  // ============================================================================
  // Connection Normalization
  // ============================================================================

  private normalizeConnections(connections: any): NormalizedConnection[] {
    const normalized: NormalizedConnection[] = [];
    if (typeof connections !== 'object' || connections === null) return normalized;

    for (const [node, types] of Object.entries(connections as Record<string, any>)) {
      if (Array.isArray(types)) {
        for (const typeObj of types) {
          if (typeObj && typeof typeObj === 'object') {
            normalized.push({ node: node as string, type: typeObj.type || 'main', color: typeObj.color, label: typeObj.label });
          }
        }
      }
    }
    return normalized;
  }

  // ============================================================================
  // Text Cleaning
  // ============================================================================

  private cleanText(text: string): string {
    if (!text) return '';
    let cleaned = text.replace(/<[^>]*>/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (cleaned.length > 2000) cleaned = cleaned.substring(0, 1997) + '...';
    return cleaned;
  }
}

export function createCleaner(): WorkflowCleaner {
  return new WorkflowCleaner();
}
