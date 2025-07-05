import { supabase } from '@/integrations/supabase/client';

interface EngagementPrediction {
  leadId: string;
  predictionType: 'churn_risk' | 'engagement_opportunity' | 'appointment_ready';
  riskScore: number;
  confidenceLevel: number;
  contributingFactors: string[];
  recommendedActions: string[];
  expiresAt?: Date;
}

interface ProactiveAction {
  leadId: string;
  actionType: 'retention_message' | 'inventory_alert' | 'appointment_reminder' | 'follow_up';
  messageContent: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  scheduledFor?: Date;
}

export class ProactiveEngagementService {
  private static instance: ProactiveEngagementService;

  static getInstance(): ProactiveEngagementService {
    if (!ProactiveEngagementService.instance) {
      ProactiveEngagementService.instance = new ProactiveEngagementService();
    }
    return ProactiveEngagementService.instance;
  }

  // Main predictive analysis function
  async analyzePredictiveEngagement(): Promise<void> {
    console.log('🔮 [PROACTIVE] Starting predictive engagement analysis...');

    // Run parallel analysis for different prediction types
    await Promise.all([
      this.identifyChurnRisks(),
      this.findEngagementOpportunities(),
      this.detectAppointmentReadiness(),
      this.checkInventoryMatches()
    ]);

    console.log('✅ [PROACTIVE] Predictive engagement analysis completed');
  }

  // Identify leads at risk of churning
  private async identifyChurnRisks(): Promise<void> {
    console.log('⚠️ [PROACTIVE] Identifying churn risks...');

    // Get leads that haven't responded in a while but were previously engaged
    const { data: potentialChurns, error } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name, created_at, last_reply_at, status,
        conversations(id, sent_at, direction)
      `)
      .neq('status', 'sold')
      .neq('status', 'lost')
      .not('last_reply_at', 'is', null);

    if (error || !potentialChurns) {
      console.error('Failed to get potential churn leads:', error);
      return;
    }

    for (const lead of potentialChurns) {
      const churnRisk = await this.calculateChurnRisk(lead);
      
      if (churnRisk.riskScore > 0.6) {
        await this.storePrediction({
          leadId: lead.id,
          predictionType: 'churn_risk',
          riskScore: churnRisk.riskScore,
          confidenceLevel: churnRisk.confidence,
          contributingFactors: churnRisk.factors,
          recommendedActions: churnRisk.actions
        });

        // Generate proactive retention message
        await this.generateRetentionMessage(lead, churnRisk);
      }
    }
  }

  private async calculateChurnRisk(lead: any): Promise<any> {
    const now = new Date();
    const lastReplyDate = new Date(lead.last_reply_at);
    const daysSinceLastReply = Math.floor((now.getTime() - lastReplyDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let riskScore = 0;
    const factors = [];
    const actions = [];

    // Days since last reply factor
    if (daysSinceLastReply > 14) {
      riskScore += 0.4;
      factors.push(`${daysSinceLastReply} days since last response`);
      actions.push('Send re-engagement message');
    } else if (daysSinceLastReply > 7) {
      riskScore += 0.2;
      factors.push(`${daysSinceLastReply} days since last response`);
    }

    // Conversation frequency analysis
    const conversations = lead.conversations || [];
    const recentConversations = conversations.filter(c => 
      new Date(c.sent_at) > new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    );

    if (recentConversations.length === 0 && conversations.length > 3) {
      riskScore += 0.3;
      factors.push('Previously engaged but now silent');
      actions.push('Offer new inventory options');
    }

    // Lead age factor
    const leadAge = Math.floor((now.getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (leadAge > 30 && riskScore > 0.2) {
      riskScore += 0.2;
      factors.push('Long-term lead without conversion');
      actions.push('Schedule appointment or demo');
    }

    const confidence = Math.min(factors.length * 0.25, 0.9);

    return {
      riskScore: Math.min(riskScore, 1.0),
      confidence,
      factors,
      actions
    };
  }

  // Find engagement opportunities
  private async findEngagementOpportunities(): Promise<void> {
    console.log('🎯 [PROACTIVE] Finding engagement opportunities...');

    // Get leads with positive engagement patterns
    const { data: activeLeads, error } = await supabase
      .from('leads')
      .select(`
        id, first_name, vehicle_interest, created_at, last_reply_at,
        conversations!inner(id, sent_at, direction, body)
      `)
      .eq('status', 'active')
      .gte('last_reply_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error || !activeLeads) {
      console.error('Failed to get active leads:', error);
      return;
    }

    for (const lead of activeLeads) {
      const opportunity = await this.identifyEngagementOpportunity(lead);
      
      if (opportunity.score > 0.7) {
        await this.storePrediction({
          leadId: lead.id,
          predictionType: 'engagement_opportunity',
          riskScore: opportunity.score,
          confidenceLevel: opportunity.confidence,
          contributingFactors: opportunity.factors,
          recommendedActions: opportunity.actions
        });

        await this.generateEngagementMessage(lead, opportunity);
      }
    }
  }

  private async identifyEngagementOpportunity(lead: any): Promise<any> {
    let score = 0;
    const factors = [];
    const actions = [];

    const conversations = lead.conversations || [];
    const recentResponses = conversations.filter(c => 
      c.direction === 'in' && 
      new Date(c.sent_at) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    );

    // Recent engagement
    if (recentResponses.length > 0) {
      score += 0.3;
      factors.push('Recently responded');
    }

    // Positive sentiment in responses
    const positiveKeywords = ['interested', 'yes', 'sounds good', 'thank you', 'great'];
    const hasPositiveSentiment = recentResponses.some(r => 
      positiveKeywords.some(keyword => r.body?.toLowerCase().includes(keyword))
    );

    if (hasPositiveSentiment) {
      score += 0.4;
      factors.push('Positive response sentiment');
      actions.push('Offer test drive or appointment');
    }

    // Vehicle interest specificity
    if (lead.vehicle_interest && lead.vehicle_interest !== 'General Inquiry') {
      score += 0.2;
      factors.push('Specific vehicle interest');
      actions.push('Share matching inventory');
    }

    // Timing opportunity (weekday mornings tend to be better)
    const now = new Date();
    const isOptimalTime = now.getDay() >= 1 && now.getDay() <= 5 && now.getHours() >= 9 && now.getHours() <= 11;
    if (isOptimalTime) {
      score += 0.1;
      factors.push('Optimal engagement timing');
    }

    return {
      score: Math.min(score, 1.0),
      confidence: Math.min(factors.length * 0.2, 0.8),
      factors,
      actions
    };
  }

  // Detect appointment readiness
  private async detectAppointmentReadiness(): Promise<void> {
    console.log('📅 [PROACTIVE] Detecting appointment readiness...');

    // Get leads with engagement patterns suggesting appointment readiness
    const { data: engagedLeads, error } = await supabase
      .from('leads')
      .select(`
        id, first_name, vehicle_interest, last_reply_at,
        conversations!inner(id, sent_at, direction, body)
      `)
      .eq('status', 'active')
      .gte('last_reply_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString());

    if (error || !engagedLeads) {
      console.error('Failed to get engaged leads:', error);
      return;
    }

    for (const lead of engagedLeads) {
      const readiness = await this.assessAppointmentReadiness(lead);
      
      if (readiness.score > 0.75) {
        await this.storePrediction({
          leadId: lead.id,
          predictionType: 'appointment_ready',
          riskScore: readiness.score,
          confidenceLevel: readiness.confidence,
          contributingFactors: readiness.factors,
          recommendedActions: readiness.actions
        });

        await this.generateAppointmentMessage(lead, readiness);
      }
    }
  }

  private async assessAppointmentReadiness(lead: any): Promise<any> {
    let score = 0;
    const factors = [];
    const actions = [];

    const conversations = lead.conversations || [];
    const recentMessages = conversations.filter(c => 
      new Date(c.sent_at) > new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    );

    // Check for appointment-related keywords
    const appointmentKeywords = ['schedule', 'appointment', 'visit', 'come in', 'test drive', 'see the car'];
    const hasAppointmentIntent = recentMessages.some(m => 
      appointmentKeywords.some(keyword => m.body?.toLowerCase().includes(keyword))
    );

    if (hasAppointmentIntent) {
      score += 0.5;
      factors.push('Mentioned scheduling or visiting');
      actions.push('Offer specific appointment times');
    }

    // Check for decision-making language
    const decisionKeywords = ['ready', 'decide', 'choose', 'pick', 'buy', 'purchase'];
    const hasDecisionIntent = recentMessages.some(m => 
      decisionKeywords.some(keyword => m.body?.toLowerCase().includes(keyword))
    );

    if (hasDecisionIntent) {
      score += 0.3;
      factors.push('Decision-making language detected');
      actions.push('Schedule immediate consultation');
    }

    // Multiple recent interactions
    const customerMessages = recentMessages.filter(m => m.direction === 'in');
    if (customerMessages.length >= 3) {
      score += 0.2;
      factors.push('High recent engagement');
      actions.push('Capitalize on engagement momentum');
    }

    return {
      score: Math.min(score, 1.0),
      confidence: Math.min(factors.length * 0.25, 0.9),
      factors,
      actions
    };
  }

  // Check for inventory matches and opportunities
  private async checkInventoryMatches(): Promise<void> {
    console.log('🚗 [PROACTIVE] Checking inventory matches...');

    // Get recent inventory additions
    const { data: newInventory, error: invError } = await supabase
      .from('inventory')
      .select('id, make, model, year, price, created_at')
      .eq('status', 'available')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (invError || !newInventory) {
      console.error('Failed to get new inventory:', invError);
      return;
    }

    // Get active leads with vehicle interests
    const { data: interestedLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, first_name, vehicle_interest, last_reply_at')
      .eq('status', 'active')
      .neq('vehicle_interest', 'General Inquiry');

    if (leadsError || !interestedLeads) {
      console.error('Failed to get interested leads:', leadsError);
      return;
    }

    // Match inventory to leads
    for (const vehicle of newInventory) {
      const matchingLeads = interestedLeads.filter(lead => 
        this.matchesVehicleInterest(lead.vehicle_interest, vehicle)
      );

      for (const lead of matchingLeads) {
        await this.generateInventoryAlert(lead, vehicle);
      }
    }
  }

  private matchesVehicleInterest(interest: string, vehicle: any): boolean {
    const interestLower = interest.toLowerCase();
    const vehicleDesc = `${vehicle.make} ${vehicle.model} ${vehicle.year}`.toLowerCase();
    
    // Simple matching logic - can be enhanced with ML
    return interestLower.includes(vehicle.make.toLowerCase()) ||
           interestLower.includes(vehicle.model.toLowerCase()) ||
           vehicleDesc.includes(interestLower.split(' ')[0]);
  }

  // Store prediction in database
  private async storePrediction(prediction: EngagementPrediction): Promise<void> {
    await supabase
      .from('ai_engagement_predictions')
      .insert({
        lead_id: prediction.leadId,
        prediction_type: prediction.predictionType,
        risk_score: prediction.riskScore,
        confidence_level: prediction.confidenceLevel,
        contributing_factors: prediction.contributingFactors,
        recommended_actions: prediction.recommendedActions,
        expires_at: prediction.expiresAt?.toISOString()
      });
  }

  // Generate proactive messages
  private async generateRetentionMessage(lead: any, churnRisk: any): Promise<void> {
    const message = `Hi ${lead.first_name}, I wanted to check in with you about your vehicle search. ` +
                   `I have some new options that might interest you. When would be a good time to chat?`;

    await this.scheduleProactiveMessage({
      leadId: lead.id,
      actionType: 'retention_message',
      messageContent: message,
      urgencyLevel: churnRisk.riskScore > 0.8 ? 'high' : 'medium'
    });
  }

  private async generateEngagementMessage(lead: any, opportunity: any): Promise<void> {
    const message = `Hi ${lead.first_name}, I noticed you've been looking at vehicles recently. ` +
                   `I'd love to help you find the perfect match. Are you available for a quick call this week?`;

    await this.scheduleProactiveMessage({
      leadId: lead.id,
      actionType: 'follow_up',
      messageContent: message,
      urgencyLevel: 'medium'
    });
  }

  private async generateAppointmentMessage(lead: any, readiness: any): Promise<void> {
    const message = `Hi ${lead.first_name}, it sounds like you're ready to take the next step! ` +
                   `I have availability this week for a test drive. What day works best for you?`;

    await this.scheduleProactiveMessage({
      leadId: lead.id,
      actionType: 'appointment_reminder',
      messageContent: message,
      urgencyLevel: 'high'
    });
  }

  private async generateInventoryAlert(lead: any, vehicle: any): Promise<void> {
    const message = `Hi ${lead.first_name}, great news! We just got in a ${vehicle.year} ${vehicle.make} ${vehicle.model} ` +
                   `that matches what you're looking for. Would you like to schedule a time to see it?`;

    await this.scheduleProactiveMessage({
      leadId: lead.id,
      actionType: 'inventory_alert',
      messageContent: message,
      urgencyLevel: 'medium',
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    });
  }

  // Schedule proactive message
  private async scheduleProactiveMessage(action: ProactiveAction): Promise<void> {
    const scheduledTime = action.scheduledFor || new Date(Date.now() + 30 * 60 * 1000); // 30 minutes default

    await supabase
      .from('ai_message_approval_queue')
      .insert({
        lead_id: action.leadId,
        message_content: action.messageContent,
        urgency_level: action.urgencyLevel,
        message_stage: action.actionType,
        scheduled_send_at: scheduledTime.toISOString(),
        auto_approved: action.urgencyLevel !== 'high' // High urgency requires manual approval
      });
  }

  // Get proactive insights for dashboard
  async getProactiveInsights(): Promise<any> {
    const { data: predictions, error } = await supabase
      .from('ai_engagement_predictions')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error || !predictions) {
      console.error('Failed to get proactive insights:', error);
      return null;
    }

    const insights = {
      total_predictions: predictions.length,
      churn_risks: predictions.filter(p => p.prediction_type === 'churn_risk').length,
      engagement_opportunities: predictions.filter(p => p.prediction_type === 'engagement_opportunity').length,
      appointment_ready: predictions.filter(p => p.prediction_type === 'appointment_ready').length,
      high_confidence_predictions: predictions.filter(p => p.confidence_level > 0.8).length,
      acted_upon: predictions.filter(p => p.acted_upon).length
    };

    return insights;
  }

  // Mark prediction as acted upon
  async markPredictionActedUpon(predictionId: string): Promise<void> {
    await supabase
      .from('ai_engagement_predictions')
      .update({ 
        acted_upon: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', predictionId);
  }
}

export const proactiveEngagementService = ProactiveEngagementService.getInstance();