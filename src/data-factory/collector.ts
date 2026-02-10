/**
 * n8n Workflow Collector
 * 
 * Collects n8n workflow templates from multiple sources.
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  workflow_json: string;
  nodes_json: string;
  connections_json?: string;
  source: 'community' | 'github' | 'local' | 'custom';
  url?: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export interface CollectorOptions {
  maxWorkflows?: number;
  source?: 'community' | 'github' | 'local' | 'all';
  includeCredentials?: boolean;
}

// ============================================================================
// n8n Community API Collector
// ============================================================================

export class N8nCommunityCollector {
  private baseUrl = 'https://api.n8n.io';
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async fetchAllWorkflows(options: CollectorOptions = {}): Promise<WorkflowTemplate[]> {
    const workflows: WorkflowTemplate[] = [];
    let offset = 0;
    const limit = 50;
    const maxWorkflows = options.maxWorkflows || 1000;

    while (workflows.length < maxWorkflows) {
      const batch = await this.fetchWorkflowsBatch(offset, limit);
      if (batch.length === 0) break;
      workflows.push(...batch);
      offset += limit;
      if (workflows.length >= maxWorkflows) break;
    }

    return workflows.slice(0, maxWorkflows);
  }

  private async fetchWorkflowsBatch(offset: number, limit: number): Promise<WorkflowTemplate[]> {
    try {
      const url = `${this.baseUrl}/api/v1/workflows?offset=${offset}&limit=${limit}`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        console.error(`Failed to fetch workflows: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const responseData = data as Record<string, unknown>;
      const workflowsData = (Array.isArray(responseData?.data) ? responseData.data : []) as any[];
      return this.transformWorkflows(workflowsData);
    } catch (error) {
      console.error('Error fetching n8n community workflows:', error);
      return [];
    }
  }

  private transformWorkflows(apiWorkflows: any[]): WorkflowTemplate[] {
    return apiWorkflows.map((wf: any) => ({
      id: `n8n_${wf.id || randomUUID()}`,
      name: wf.name || 'Untitled Workflow',
      description: wf.description || '',
      workflow_json: JSON.stringify(wf),
      nodes_json: JSON.stringify(wf.nodes || []),
      connections_json: JSON.stringify(wf.connections || {}),
      source: 'community' as const,
      url: wf.url || `https://n8n.io/workflows/${wf.id}`,
      author: wf.author?.name,
      created_at: wf.createdAt,
      updated_at: wf.updatedAt,
    }));
  }

  async fetchWorkflowById(id: string): Promise<WorkflowTemplate | null> {
    try {
      const url = `${this.baseUrl}/api/v1/workflows/${id}`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

      const response = await fetch(url, { headers });
      if (!response.ok) return null;

      const wf = await response.json();
      return this.transformWorkflows([wf])[0] || null;
    } catch (error) {
      console.error(`Error fetching workflow ${id}:`, error);
      return null;
    }
  }
}

// ============================================================================
// GitHub Repository Collector
// ============================================================================

export class GitHubCollector {
  private baseUrl = 'https://api.github.com';
  private token?: string;
  private org?: string;

  constructor(token?: string, org?: string) {
    this.token = token;
    this.org = org || 'n8n-io';
  }

  async fetchWorkflowTemplates(options: CollectorOptions = {}): Promise<WorkflowTemplate[]> {
    const workflows: WorkflowTemplate[] = [];
    const maxWorkflows = options.maxWorkflows || 500;

    try {
      const repos = await this.fetchRepositories();
      for (const repo of repos) {
        if (workflows.length >= maxWorkflows) break;
        const repoWorkflows = await this.fetchRepositoryWorkflows(repo, maxWorkflows - workflows.length);
        workflows.push(...repoWorkflows);
      }
      return workflows;
    } catch (error) {
      console.error('Error fetching GitHub workflows:', error);
      return [];
    }
  }

  private async fetchRepositories(): Promise<string[]> {
    const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
    if (this.token) headers['Authorization'] = `token ${this.token}`;

    try {
      const response = await fetch(`${this.baseUrl}/orgs/${this.org}/repos?per_page=100`, { headers });
      if (!response.ok) return ['workflow-templates'];
      const repos = await response.json();
      const reposList = Array.isArray(repos) ? repos : [];
      return reposList.map((r: any) => r.name);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      return ['workflow-templates'];
    }
  }

  private async fetchRepositoryWorkflows(repo: string, maxCount: number): Promise<WorkflowTemplate[]> {
    const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3.raw' };
    if (this.token) headers['Authorization'] = `token ${this.token}`;

    try {
      const response = await fetch(`${this.baseUrl}/repos/${this.org}/${repo}/contents?per_page=100`, { headers });
      if (!response.ok) return [];
      const files = await response.json();
      const filesList = Array.isArray(files) ? files : [];
      
      const workflowFiles = filesList
        .filter((f: any) => f.name?.endsWith('.json') && f.type === 'file')
        .slice(0, maxCount);

      const workflows: WorkflowTemplate[] = [];
      for (const file of workflowFiles) {
        try {
          const fileResponse = await fetch(file.download_url, { headers: { 'Accept': 'application/json' } });
          const wfData = await fileResponse.json();
          if (this.isValidN8nWorkflow(wfData)) {
            workflows.push(this.transformGitHubWorkflow(wfData, repo, file.download_url));
          }
        } catch (e) {
          console.error(`Error parsing workflow file ${file.name}:`, e);
        }
      }
      return workflows;
    } catch (error) {
      console.error(`Error fetching from repo ${repo}:`, error);
      return [];
    }
  }

  private isValidN8nWorkflow(data: any): boolean {
    return data && typeof data === 'object' && (data.nodes !== undefined || data.workflow !== undefined);
  }

  private transformGitHubWorkflow(wf: any, repo: string, url: string): WorkflowTemplate {
    const workflow = wf.workflow || wf;
    return {
      id: `gh_${randomUUID()}`,
      name: workflow.name || workflow.title || 'GitHub Workflow',
      description: workflow.description || `From ${repo}`,
      workflow_json: JSON.stringify(wf),
      nodes_json: JSON.stringify(workflow.nodes || []),
      connections_json: JSON.stringify(workflow.connections || {}),
      source: 'github' as const,
      url: url,
      author: repo,
      metadata: { repo, original_workflow: workflow },
    };
  }
}

// ============================================================================
// Local File Collector
// ============================================================================

export class LocalCollector {
  private basePath: string;

  constructor(basePath: string = './data/raw') {
    this.basePath = basePath;
  }

  async collectWorkflows(_options: CollectorOptions = {}): Promise<WorkflowTemplate[]> {
    console.log(`Local collector configured for: ${this.basePath}`);
    return [];
  }
}

// ============================================================================
// Unified Collector
// ============================================================================

export class WorkflowCollector {
  private communityCollector: N8nCommunityCollector;
  private githubCollector: GitHubCollector;
  private localCollector: LocalCollector;

  constructor() {
    this.communityCollector = new N8nCommunityCollector();
    this.githubCollector = new GitHubCollector();
    this.localCollector = new LocalCollector();
  }

  async collectAll(options: CollectorOptions = {}): Promise<WorkflowTemplate[]> {
    const allWorkflows: WorkflowTemplate[] = [];
    const source = options.source || 'all';

    if (source === 'all' || source === 'community') {
      console.log('Collecting from n8n community...');
      const communityWorkflows = await this.communityCollector.fetchAllWorkflows(options);
      console.log(`Collected ${communityWorkflows.length} community workflows`);
      allWorkflows.push(...communityWorkflows);
    }

    if (source === 'all' || source === 'github') {
      console.log('Collecting from GitHub...');
      const githubWorkflows = await this.githubCollector.fetchWorkflowTemplates(options);
      console.log(`Collected ${githubWorkflows.length} GitHub workflows`);
      allWorkflows.push(...githubWorkflows);
    }

    if (source === 'all' || source === 'local') {
      console.log('Collecting from local files...');
      const localWorkflows = await this.localCollector.collectWorkflows(options);
      console.log(`Collected ${localWorkflows.length} local workflows`);
      allWorkflows.push(...localWorkflows);
    }

    return this.removeDuplicates(allWorkflows);
  }

  private removeDuplicates(workflows: WorkflowTemplate[]): WorkflowTemplate[] {
    const seen = new Set<string>();
    const unique: WorkflowTemplate[] = [];

    for (const wf of workflows) {
      const jsonHash = this.hashWorkflow(wf.workflow_json);
      if (!seen.has(jsonHash)) {
        seen.add(jsonHash);
        unique.push(wf);
      }
    }

    return unique;
  }

  private hashWorkflow(workflowJson: string): string {
    let hash = 0;
    for (let i = 0; i < workflowJson.length; i++) {
      const char = workflowJson.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

export function createCollector(_options?: CollectorOptions): WorkflowCollector {
  return new WorkflowCollector();
}
