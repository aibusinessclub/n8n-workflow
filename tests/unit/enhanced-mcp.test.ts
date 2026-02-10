/**
 * Enhanced MCP System Tests
 * 
 * Tests for the advanced MCP features including ecosystem intelligence,
 * community insights, and enhanced workflow composition.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleEnhancedMcpTool, ENHANCED_TOOL_DEFINITIONS } from '../../src/mcp/enhanced-tools';

// Mock environment
const mockEnv = {
  LOG_LEVEL: 'info',
  // Add other required env vars as needed
} as any;

describe('Enhanced MCP Tools', () => {
  beforeEach(() => {
    // Reset any test state
  });

  describe('Tool Definitions', () => {
    it('should have all enhanced tools defined', () => {
      expect(ENHANCED_TOOL_DEFINITIONS).toHaveLength(10);
      
      const toolNames = ENHANCED_TOOL_DEFINITIONS.map(t => t.name);
      expect(toolNames).toContain('n8n_ecosystem_intelligence');
      expect(toolNames).toContain('workflow_feasibility_checker');
      expect(toolNames).toContain('community_pattern_analyzer');
      expect(toolNames).toContain('n8n_troubleshooting_expert');
      expect(toolNames).toContain('workflow_optimization_advisor');
      expect(toolNames).toContain('n8n_update_impact_analyzer');
      expect(toolNames).toContain('advanced_workflow_composer');
      expect(toolNames).toContain('n8n_community_insights');
      expect(toolNames).toContain('n8n_learning_pathway');
      expect(toolNames).toContain('n8n_integration_expert');
    });

    it('should have proper input schemas for all tools', () => {
      ENHANCED_TOOL_DEFINITIONS.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe('n8n_ecosystem_intelligence', () => {
    it('should provide comprehensive ecosystem intelligence', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'n8n_ecosystem_intelligence', {
        query: 'Slack node capabilities',
        category: 'nodes',
        version: '1.0'
      });

      expect(result).toHaveProperty('results');
      expect(result.results).toHaveProperty('node_capabilities');
      expect(result.results).toHaveProperty('compatibility_matrix');
      expect(result.results).toHaveProperty('community_insights');
      expect(result).toHaveProperty('recommendations');
    });

    it('should handle different categories', async () => {
      const categories = ['nodes', 'integrations', 'patterns', 'troubleshooting', 'best-practices'];
      
      for (const category of categories) {
        const result = await handleEnhancedMcpTool(mockEnv, 'n8n_ecosystem_intelligence', {
          query: 'test query',
          category
        });

        expect(result.category).toBe(category);
      }
    });
  });

  describe('workflow_feasibility_checker', () => {
    it('should analyze workflow feasibility', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'workflow_feasibility_checker', {
        workflow_description: 'Sync Salesforce contacts to Slack when new leads are created',
        required_integrations: ['Salesforce', 'Slack'],
        complexity_preference: 'intermediate'
      });

      expect(result).toHaveProperty('analysis');
      expect(result.analysis).toHaveProperty('feasibility_score');
      expect(result.analysis).toHaveProperty('confidence');
      expect(result.analysis).toHaveProperty('estimated_complexity');
      expect(result).toHaveProperty('node_analysis');
      expect(result).toHaveProperty('potential_challenges');
      expect(result).toHaveProperty('recommendations');

      expect(result.analysis.feasibility_score).toBeGreaterThan(0);
      expect(result.analysis.feasibility_score).toBeLessThanOrEqual(1);
    });

    it('should identify missing integrations', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'workflow_feasibility_checker', {
        workflow_description: 'Integrate with obscure ERP system',
        required_integrations: ['ObscureERP', 'AnotherObscureSystem']
      });

      expect(result.node_analysis.missing_nodes.length).toBeGreaterThan(0);
      expect(result.node_analysis.alternative_approaches.length).toBeGreaterThan(0);
    });
  });

  describe('community_pattern_analyzer', () => {
    it('should analyze community patterns', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'community_pattern_analyzer', {
        use_case: 'Lead generation and nurturing',
        industry: 'SaaS',
        scale: 'medium'
      });

      expect(result).toHaveProperty('analysis');
      expect(result.analysis).toHaveProperty('total_similar_workflows');
      expect(result.analysis).toHaveProperty('success_rate');
      expect(result).toHaveProperty('top_patterns');
      expect(result).toHaveProperty('anti_patterns');
      expect(result).toHaveProperty('optimization_opportunities');

      expect(result.top_patterns).toBeInstanceOf(Array);
      expect(result.anti_patterns).toBeInstanceOf(Array);
    });

    it('should provide different insights for different scales', async () => {
      const scales = ['small', 'medium', 'enterprise'];
      const results = [];

      for (const scale of scales) {
        const result = await handleEnhancedMcpTool(mockEnv, 'community_pattern_analyzer', {
          use_case: 'Customer support',
          scale
        });
        results.push(result);
      }

      // Results should vary by scale
      expect(results[0].scale).toBe('small');
      expect(results[1].scale).toBe('medium');
      expect(results[2].scale).toBe('enterprise');
    });
  });

  describe('n8n_troubleshooting_expert', () => {
    it('should provide expert troubleshooting advice', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'n8n_troubleshooting_expert', {
        error_description: 'OAuth token expired error when connecting to Slack',
        error_code: 'AUTH_EXPIRED',
        node_types: ['n8n-nodes-base.slack'],
        workflow_context: 'Sending notifications to sales channel'
      });

      expect(result).toHaveProperty('diagnosis');
      expect(result).toHaveProperty('solutions');
      expect(result).toHaveProperty('prevention_measures');
      expect(result).toHaveProperty('related_resources');

      expect(result.diagnosis).toHaveProperty('likely_cause');
      expect(result.diagnosis).toHaveProperty('confidence');
      expect(result.diagnosis).toHaveProperty('urgency');

      expect(result.solutions).toBeInstanceOf(Array);
      expect(result.solutions[0]).toHaveProperty('solution');
      expect(result.solutions[0]).toHaveProperty('steps');
      expect(result.solutions[0]).toHaveProperty('success_rate');
    });

    it('should handle different error types', async () => {
      const errorTypes = [
        { description: 'Rate limit exceeded', code: 'RATE_LIMIT' },
        { description: 'Connection timeout', code: 'TIMEOUT' },
        { description: 'Invalid credentials', code: 'INVALID_AUTH' }
      ];

      for (const error of errorTypes) {
        const result = await handleEnhancedMcpTool(mockEnv, 'n8n_troubleshooting_expert', {
          error_description: error.description,
          error_code: error.code
        });

        expect(result.diagnosis.likely_cause).toBeDefined();
        expect(result.solutions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('workflow_optimization_advisor', () => {
    it('should analyze and optimize workflows', async () => {
      const mockWorkflow = {
        name: 'Test Workflow',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook' },
          { id: '2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' },
          { id: '3', name: 'Slack', type: 'n8n-nodes-base.slack' }
        ],
        connections: {}
      };

      const result = await handleEnhancedMcpTool(mockEnv, 'workflow_optimization_advisor', {
        workflow_json: mockWorkflow,
        optimization_goals: ['performance', 'reliability'],
        current_issues: ['Slow execution', 'Occasional failures']
      });

      expect(result).toHaveProperty('workflow_analysis');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('implementation_priority');
      expect(result).toHaveProperty('expected_benefits');

      expect(result.recommendations).toHaveProperty('performance');
      expect(result.recommendations).toHaveProperty('reliability');
    });

    it('should provide prioritized implementation plan', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'workflow_optimization_advisor', {
        workflow_json: { nodes: [], connections: {} },
        optimization_goals: ['performance']
      });

      expect(result.implementation_priority).toBeInstanceOf(Array);
      expect(result.implementation_priority[0]).toHaveProperty('priority');
      expect(result.implementation_priority[0]).toHaveProperty('effort');
      expect(result.implementation_priority[0]).toHaveProperty('impact');
    });
  });

  describe('n8n_update_impact_analyzer', () => {
    it('should analyze update impact', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'n8n_update_impact_analyzer', {
        current_version: '1.0.0',
        target_version: '2.0.0',
        workflow_count: 100,
        critical_workflows: ['workflow1', 'workflow2']
      });

      expect(result).toHaveProperty('impact_assessment');
      expect(result).toHaveProperty('breaking_changes');
      expect(result).toHaveProperty('migration_plan');
      expect(result).toHaveProperty('recommendations');

      expect(result.impact_assessment).toHaveProperty('total_workflows_affected');
      expect(result.impact_assessment).toHaveProperty('estimated_migration_time');
      expect(result.migration_plan).toBeInstanceOf(Array);
    });

    it('should handle major and minor upgrades differently', async () => {
      const majorUpgrade = await handleEnhancedMcpTool(mockEnv, 'n8n_update_impact_analyzer', {
        current_version: '1.0.0',
        target_version: '2.0.0'
      });

      const minorUpgrade = await handleEnhancedMcpTool(mockEnv, 'n8n_update_impact_analyzer', {
        current_version: '2.0.0',
        target_version: '2.1.0'
      });

      expect(majorUpgrade.versions.is_major_upgrade).toBe(true);
      expect(minorUpgrade.versions.is_major_upgrade).toBe(false);
    });
  });

  describe('advanced_workflow_composer', () => {
    it('should compose workflows with enhanced intelligence', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'advanced_workflow_composer', {
        request: 'Create a comprehensive customer onboarding system',
        requirements: {
          integrations: ['Salesforce', 'Slack', 'Email'],
          complexity: 'advanced',
          include_error_handling: true,
          include_monitoring: true,
          compliance_requirements: ['GDPR']
        },
        context: {
          industry: 'SaaS',
          company_size: 'medium',
          technical_expertise: 'intermediate'
        }
      });

      expect(result).toHaveProperty('enhanced_analysis');
      expect(result).toHaveProperty('implementation_roadmap');
      expect(result).toHaveProperty('risk_assessment');

      expect(result.enhanced_analysis).toHaveProperty('feasibility_score');
      expect(result.enhanced_analysis).toHaveProperty('community_validation');
      expect(result.implementation_roadmap).toBeInstanceOf(Array);
    });

    it('should provide implementation phases', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'advanced_workflow_composer', {
        request: 'Simple data sync workflow'
      });

      expect(result.implementation_roadmap).toBeInstanceOf(Array);
      expect(result.implementation_roadmap[0]).toHaveProperty('phase');
      expect(result.implementation_roadmap[0]).toHaveProperty('estimated_time');
      expect(result.implementation_roadmap[0]).toHaveProperty('complexity');
    });
  });

  describe('n8n_community_insights', () => {
    it('should provide real-time community insights', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'n8n_community_insights', {
        insight_type: 'trending',
        time_range: '30d',
        category: 'automation'
      });

      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('generated_at');
      expect(result).toHaveProperty('data_points');

      expect(result.insights).toHaveProperty('trending');
      expect(result.insights).toHaveProperty('issues');
      expect(result.insights).toHaveProperty('solutions');
    });

    it('should handle different insight types', async () => {
      const insightTypes = ['trending', 'issues', 'solutions', 'best-practices', 'node-popularity'];
      
      for (const type of insightTypes) {
        const result = await handleEnhancedMcpTool(mockEnv, 'n8n_community_insights', {
          insight_type: type
        });

        expect(result.insight_type).toBe(type);
        expect(result.insights).toHaveProperty(type);
      }
    });
  });

  describe('n8n_learning_pathway', () => {
    it('should generate personalized learning pathways', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'n8n_learning_pathway', {
        current_skills: ['basic workflows', 'webhooks'],
        learning_goals: ['advanced error handling', 'performance optimization'],
        time_commitment: 'part-time',
        learning_style: 'hands-on'
      });

      expect(result).toHaveProperty('skill_assessment');
      expect(result).toHaveProperty('learning_pathway');
      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('milestones');

      expect(result.learning_pathway).toBeInstanceOf(Array);
      expect(result.learning_pathway[0]).toHaveProperty('week');
      expect(result.learning_pathway[0]).toHaveProperty('focus');
      expect(result.learning_pathway[0]).toHaveProperty('modules');
    });

    it('should adapt to different learning styles', async () => {
      const styles = ['visual', 'hands-on', 'reading', 'video'];
      
      for (const style of styles) {
        const result = await handleEnhancedMcpTool(mockEnv, 'n8n_learning_pathway', {
          current_skills: ['basic'],
          learning_goals: ['advanced'],
          learning_style: style
        });

        expect(result.learning_style).toBe(style);
        expect(result.learning_pathway[0].modules[0].type).toBeDefined();
      }
    });
  });

  describe('n8n_integration_expert', () => {
    it('should provide integration expertise', async () => {
      const result = await handleEnhancedMcpTool(mockEnv, 'n8n_integration_expert', {
        integration_name: 'Slack',
        use_case: 'Send notifications for sales alerts',
        setup_stage: 'configuration',
        issues: ['Rate limiting', 'Message formatting']
      });

      expect(result).toHaveProperty('integration_overview');
      expect(result).toHaveProperty('setup_guidance');
      expect(result).toHaveProperty('troubleshooting');
      expect(result).toHaveProperty('best_practices');
      expect(result).toHaveProperty('advanced_features');

      expect(result.setup_guidance).toHaveProperty('prerequisites');
      expect(result.setup_guidance).toHaveProperty('step_by_step');
      expect(result.troubleshooting).toHaveProperty('common_issues');
    });

    it('should handle different integration types', async () => {
      const integrations = ['Slack', 'Google Sheets', 'Salesforce', 'HubSpot'];
      
      for (const integration of integrations) {
        const result = await handleEnhancedMcpTool(mockEnv, 'n8n_integration_expert', {
          integration_name: integration,
          use_case: 'Test use case'
        });

        expect(result.integration_name).toBe(integration);
        expect(result.integration_overview).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tools gracefully', async () => {
      await expect(
        handleEnhancedMcpTool(mockEnv, 'unknown_tool', {})
      ).rejects.toThrow('Unknown enhanced tool: unknown_tool');
    });

    it('should handle invalid arguments gracefully', async () => {
      // Test with missing required arguments
      await expect(
        handleEnhancedMcpTool(mockEnv, 'workflow_feasibility_checker', {})
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const start = Date.now();
      
      await handleEnhancedMcpTool(mockEnv, 'n8n_ecosystem_intelligence', {
        query: 'test query'
      });
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const promises = Array(10).fill(null).map(() =>
        handleEnhancedMcpTool(mockEnv, 'n8n_ecosystem_intelligence', {
          query: 'concurrent test'
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('results');
      });
    });
  });
});
