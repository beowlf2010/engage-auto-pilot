export type WorkflowTriggerType = 
  | 'lead_created'
  | 'status_change'
  | 'time_based'
  | 'interaction_received'
  | 'ai_recommendation'
  | 'performance_threshold'
  | 'manual_trigger';

export type WorkflowActionType =
  | 'send_message'
  | 'assign_lead'
  | 'create_task'
  | 'schedule_appointment'
  | 'update_status'
  | 'escalate'
  | 'generate_ai_response'
  | 'execute_recommendation';

export type WorkflowCondition = {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: any;
  logicalOperator?: 'AND' | 'OR';
};

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  parameters: Record<string, any>;
  conditions?: WorkflowCondition[];
  delay?: number; // minutes
  requiresApproval?: boolean;
  autoApprovalCriteria?: {
    minConfidence: number;
    maxRiskScore: number;
    allowedLeadSources?: string[];
  };
}

export interface WorkflowTrigger {
  id: string;
  type: WorkflowTriggerType;
  conditions: WorkflowCondition[];
  schedule?: {
    type: 'interval' | 'cron' | 'delay';
    value: string | number;
  };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  successCriteria: {
    metrics: string[];
    targets: Record<string, number>;
  };
  performance: {
    executionCount: number;
    successRate: number;
    averageExecutionTime: number;
    lastOptimized: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  leadId: string;
  triggeredBy: WorkflowTriggerType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  executionData: Record<string, any>;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  performanceMetrics: {
    executionTime: number;
    successfulActions: number;
    failedActions: number;
    userInteractions: number;
  };
}

export interface LeadRoutingRule {
  id: string;
  name: string;
  conditions: WorkflowCondition[];
  assignmentStrategy: 'round_robin' | 'performance_based' | 'expertise_match' | 'workload_balanced';
  assignmentPool: string[]; // salesperson IDs
  priority: number;
  isActive: boolean;
  performance: {
    assignmentCount: number;
    successRate: number;
    averageResponseTime: number;
  };
}

export interface AutomationMetrics {
  totalWorkflows: number;
  activeExecutions: number;
  completionRate: number;
  averageExecutionTime: number;
  autoApprovalRate: number;
  performanceImpact: {
    responseTimeImprovement: number;
    conversionRateImprovement: number;
    eficiencyGain: number;
  };
}