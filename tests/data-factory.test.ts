/**
 * Unit tests for Data Factory modules
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowCleaner, createCleaner } from '../src/data-factory/cleaner';
import { WorkflowClassifier, createClassifier } from '../src/data-factory/classifier';
import { N8nCommunityCollector, GitHubCollector, WorkflowCollector, createCollector } from '../src/data-factory/collector';

// ============================================================================
// Cleaner Tests
// ============================================================================

describe('WorkflowCleaner', () => {
  let cleaner: WorkflowCleaner;

  beforeEach(() => {
    cleaner = createCleaner();
  });

  describe('cleanWorkflow', () => {
    it('should clean a valid workflow', async () => {
      const workflow = {
        id: 'test_123',
        name: 'Test Workflow',
        description: 'A test workflow for email notifications',
        workflow_json: JSON.stringify({
          name: 'Test Workflow',
          nodes: [
            { id: '1', name: 'On Email', type: 'n8n-nodes-base.email', position: [100, 200], parameters: {} },
            { id: '2', name: 'Send Slack', type: 'n8n-nodes-base.slack', position: [300, 200], parameters: {} },
          ],
          connections: {},
        }),
        nodes_json: JSON.stringify([
          { id: '1', name: 'On Email', type: 'n8n-nodes-base.email', position: [100, 200], parameters: {} },
          { id: '2', name: 'Send Slack', type: 'n8n-nodes-base.slack', position: [300, 200], parameters: {} },
        ]),
        connections_json: '{}',
        source: 'local' as const,
      };

      const result = await cleaner.cleanWorkflow(workflow);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.original_id).toBe('test_123');
      expect(result.name).toBe('Test Workflow');
      expect(result.nodes).toHaveLength(2);
      expect(result.structure.node_count).toBe(2);
      expect(result.validation.is_valid).toBe(true);
    });

    it('should remove sensitive data from credentials', async () => {
      const workflow = {
        id: 'test_456',
        name: 'Secure Workflow',
        description: 'A workflow with credentials',
        workflow_json: JSON.stringify({
          name: 'Secure Workflow',
          nodes: [
            {
              id: '1',
              name: 'HTTP Request',
              type: 'n8n-nodes-base.httpRequest',
              position: [100, 200],
              parameters: {
                authentication: 'credential',
                apiKey: 'secret-api-key-12345',
                bearerToken: 'Bearer secret-token',
              },
            },
          ],
          connections: {},
        }),
        nodes_json: JSON.stringify([
          {
            id: '1',
            name: 'HTTP Request',
            type: 'n8n-nodes-base.httpRequest',
            position: [100, 200],
            parameters: {
              authentication: 'credential',
              apiKey: 'secret-api-key-12345',
              bearerToken: 'Bearer secret-token',
            },
          },
        ]),
        connections_json: '{}',
        source: 'local' as const,
      };

      const result = await cleaner.cleanWorkflow(workflow);

      expect(result).toBeDefined();
      expect(result.nodes[0].parameters.apiKey).toBe('[REDACTED]');
      expect(result.nodes[0].parameters.bearerToken).toBe('[REDACTED]');
    });

    it('should handle invalid JSON gracefully', async () => {
      const workflow = {
        id: 'test_789',
        name: 'Invalid Workflow',
        description: 'A workflow with invalid JSON',
        workflow_json: 'invalid json',
        nodes_json: 'invalid json',
        connections_json: 'invalid json',
        source: 'local' as const,
      };

      const result = await cleaner.cleanWorkflow(workflow);

      expect(result).toBeDefined();
      expect(result.nodes).toHaveLength(0);
      expect(result.validation.is_valid).toBe(true);
    });
  });
});

// ============================================================================
// Classifier Tests
// ============================================================================

describe('WorkflowClassifier', () => {
  let classifier: WorkflowClassifier;

  beforeEach(() => {
    classifier = createClassifier();
  });

  describe('classify', () => {
    it('should classify a marketing workflow', () => {
      const workflow = {
        id: 'wf_123',
        name: 'Email Marketing Campaign',
        description: 'Send marketing emails to subscribers',
        nodes: [
          { type: 'schedule' },
          { type: 'mailchimp' },
          { type: 'sendgrid' },
        ],
        structure: { complexity_score: 5 },
        metadata: { integrations: ['mailchimp', 'sendgrid'], triggers: ['schedule'] },
      };

      const result = classifier.classify(workflow);

      expect(result).toBeDefined();
      expect(result.workflow_id).toBe('wf_123');
      expect(result.category).toBe('Marketing Automation');
      expect(result.complexity).toBe('intermediate');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.classification_criteria.matched_keywords.length).toBeGreaterThan(0);
    });

    it('should classify a devops workflow', () => {
      const workflow = {
        id: 'wf_456',
        name: 'GitHub Deploy',
        description: 'Deploy on GitHub push events',
        nodes: [
          { type: 'github' },
          { type: 'httpRequest' },
          { type: 'slack' },
        ],
        structure: { complexity_score: 25 },
        metadata: { integrations: ['github', 'slack'], triggers: ['github'] },
      };

      const result = classifier.classify(workflow);

      expect(result).toBeDefined();
      expect(result.category).toBe('DevOps & Monitoring');
    });

    it('should assess complexity correctly', () => {
      const beginnerWorkflow = {
        id: 'wf_beginner',
        name: 'Simple Schedule',
        description: 'A simple scheduled workflow',
        nodes: [{ type: 'schedule' }],
        structure: { complexity_score: 3 },
        metadata: { integrations: ['email'], triggers: ['schedule'] },
      };

      const expertWorkflow = {
        id: 'wf_expert',
        name: 'Complex Pipeline',
        description: 'A complex multi-step workflow with error handling',
        nodes: [
          { type: 'webhook' },
          { type: 'postgres' },
          { type: 'mongodb' },
          { type: 'httpRequest' },
          { type: 'if' },
          { type: 'errorTrigger' },
        ],
        structure: { complexity_score: 80, has_conditional: true, has_error_handler: true },
        metadata: { integrations: ['postgres', 'mongodb'], triggers: ['webhook'] },
      };

      const beginnerResult = classifier.classify(beginnerWorkflow);
      const expertResult = classifier.classify(expertWorkflow);

      expect(beginnerResult.complexity).toBe('beginner');
      expect(expertResult.complexity).toBe('expert');
    });
  });

  describe('classifyWorkflows', () => {
    it('should classify multiple workflows', async () => {
      const workflows = [
        {
          id: 'wf_1',
          name: 'Workflow 1',
          description: 'First workflow',
          nodes: [{ type: 'schedule' }],
          structure: { complexity_score: 5 },
          metadata: {},
        },
        {
          id: 'wf_2',
          name: 'Workflow 2',
          description: 'Second workflow',
          nodes: [{ type: 'webhook' }],
          structure: { complexity_score: 5 },
          metadata: {},
        },
      ];

      const results = await classifier.classifyWorkflows(workflows);

      expect(results).toHaveLength(2);
      expect(results[0].workflow_id).toBe('wf_1');
      expect(results[1].workflow_id).toBe('wf_2');
    });
  });
});

// ============================================================================
// Collector Tests
// ============================================================================

describe('WorkflowCollector', () => {
  let collector: WorkflowCollector;

  beforeEach(() => {
    collector = createCollector();
  });

  describe('createCollector', () => {
    it('should create a collector instance', () => {
      expect(collector).toBeDefined();
      expect(collector.collectAll).toBeDefined();
    });
  });

  describe('N8nCommunityCollector', () => {
    let communityCollector: N8nCommunityCollector;

    beforeEach(() => {
      communityCollector = new N8nCommunityCollector();
    });

    it('should create an instance', () => {
      expect(communityCollector).toBeDefined();
    });
  });

  describe('GitHubCollector', () => {
    let githubCollector: GitHubCollector;

    beforeEach(() => {
      githubCollector = new GitHubCollector();
    });

    it('should create an instance', () => {
      expect(githubCollector).toBeDefined();
    });
  });
});
