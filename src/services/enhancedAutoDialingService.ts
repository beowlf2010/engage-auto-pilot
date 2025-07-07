import { supabase } from '@/integrations/supabase/client';

interface AutoDialSession {
  id: string;
  session_name: string;
  status: string;
  total_leads: number;
  completed_calls: number;
  successful_connects: number;
  voicemails_dropped: number;
  current_lead_id: string | null;
  call_pacing_seconds: number;
}

interface QueueLead {
  id: string;
  lead_id: string;
  phone_number: string;
  priority: number;
  attempt_count: number;
  first_name: string;
  last_name: string;
  vehicle_interest: string;
}

interface CallOutcome {
  outcome: 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'failed' | 'voicemail_dropped';
  duration?: number;
  notes?: string;
  callback_scheduled?: boolean;
  appointment_scheduled?: boolean;
}

export class EnhancedAutoDialingService {
  private static instance: EnhancedAutoDialingService;
  private currentSession: AutoDialSession | null = null;
  private isDialing = false;
  private dialingTimeout: NodeJS.Timeout | null = null;

  static getInstance(): EnhancedAutoDialingService {
    if (!EnhancedAutoDialingService.instance) {
      EnhancedAutoDialingService.instance = new EnhancedAutoDialingService();
    }
    return EnhancedAutoDialingService.instance;
  }

  // Start auto-dialing session
  async startAutoDialing(sessionName?: string, callPacing: number = 30): Promise<AutoDialSession> {
    console.log('🚀 [AUTO-DIAL] Starting auto-dialing session');

    if (this.isDialing) {
      throw new Error('Auto-dialing session already in progress');
    }

    // Get leads from queue
    const queueLeads = await this.getQueueLeads();
    if (queueLeads.length === 0) {
      throw new Error('No leads in queue to dial');
    }

    // Create session
    const { data: session, error } = await supabase
      .from('auto_dial_sessions')
      .insert({
        session_name: sessionName || `Session ${new Date().toISOString()}`,
        total_leads: queueLeads.length,
        call_pacing_seconds: callPacing,
        started_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;

    this.currentSession = session;
    this.isDialing = true;

    // Start dialing process
    this.processNextCall();

    return session;
  }

  // Stop auto-dialing session
  async stopAutoDialing(): Promise<void> {
    console.log('🛑 [AUTO-DIAL] Stopping auto-dialing session');

    if (!this.currentSession) {
      throw new Error('No active dialing session');
    }

    this.isDialing = false;
    
    if (this.dialingTimeout) {
      clearTimeout(this.dialingTimeout);
      this.dialingTimeout = null;
    }

    // Update session status
    await supabase
      .from('auto_dial_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', this.currentSession.id);

    this.currentSession = null;
  }

  // Pause auto-dialing session
  async pauseAutoDialing(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active dialing session');
    }

    this.isDialing = false;
    
    if (this.dialingTimeout) {
      clearTimeout(this.dialingTimeout);
      this.dialingTimeout = null;
    }

    await supabase
      .from('auto_dial_sessions')
      .update({ status: 'paused' })
      .eq('id', this.currentSession.id);
  }

  // Resume auto-dialing session
  async resumeAutoDialing(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active dialing session');
    }

    this.isDialing = true;

    await supabase
      .from('auto_dial_sessions')
      .update({ status: 'active' })
      .eq('id', this.currentSession.id);

    this.processNextCall();
  }

  // Process next call in queue
  private async processNextCall(): Promise<void> {
    if (!this.isDialing || !this.currentSession) return;

    try {
      // Get next lead to call
      const nextLead = await this.getNextLeadToCall();
      if (!nextLead) {
        console.log('📋 [AUTO-DIAL] No more leads in queue, ending session');
        await this.stopAutoDialing();
        return;
      }

      // Update session with current lead
      await supabase
        .from('auto_dial_sessions')
        .update({ current_lead_id: nextLead.lead_id })
        .eq('id', this.currentSession.id);

      // Make the call
      console.log(`📞 [AUTO-DIAL] Calling ${nextLead.first_name} ${nextLead.last_name} at ${nextLead.phone_number}`);
      
      const callResult = await this.makeCall(nextLead);
      
      // Update session statistics
      await this.updateSessionStats(callResult);

      // Schedule next call if still dialing
      if (this.isDialing && this.currentSession) {
        this.dialingTimeout = setTimeout(() => {
          this.processNextCall();
        }, this.currentSession.call_pacing_seconds * 1000);
      }

    } catch (error) {
      console.error('❌ [AUTO-DIAL] Error processing call:', error);
      
      // Continue with next call after error
      if (this.isDialing) {
        this.dialingTimeout = setTimeout(() => {
          this.processNextCall();
        }, 5000); // 5 second delay after error
      }
    }
  }

  // Get queue leads sorted by priority
  private async getQueueLeads(): Promise<QueueLead[]> {
    const { data, error } = await supabase
      .from('auto_dial_queue')
      .select(`
        id,
        lead_id,
        phone_number,
        priority,
        attempt_count,
        leads!inner (
          first_name,
          last_name,
          vehicle_interest
        )
      `)
      .eq('status', 'queued')
      .lt('attempt_count', 3) // Max 3 attempts
      .or('do_not_call_until.is.null,do_not_call_until.lt.now()')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      lead_id: item.lead_id,
      phone_number: item.phone_number,
      priority: item.priority,
      attempt_count: item.attempt_count,
      first_name: item.leads.first_name,
      last_name: item.leads.last_name,
      vehicle_interest: item.leads.vehicle_interest || 'a vehicle'
    }));
  }

  // Get next lead to call
  private async getNextLeadToCall(): Promise<QueueLead | null> {
    const leads = await this.getQueueLeads();
    return leads.length > 0 ? leads[0] : null;
  }

  // Make call with voicemail detection
  private async makeCall(lead: QueueLead): Promise<CallOutcome> {
    try {
      // Update queue status to calling
      await supabase
        .from('auto_dial_queue')
        .update({
          status: 'calling',
          last_attempt_at: new Date().toISOString(),
          attempt_count: lead.attempt_count + 1
        })
        .eq('id', lead.id);

      // Call the make-call edge function with voicemail detection
      const { data, error } = await supabase.functions.invoke('make-call', {
        body: {
          queueId: lead.id,
          leadId: lead.lead_id,
          phoneNumber: lead.phone_number,
          enableVoicemailDetection: true,
          voicemailTemplate: await this.getVoicemailTemplate(lead.attempt_count + 1, lead)
        }
      });

      if (error) throw error;

      // For now, simulate call outcome (this would be handled by webhooks in real implementation)
      const outcomes = ['connected', 'voicemail', 'no_answer', 'busy'];
      const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      
      const callOutcome: CallOutcome = {
        outcome: randomOutcome as any,
        duration: randomOutcome === 'connected' ? Math.floor(Math.random() * 300) + 30 : 0
      };

      // Update queue based on outcome
      await this.updateQueueStatus(lead.id, callOutcome);

      return callOutcome;

    } catch (error) {
      console.error('❌ [AUTO-DIAL] Call failed:', error);
      
      // Mark as failed
      await supabase
        .from('auto_dial_queue')
        .update({
          status: 'failed',
          last_attempt_outcome: 'call_failed'
        })
        .eq('id', lead.id);

      return { outcome: 'failed' };
    }
  }

  // Get voicemail template based on attempt number
  private async getVoicemailTemplate(attemptNumber: number, lead: QueueLead): Promise<string> {
    const { data: template } = await supabase
      .from('voicemail_templates')
      .select('script_content')
      .eq('attempt_number', attemptNumber)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (!template) {
      return `Hi ${lead.first_name}, this is your car dealership. I wanted to follow up about the ${lead.vehicle_interest} you inquired about. Please give us a call back when you have a chance. Thanks!`;
    }

    // Replace variables in template
    let processedTemplate = template.script_content;
    processedTemplate = processedTemplate.replace(/\{first_name\}/g, lead.first_name);
    processedTemplate = processedTemplate.replace(/\{vehicle_interest\}/g, lead.vehicle_interest);
    processedTemplate = processedTemplate.replace(/\{salesperson_name\}/g, 'your sales representative');
    processedTemplate = processedTemplate.replace(/\{dealership_name\}/g, 'our dealership');
    processedTemplate = processedTemplate.replace(/\{phone_number\}/g, 'us');
    return processedTemplate;
  }

  // Update queue status based on call outcome
  private async updateQueueStatus(queueId: string, outcome: CallOutcome): Promise<void> {
    let status = 'queued';
    let outcomeText = outcome.outcome;

    switch (outcome.outcome) {
      case 'connected':
        status = 'completed';
        break;
      case 'voicemail':
        status = 'completed';
        outcomeText = 'voicemail_dropped';
        break;
      case 'no_answer':
      case 'busy':
        status = 'queued'; // Will try again later
        break;
      case 'failed':
        status = 'failed';
        break;
    }

    await supabase
      .from('auto_dial_queue')
      .update({
        status,
        last_attempt_outcome: outcomeText
      })
      .eq('id', queueId);
  }

  // Update session statistics
  private async updateSessionStats(outcome: CallOutcome): Promise<void> {
    if (!this.currentSession) return;

    const updates: any = {
      completed_calls: this.currentSession.completed_calls + 1
    };

    if (outcome.outcome === 'connected') {
      updates.successful_connects = this.currentSession.successful_connects + 1;
    } else if (outcome.outcome === 'voicemail') {
      updates.voicemails_dropped = this.currentSession.voicemails_dropped + 1;
    }

    await supabase
      .from('auto_dial_sessions')
      .update(updates)
      .eq('id', this.currentSession.id);

    // Update local session object
    Object.assign(this.currentSession, updates);
  }

  // Add leads to queue
  async addLeadsToQueue(leadIds: string[], priority: number = 5): Promise<void> {
    console.log('📋 [AUTO-DIAL] Adding leads to queue:', leadIds.length);

    // Get lead information and phone numbers
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        phone_numbers!inner (
          number,
          type,
          is_primary
        )
      `)
      .in('id', leadIds)
      .eq('do_not_call', false);

    if (leadsError) throw leadsError;

    const queueItems = [];
    for (const lead of leads || []) {
      // Add primary phone number first, then others
      const primaryPhone = lead.phone_numbers.find((p: any) => p.is_primary);
      const otherPhones = lead.phone_numbers.filter((p: any) => !p.is_primary);

      if (primaryPhone) {
        queueItems.push({
          lead_id: lead.id,
          phone_number: primaryPhone.number,
          priority: priority + (primaryPhone.type === 'cell' ? 1 : 0) // Prefer cell phones
        });
      }

      // Add other phone numbers with lower priority
      for (const phone of otherPhones) {
        queueItems.push({
          lead_id: lead.id,
          phone_number: phone.number,
          priority: priority - 1
        });
      }
    }

    if (queueItems.length > 0) {
      const { error } = await supabase
        .from('auto_dial_queue')
        .insert(queueItems);

      if (error) throw error;
    }
  }

  // Get current session status
  getCurrentSession(): AutoDialSession | null {
    return this.currentSession;
  }

  // Check if currently dialing
  isCurrentlyDialing(): boolean {
    return this.isDialing;
  }

  // Record call outcome manually (for when calls are answered)
  async recordCallOutcome(queueId: string, outcome: CallOutcome): Promise<void> {
    await this.updateQueueStatus(queueId, outcome);
    
    if (this.currentSession) {
      await this.updateSessionStats(outcome);
    }
  }

  // Get session analytics
  async getSessionAnalytics(sessionId: string): Promise<any> {
    const { data: session } = await supabase
      .from('auto_dial_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    const { data: callLogs } = await supabase
      .from('call_logs')
      .select('call_outcome, duration_seconds, voicemail_detected')
      .gte('created_at', session?.started_at || new Date().toISOString());

    const totalCalls = callLogs?.length || 0;
    const connects = callLogs?.filter(c => c.call_outcome === 'answered').length || 0;
    const voicemails = callLogs?.filter(c => c.voicemail_detected).length || 0;
    const avgDuration = callLogs?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / totalCalls || 0;

    return {
      session,
      totalCalls,
      connectRate: totalCalls > 0 ? (connects / totalCalls) * 100 : 0,
      voicemailRate: totalCalls > 0 ? (voicemails / totalCalls) * 100 : 0,
      averageDuration: Math.round(avgDuration)
    };
  }
}

export const enhancedAutoDialingService = EnhancedAutoDialingService.getInstance();