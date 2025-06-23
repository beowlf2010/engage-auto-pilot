
import { supabase } from '@/integrations/supabase/client';
import { LeadProcess, ProcessPerformanceMetrics, LeadProcessAssignment } from '@/types/leadProcess';

class LeadProcessService {
  // Get all available lead processes
  async getLeadProcesses(): Promise<LeadProcess[]> {
    try {
      const { data, error } = await supabase
        .from('lead_processes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapProcessFromDb);
    } catch (error) {
      console.error('Error fetching lead processes:', error);
      return [];
    }
  }

  // Create a new lead process
  async createLeadProcess(process: Omit<LeadProcess, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeadProcess | null> {
    try {
      const { data, error } = await supabase
        .from('lead_processes')
        .insert({
          name: process.name,
          description: process.description,
          aggression_level: process.aggressionLevel,
          is_active: process.isActive,
          message_sequence: process.messageSequence as any,
          escalation_rules: process.escalationRules as any,
          success_criteria: process.successCriteria as any,
          performance_metrics: process.performanceMetrics as any
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapProcessFromDb(data);
    } catch (error) {
      console.error('Error creating lead process:', error);
      return null;
    }
  }

  // Assign a lead to a specific process
  async assignLeadToProcess(leadId: string, processId: string): Promise<LeadProcessAssignment | null> {
    try {
      const { data, error } = await supabase
        .from('lead_process_assignments')
        .insert({
          lead_id: leadId,
          process_id: processId,
          current_stage: 0,
          status: 'active',
          next_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapAssignmentFromDb(data);
    } catch (error) {
      console.error('Error assigning lead to process:', error);
      return null;
    }
  }

  // Get process performance metrics
  async getProcessPerformance(processId: string): Promise<ProcessPerformanceMetrics | null> {
    try {
      const { data, error } = await supabase
        .from('lead_process_assignments')
        .select(`
          *,
          leads!inner(id, status, created_at),
          conversations!inner(direction, sent_at)
        `)
        .eq('process_id', processId);

      if (error) throw error;

      return this.calculatePerformanceMetrics(data || []);
    } catch (error) {
      console.error('Error fetching process performance:', error);
      return null;
    }
  }

  // Auto-assign lead to best performing process
  async autoAssignLead(leadId: string, leadSource?: string, vehicleType?: string): Promise<LeadProcessAssignment | null> {
    try {
      const processes = await this.getLeadProcesses();
      
      // Get performance data for all processes
      const processPerformance = await Promise.all(
        processes.map(async (process) => ({
          process,
          performance: await this.getProcessPerformance(process.id)
        }))
      );

      // Sort by conversion rate (or response rate if no conversions yet)
      const sortedProcesses = processPerformance
        .filter(p => p.performance)
        .sort((a, b) => {
          const aScore = a.performance!.conversionRate || a.performance!.responseRate;
          const bScore = b.performance!.conversionRate || b.performance!.responseRate;
          return bScore - aScore;
        });

      // Use best performing process, or default to moderate if no data
      const selectedProcess = sortedProcesses.length > 0 
        ? sortedProcesses[0].process
        : processes.find(p => p.aggressionLevel === 'moderate') || processes[0];

      if (!selectedProcess) {
        console.error('No process available for assignment');
        return null;
      }

      return await this.assignLeadToProcess(leadId, selectedProcess.id);
    } catch (error) {
      console.error('Error auto-assigning lead:', error);
      return null;
    }
  }

  // Update process performance metrics
  async updateProcessPerformance(processId: string): Promise<void> {
    try {
      const performance = await this.getProcessPerformance(processId);
      if (!performance) return;

      await supabase
        .from('lead_processes')
        .update({
          performance_metrics: performance as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', processId);
    } catch (error) {
      console.error('Error updating process performance:', error);
    }
  }

  // Compare two processes statistically
  async compareProcesses(processAId: string, processBId: string): Promise<any> {
    try {
      const [performanceA, performanceB] = await Promise.all([
        this.getProcessPerformance(processAId),
        this.getProcessPerformance(processBId)
      ]);

      if (!performanceA || !performanceB) return null;

      // Basic statistical comparison
      const sampleSizeA = performanceA.totalLeadsAssigned;
      const sampleSizeB = performanceB.totalLeadsAssigned;
      
      const conversionRateA = performanceA.conversionRate;
      const conversionRateB = performanceB.conversionRate;
      
      // Simple significance test (would use proper statistical methods in production)
      const pooledRate = (performanceA.totalConversions + performanceB.totalConversions) / 
                        (sampleSizeA + sampleSizeB);
      
      const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/sampleSizeA + 1/sampleSizeB));
      const zScore = Math.abs(conversionRateA - conversionRateB) / standardError;
      
      return {
        processAId,
        processBId,
        conversionRateA,
        conversionRateB,
        sampleSizeA,
        sampleSizeB,
        zScore,
        isSignificant: zScore > 1.96, // 95% confidence
        winner: conversionRateA > conversionRateB ? 'A' : 'B',
        improvementPercent: Math.abs((conversionRateA - conversionRateB) / conversionRateB * 100)
      };
    } catch (error) {
      console.error('Error comparing processes:', error);
      return null;
    }
  }

  private calculatePerformanceMetrics(assignments: any[]): ProcessPerformanceMetrics {
    const totalLeadsAssigned = assignments.length;
    const totalResponses = assignments.filter(a => 
      a.conversations?.some((c: any) => c.direction === 'in')
    ).length;
    
    const totalAppointments = assignments.filter(a => 
      a.leads?.status === 'engaged' // Assuming engaged means appointment set
    ).length;
    
    const totalConversions = assignments.filter(a => 
      a.leads?.status === 'closed'
    ).length;

    const responseRate = totalLeadsAssigned > 0 ? (totalResponses / totalLeadsAssigned) * 100 : 0;
    const appointmentRate = totalLeadsAssigned > 0 ? (totalAppointments / totalLeadsAssigned) * 100 : 0;
    const conversionRate = totalLeadsAssigned > 0 ? (totalConversions / totalLeadsAssigned) * 100 : 0;

    return {
      totalLeadsAssigned,
      totalResponses,
      totalAppointments,
      totalConversions,
      averageResponseTime: 0, // Would calculate from actual data
      averageTimeToConversion: 0, // Would calculate from actual data
      responseRate,
      appointmentRate,
      conversionRate,
      costPerConversion: 0, // Would calculate based on costs
      lastUpdated: new Date().toISOString()
    };
  }

  private mapProcessFromDb(data: any): LeadProcess {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      aggressionLevel: data.aggression_level,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      messageSequence: data.message_sequence || [],
      escalationRules: data.escalation_rules || [],
      successCriteria: data.success_criteria || {},
      performanceMetrics: data.performance_metrics || {}
    };
  }

  private mapAssignmentFromDb(data: any): LeadProcessAssignment {
    return {
      id: data.id,
      leadId: data.lead_id,
      processId: data.process_id,
      assignedAt: data.assigned_at,
      currentStage: data.current_stage,
      nextMessageAt: data.next_message_at,
      status: data.status,
      performanceNotes: data.performance_notes
    };
  }
}

export const leadProcessService = new LeadProcessService();
