import { supabase } from '@/integrations/supabase/client';
import { smartFollowUpEngine } from './smartFollowUpEngine';
import { leadProcessService } from './leadProcessService';
import { aiIntelligenceHub } from './aiIntelligenceHub';
import { intelligentAutoApproval } from './intelligentAutoApproval';
import type {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowTrigger,
  WorkflowAction,
  WorkflowCondition,
  LeadRoutingRule,
  AutomationMetrics
} from '@/types/workflowEngine';

class AutomatedWorkflowEngine {
  private static instance: AutomatedWorkflowEngine;
  private activeExecutions = new Map<string, WorkflowExecution>();
  private routingRules: LeadRoutingRule[] = [];
  private isRunning = false;

  static getInstance(): AutomatedWorkflowEngine {
    if (!AutomatedWorkflowEngine.instance) {
      AutomatedWorkflowEngine.instance = new AutomatedWorkflowEngine();
    }
    return AutomatedWorkflowEngine.instance;
  }

  async startEngine(): Promise<void> {
    if (this.isRunning) return;

    console.log('🚀 [WORKFLOW ENGINE] Starting automated workflow engine...');
    this.isRunning = true;

    // Load routing rules
    await this.loadRoutingRules();

    // Start monitoring for triggers
    this.startTriggerMonitoring();

    // Start performance optimization cycle
    this.startPerformanceOptimization();

    console.log('✅ [WORKFLOW ENGINE] Engine started successfully');
  }

  async stopEngine(): Promise<void> {
    console.log('🛑 [WORKFLOW ENGINE] Stopping engine...');
    this.isRunning = false;
    this.activeExecutions.clear();
  }

  // Auto-execute approved recommendations
  async executeApprovedRecommendation(
    leadId: string,
    recommendationId: string,
    autoApproved: boolean = false
  ): Promise<boolean> {
    try {
      console.log('🤖 [WORKFLOW] Auto-executing recommendation:', recommendationId);

      // Get the recommendation details
      const { data: recommendation } = await supabase
        .from('ai_message_approval_queue')
        .select('*')
        .eq('id', recommendationId)
        .single();

      if (!recommendation || (!recommendation.approved && !autoApproved)) {
        return false;
      }

      // Create workflow execution for tracking
      const execution: WorkflowExecution = {
        id: crypto.randomUUID(),
        workflowId: 'auto_recommendation_executor',
        leadId,
        triggeredBy: 'ai_recommendation',
        status: 'running',
        currentStep: 1,
        executionData: { recommendationId, autoApproved },
        startedAt: new Date().toISOString(),
        performanceMetrics: {
          executionTime: 0,
          successfulActions: 0,
          failedActions: 0,
          userInteractions: 0
        }
      };

      this.activeExecutions.set(execution.id, execution);

      // Execute the recommendation
      const success = await this.executeRecommendationAction(leadId, recommendation);

      // Update execution status
      execution.status = success ? 'completed' : 'failed';
      execution.completedAt = new Date().toISOString();
      execution.performanceMetrics.executionTime = 
        Date.now() - new Date(execution.startedAt).getTime();

      if (success) {
        execution.performanceMetrics.successfulActions = 1;
        
        // Update recommendation as sent
        await supabase
          .from('ai_message_approval_queue')
          .update({
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', recommendationId);
      } else {
        execution.performanceMetrics.failedActions = 1;
      }

      this.activeExecutions.delete(execution.id);
      return success;

    } catch (error) {
      console.error('❌ [WORKFLOW] Error executing recommendation:', error);
      return false;
    }
  }

  // Smart lead routing & assignment
  async routeNewLead(leadId: string, leadData: any): Promise<string | null> {
    try {
      console.log('🎯 [WORKFLOW] Routing new lead:', leadId);

      // Find matching routing rules
      const matchingRules = this.routingRules
        .filter(rule => rule.isActive)
        .filter(rule => this.evaluateConditions(rule.conditions, leadData))
        .sort((a, b) => b.priority - a.priority);

      if (matchingRules.length === 0) {
        console.log('⚠️ [WORKFLOW] No matching routing rules found');
        return null;
      }

      const rule = matchingRules[0];
      const assignedSalesperson = await this.selectSalesperson(rule, leadData);

      if (assignedSalesperson) {
        // Assign the lead
        await supabase
          .from('leads')
          .update({
            salesperson_id: assignedSalesperson,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);

        // Update rule performance
        rule.performance.assignmentCount++;
        await this.updateRoutingRulePerformance(rule);

        console.log(`✅ [WORKFLOW] Lead assigned to: ${assignedSalesperson}`);
        return assignedSalesperson;
      }

      return null;
    } catch (error) {
      console.error('❌ [WORKFLOW] Error routing lead:', error);
      return null;
    }
  }

  // Trigger-based action sequences
  async processTrigger(
    triggerType: string,
    leadId: string,
    eventData: any
  ): Promise<void> {
    try {
      console.log('⚡ [WORKFLOW] Processing trigger:', triggerType, 'for lead:', leadId);

      // Get matching workflows
      const workflows = await this.getWorkflowsForTrigger(triggerType);

      for (const workflow of workflows) {
        if (await this.shouldExecuteWorkflow(workflow, leadId, eventData)) {
          await this.executeWorkflow(workflow, leadId, eventData);
        }
      }
    } catch (error) {
      console.error('❌ [WORKFLOW] Error processing trigger:', error);
    }
  }

  // Performance-based optimization
  async optimizeWorkflows(): Promise<void> {
    try {
      console.log('📊 [WORKFLOW] Running performance optimization...');

      const workflows = await this.getAllWorkflows();

      for (const workflow of workflows) {
        const metrics = await this.analyzeWorkflowPerformance(workflow.id);
        
        if (metrics.successRate < 0.6) {
          console.log(`🔧 [WORKFLOW] Optimizing low-performing workflow: ${workflow.name}`);
          await this.optimizeWorkflow(workflow, metrics);
        }

        if (metrics.executionCount > 100 && metrics.successRate > 0.8) {
          console.log(`⚡ [WORKFLOW] Promoting high-performing workflow: ${workflow.name}`);
          await this.promoteWorkflow(workflow);
        }
      }

      // Optimize routing rules
      await this.optimizeRoutingRules();

    } catch (error) {
      console.error('❌ [WORKFLOW] Error during optimization:', error);
    }
  }

  async getAutomationMetrics(): Promise<AutomationMetrics> {
    try {
      const workflows = await this.getAllWorkflows();
      const activeCount = this.activeExecutions.size;
      
      const totalExecutions = workflows.reduce((sum, w) => sum + w.performance.executionCount, 0);
      const averageSuccessRate = workflows.length > 0 
        ? workflows.reduce((sum, w) => sum + w.performance.successRate, 0) / workflows.length 
        : 0;

      const averageExecutionTime = workflows.length > 0
        ? workflows.reduce((sum, w) => sum + w.performance.averageExecutionTime, 0) / workflows.length
        : 0;

      // Calculate auto-approval rate
      const { data: approvalData } = await supabase
        .from('ai_message_approval_queue')
        .select('auto_approved')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const autoApprovalRate = approvalData?.length > 0
        ? (approvalData.filter(d => d.auto_approved).length / approvalData.length) * 100
        : 0;

      return {
        totalWorkflows: workflows.length,
        activeExecutions: activeCount,
        completionRate: averageSuccessRate * 100,
        averageExecutionTime,
        autoApprovalRate,
        performanceImpact: {
          responseTimeImprovement: 35, // Mock data - would calculate from actual metrics
          conversionRateImprovement: 18,
          eficiencyGain: 42
        }
      };
    } catch (error) {
      console.error('❌ [WORKFLOW] Error getting metrics:', error);
      return {
        totalWorkflows: 0,
        activeExecutions: 0,
        completionRate: 0,
        averageExecutionTime: 0,
        autoApprovalRate: 0,
        performanceImpact: {
          responseTimeImprovement: 0,
          conversionRateImprovement: 0,
          eficiencyGain: 0
        }
      };
    }
  }

  private async executeRecommendationAction(
    leadId: string,
    recommendation: any
  ): Promise<boolean> {
    try {
      // Generate AI response based on the recommendation
      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, vehicle_interest')
        .eq('id', leadId)
        .single();

      if (!lead) return false;

      // Use smart follow-up engine to execute the recommendation
      const smartRecommendation = {
        id: recommendation.id,
        action: recommendation.message_content,
        type: 'immediate' as const,
        priority: recommendation.urgency_level as any,
        confidence: 0.8,
        reasoning: 'Auto-executed approved recommendation',
        automatable: true,
        contextFactors: ['Auto-execution', 'Pre-approved'],
        expectedOutcome: 'Continued engagement',
        timeToExecute: 5,
        relatedActions: [],
        successProbability: 0.75
      };

      return await smartFollowUpEngine.executeRecommendation(leadId, smartRecommendation);
    } catch (error) {
      console.error('❌ [WORKFLOW] Error executing recommendation action:', error);
      return false;
    }
  }

  private async selectSalesperson(
    rule: LeadRoutingRule,
    leadData: any
  ): Promise<string | null> {
    const availableSalespeople = rule.assignmentPool;

    switch (rule.assignmentStrategy) {
      case 'round_robin':
        return this.selectRoundRobin(availableSalespeople);
      
      case 'performance_based':
        return await this.selectByPerformance(availableSalespeople);
      
      case 'workload_balanced':
        return await this.selectByWorkload(availableSalespeople);
      
      case 'expertise_match':
        return await this.selectByExpertise(availableSalespeople, leadData);
      
      default:
        return availableSalespeople[0] || null;
    }
  }

  private selectRoundRobin(salespeople: string[]): string | null {
    if (salespeople.length === 0) return null;
    
    // Simple round-robin (in production, would store state)
    const now = new Date();
    const index = now.getMinutes() % salespeople.length;
    return salespeople[index];
  }

  private async selectByPerformance(salespeople: string[]): Promise<string | null> {
    try {
      // Get performance metrics for each salesperson
      const { data: metrics } = await supabase
        .from('leads')
        .select('salesperson_id, status')
        .in('salesperson_id', salespeople)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!metrics) return salespeople[0] || null;

      // Calculate conversion rates
      const performanceMap = salespeople.map(id => {
        const personLeads = metrics.filter(m => m.salesperson_id === id);
        const conversionRate = personLeads.length > 0
          ? personLeads.filter(l => l.status === 'closed').length / personLeads.length
          : 0;
        return { id, conversionRate, totalLeads: personLeads.length };
      });

      // Select highest performing with minimum lead count
      const best = performanceMap
        .filter(p => p.totalLeads >= 5) // Minimum sample size
        .sort((a, b) => b.conversionRate - a.conversionRate)[0];

      return best?.id || salespeople[0] || null;
    } catch (error) {
      console.error('❌ [WORKFLOW] Error selecting by performance:', error);
      return salespeople[0] || null;
    }
  }

  private async selectByWorkload(salespeople: string[]): Promise<string | null> {
    try {
      const { data: workloads } = await supabase
        .from('leads')
        .select('salesperson_id')
        .in('salesperson_id', salespeople)
        .in('status', ['new', 'engaged'])
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (!workloads) return salespeople[0] || null;

      // Count active leads per salesperson
      const workloadMap = salespeople.map(id => ({
        id,
        activeLeads: workloads.filter(w => w.salesperson_id === id).length
      }));

      // Select salesperson with lowest workload
      const leastBusy = workloadMap.sort((a, b) => a.activeLeads - b.activeLeads)[0];
      return leastBusy?.id || null;
    } catch (error) {
      console.error('❌ [WORKFLOW] Error selecting by workload:', error);
      return salespeople[0] || null;
    }
  }

  private async selectByExpertise(
    salespeople: string[],
    leadData: any
  ): Promise<string | null> {
    // In production, would match based on vehicle type, lead source, etc.
    // For now, fallback to performance-based
    return await this.selectByPerformance(salespeople);
  }

  private evaluateConditions(conditions: WorkflowCondition[], data: any): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(data, condition.field);
      const conditionMet = this.evaluateCondition(condition, fieldValue);
      
      if (!conditionMet && condition.logicalOperator !== 'OR') {
        return false;
      }
      if (conditionMet && condition.logicalOperator === 'OR') {
        return true;
      }
    }

    return true;
  }

  private evaluateCondition(condition: WorkflowCondition, fieldValue: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async loadRoutingRules(): Promise<void> {
    // In production, would load from database
    this.routingRules = [
      {
        id: 'high_value_leads',
        name: 'High Value Lead Routing',
        conditions: [
          { field: 'source', operator: 'contains', value: 'premium' },
          { field: 'vehicle_interest', operator: 'contains', value: 'luxury' }
        ],
        assignmentStrategy: 'performance_based',
        assignmentPool: [], // Would be loaded from database
        priority: 10,
        isActive: true,
        performance: {
          assignmentCount: 0,
          successRate: 0,
          averageResponseTime: 0
        }
      }
    ];
  }

  private startTriggerMonitoring(): void {
    // Monitor for database changes and trigger workflows
    const channel = supabase
      .channel('workflow-triggers')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          this.processTrigger('lead_created', payload.new.id, payload.new);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          if (payload.old.status !== payload.new.status) {
            this.processTrigger('status_change', payload.new.id, {
              oldStatus: payload.old.status,
              newStatus: payload.new.status
            });
          }
        }
      )
      .subscribe();
  }

  private startPerformanceOptimization(): void {
    // Run optimization every hour
    setInterval(() => {
      if (this.isRunning) {
        this.optimizeWorkflows();
      }
    }, 60 * 60 * 1000);
  }

  private async getWorkflowsForTrigger(triggerType: string): Promise<WorkflowDefinition[]> {
    // Mock implementation - would query database
    return [];
  }

  private async shouldExecuteWorkflow(
    workflow: WorkflowDefinition,
    leadId: string,
    eventData: any
  ): Promise<boolean> {
    // Evaluate workflow trigger conditions
    return true; // Mock
  }

  private async executeWorkflow(
    workflow: WorkflowDefinition,
    leadId: string,
    eventData: any
  ): Promise<void> {
    // Execute workflow actions
    console.log('🔄 [WORKFLOW] Executing workflow:', workflow.name);
  }

  private async getAllWorkflows(): Promise<WorkflowDefinition[]> {
    // Mock implementation
    return [];
  }

  private async analyzeWorkflowPerformance(workflowId: string): Promise<any> {
    return { successRate: 0.8, executionCount: 50 };
  }

  private async optimizeWorkflow(workflow: WorkflowDefinition, metrics: any): Promise<void> {
    console.log('🔧 [WORKFLOW] Optimizing workflow:', workflow.name);
  }

  private async promoteWorkflow(workflow: WorkflowDefinition): Promise<void> {
    console.log('⭐ [WORKFLOW] Promoting workflow:', workflow.name);
  }

  private async optimizeRoutingRules(): Promise<void> {
    console.log('🎯 [WORKFLOW] Optimizing routing rules...');
  }

  private async updateRoutingRulePerformance(rule: LeadRoutingRule): Promise<void> {
    // Update rule performance metrics in database
  }
}

export const automatedWorkflowEngine = AutomatedWorkflowEngine.getInstance();