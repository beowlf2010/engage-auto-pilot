import { supabase } from '@/integrations/supabase/client';

interface MessageAnalysis {
  templateScore: number;
  leadCompatibility: number;
  timingScore: number;
  contentQuality: number;
  riskAssessment: number;
  overallScore: number;
  confidenceLevel: number;
  recommendation: 'auto_approve' | 'review_required' | 'reject' | 'enhance';
  reasoning: string[];
}

interface LeadCharacteristics {
  leadId: string;
  responseRate: number;
  avgResponseTime: number;
  leadTemperature: number;
  aiStage: string;
  lastInteractionTime: Date;
  conversationHistory: number;
}

interface TemplatePerformance {
  templateContent: string;
  responseRate: number;
  conversionRate: number;
  performanceScore: number;
  usageCount: number;
  avgResponseTime: number;
}

export class IntelligentAutoApprovalEngine {
  private static instance: IntelligentAutoApprovalEngine;
  private performanceCache = new Map<string, TemplatePerformance>();
  private learningData = new Map<string, any>();

  static getInstance(): IntelligentAutoApprovalEngine {
    if (!IntelligentAutoApprovalEngine.instance) {
      IntelligentAutoApprovalEngine.instance = new IntelligentAutoApprovalEngine();
    }
    return IntelligentAutoApprovalEngine.instance;
  }

  async analyzeMessageForAutoApproval(
    messageContent: string,
    leadId: string,
    urgencyLevel: 'low' | 'medium' | 'high'
  ): Promise<MessageAnalysis> {
    console.log('🧠 [AUTO-APPROVAL] Analyzing message for:', leadId);

    try {
      // Get lead characteristics
      const leadCharacteristics = await this.getLeadCharacteristics(leadId);
      
      // Get template performance data
      const templateScore = await this.calculateTemplateScore(messageContent);
      
      // Calculate lead compatibility
      const leadCompatibility = await this.calculateLeadCompatibility(messageContent, leadCharacteristics);
      
      // Calculate timing score
      const timingScore = await this.calculateTimingScore(leadId, urgencyLevel);
      
      // Assess content quality
      const contentQuality = await this.assessContentQuality(messageContent, leadId);
      
      // Risk assessment
      const riskAssessment = await this.assessRisk(messageContent, leadCharacteristics);
      
      // Calculate overall score with weighted factors
      const overallScore = this.calculateOverallScore({
        templateScore,
        leadCompatibility,
        timingScore,
        contentQuality,
        riskAssessment
      });

      // Determine confidence level based on data quality and historical accuracy
      const confidenceLevel = await this.calculateConfidenceLevel(leadId, messageContent);

      // Generate recommendation
      const recommendation = this.generateRecommendation(overallScore, confidenceLevel, riskAssessment);

      // Generate reasoning
      const reasoning = this.generateReasoning({
        templateScore,
        leadCompatibility,
        timingScore,
        contentQuality,
        riskAssessment,
        overallScore,
        confidenceLevel
      });

      const analysis: MessageAnalysis = {
        templateScore,
        leadCompatibility,
        timingScore,
        contentQuality,
        riskAssessment,
        overallScore,
        confidenceLevel,
        recommendation,
        reasoning
      };

      console.log('✅ [AUTO-APPROVAL] Analysis complete:', {
        overallScore,
        recommendation,
        confidenceLevel
      });

      // Store analysis for learning
      await this.storeAnalysisForLearning(leadId, messageContent, analysis);

      return analysis;

    } catch (error) {
      console.error('❌ [AUTO-APPROVAL] Analysis failed:', error);
      
      // Safe fallback
      return {
        templateScore: 50,
        leadCompatibility: 50,
        timingScore: 50,
        contentQuality: 50,
        riskAssessment: 50,
        overallScore: 50,
        confidenceLevel: 30,
        recommendation: 'review_required',
        reasoning: ['Analysis failed - requires manual review']
      };
    }
  }

  private async getLeadCharacteristics(leadId: string): Promise<LeadCharacteristics> {
    const { data: lead } = await supabase
      .from('leads')
      .select('ai_stage, last_reply_at, created_at')
      .eq('id', leadId)
      .single();

    const { data: conversations } = await supabase
      .from('conversations')
      .select('direction, sent_at')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (!lead || !conversations) {
      return {
        leadId,
        responseRate: 0,
        avgResponseTime: 24,
        leadTemperature: 50,
        aiStage: 'new',
        lastInteractionTime: new Date(),
        conversationHistory: 0
      };
    }

    // Calculate response rate
    const outbound = conversations.filter(c => c.direction === 'out').length;
    const inbound = conversations.filter(c => c.direction === 'in').length;
    const responseRate = outbound > 0 ? (inbound / outbound) * 100 : 0;

    // Calculate average response time
    const responseTimes: number[] = [];
    for (let i = 0; i < conversations.length - 1; i++) {
      const current = conversations[i];
      const next = conversations[i + 1];
      
      if (current.direction === 'in' && next.direction === 'out') {
        const timeDiff = new Date(current.sent_at).getTime() - new Date(next.sent_at).getTime();
        responseTimes.push(Math.abs(timeDiff) / (1000 * 60 * 60)); // hours
      }
    }
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 24;

    // Calculate lead temperature based on recent activity
    const hoursSinceLastReply = lead.last_reply_at 
      ? (Date.now() - new Date(lead.last_reply_at).getTime()) / (1000 * 60 * 60)
      : 168; // 1 week default

    const leadTemperature = Math.max(0, Math.min(100, 
      100 - (hoursSinceLastReply * 2) + (responseRate * 0.5)
    ));

    return {
      leadId,
      responseRate,
      avgResponseTime,
      leadTemperature,
      aiStage: lead.ai_stage || 'new',
      lastInteractionTime: new Date(lead.last_reply_at || lead.created_at),
      conversationHistory: conversations.length
    };
  }

  private async calculateTemplateScore(messageContent: string): Promise<number> {
    // Get cached performance data
    const cacheKey = this.generateMessageHash(messageContent);
    
    if (this.performanceCache.has(cacheKey)) {
      const cached = this.performanceCache.get(cacheKey)!;
      return Math.min(100, cached.performanceScore * 100);
    }

    // Query template performance
    const { data: performance } = await supabase
      .from('ai_template_performance')
      .select('*')
      .ilike('template_content', `%${messageContent.substring(0, 50)}%`)
      .order('performance_score', { ascending: false })
      .limit(1);

    if (performance && performance.length > 0) {
      const perf = performance[0];
      const score = Math.min(100, perf.performance_score * 100);
      
      // Cache the result
      this.performanceCache.set(cacheKey, {
        templateContent: messageContent,
        responseRate: perf.response_rate || 0,
        conversionRate: perf.conversion_rate || 0,
        performanceScore: perf.performance_score,
        usageCount: perf.usage_count,
        avgResponseTime: 24
      });
      
      return score;
    }

    // Check for similar templates using fuzzy matching
    const { data: similarTemplates } = await supabase
      .from('ai_template_performance')
      .select('*')
      .order('performance_score', { ascending: false })
      .limit(10);

    if (similarTemplates && similarTemplates.length > 0) {
      const avgScore = similarTemplates.reduce((sum, t) => sum + t.performance_score, 0) / similarTemplates.length;
      return Math.min(100, avgScore * 100);
    }

    return 50; // Default neutral score
  }

  private async calculateLeadCompatibility(messageContent: string, lead: LeadCharacteristics): Promise<number> {
    let score = 50; // Base score

    // Stage compatibility
    if (lead.aiStage === 'follow_up' && messageContent.toLowerCase().includes('follow')) {
      score += 20;
    } else if (lead.aiStage === 'new' && messageContent.toLowerCase().includes('welcome')) {
      score += 20;
    }

    // Response rate factor
    if (lead.responseRate > 70) {
      score += 15;
    } else if (lead.responseRate > 40) {
      score += 10;
    } else if (lead.responseRate < 20) {
      score -= 10;
    }

    // Lead temperature factor
    if (lead.leadTemperature > 80) {
      score += 15;
    } else if (lead.leadTemperature > 60) {
      score += 10;
    } else if (lead.leadTemperature < 30) {
      score -= 15;
    }

    // Conversation history factor
    if (lead.conversationHistory > 10) {
      score += 10; // Engaged lead
    } else if (lead.conversationHistory === 0) {
      score -= 5; // Cold lead
    }

    return Math.max(0, Math.min(100, score));
  }

  private async calculateTimingScore(leadId: string, urgencyLevel: string): Promise<number> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    let score = 50; // Base score

    // Business hours boost (9 AM - 5 PM)
    if (currentHour >= 9 && currentHour <= 17) {
      score += 20;
    } else if (currentHour >= 8 && currentHour <= 19) {
      score += 10;
    } else {
      score -= 15; // Outside reasonable hours
    }

    // Weekday boost
    if (currentDay >= 1 && currentDay <= 5) {
      score += 10;
    } else {
      score -= 5; // Weekend
    }

    // Urgency factor
    if (urgencyLevel === 'high') {
      score += 15; // High urgency can override timing concerns
    } else if (urgencyLevel === 'low') {
      score -= 5;
    }

    // Check recent message frequency
    const { data: recentMessages } = await supabase
      .from('conversations')
      .select('sent_at')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false });

    if (recentMessages && recentMessages.length > 3) {
      score -= 20; // Too many recent messages
    } else if (recentMessages && recentMessages.length > 1) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private async assessContentQuality(messageContent: string, leadId: string): Promise<number> {
    let score = 50; // Base score

    // Length check
    const wordCount = messageContent.split(' ').length;
    if (wordCount >= 10 && wordCount <= 50) {
      score += 15; // Good length
    } else if (wordCount < 5) {
      score -= 20; // Too short
    } else if (wordCount > 100) {
      score -= 10; // Too long
    }

    // Personalization check
    const { data: lead } = await supabase
      .from('leads')
      .select('first_name, vehicle_interest')
      .eq('id', leadId)
      .single();

    if (lead) {
      if (lead.first_name && messageContent.includes(lead.first_name)) {
        score += 15; // Personalized with name
      }
      
      if (lead.vehicle_interest && 
          messageContent.toLowerCase().includes(lead.vehicle_interest.toLowerCase().substring(0, 10))) {
        score += 10; // References vehicle interest
      }
    }

    // Tone and structure
    if (messageContent.includes('?')) {
      score += 5; // Includes question - engagement
    }
    
    if (messageContent.includes('!')) {
      score += 3; // Shows enthusiasm
    }

    // Professional language check
    const unprofessionalWords = ['urgent', 'limited time', 'act now', 'don\'t miss'];
    const foundUnprofessional = unprofessionalWords.some(word => 
      messageContent.toLowerCase().includes(word)
    );
    
    if (foundUnprofessional) {
      score -= 15; // Sounds too salesy
    }

    // Check for common courtesy words
    const courtesyWords = ['please', 'thank', 'appreciate', 'understand'];
    const foundCourtesy = courtesyWords.some(word => 
      messageContent.toLowerCase().includes(word)
    );
    
    if (foundCourtesy) {
      score += 10; // Polite tone
    }

    return Math.max(0, Math.min(100, score));
  }

  private async assessRisk(messageContent: string, lead: LeadCharacteristics): Promise<number> {
    let riskScore = 0; // Lower is better

    // Check for compliance violations
    const complianceWords = ['guaranteed', 'free', 'no obligation', 'limited time'];
    const foundCompliance = complianceWords.some(word => 
      messageContent.toLowerCase().includes(word)
    );
    
    if (foundCompliance) {
      riskScore += 30;
    }

    // Check message frequency risk
    if (lead.conversationHistory > 20) {
      riskScore += 15; // High message volume risk
    }

    // Low response rate risk
    if (lead.responseRate < 10 && lead.conversationHistory > 5) {
      riskScore += 20; // Potential harassment
    }

    // Generic message risk
    if (!messageContent.includes(lead.leadId) && 
        messageContent.length < 100 && 
        !messageContent.toLowerCase().includes('vehicle')) {
      riskScore += 10; // Possibly too generic
    }

    return Math.min(100, riskScore);
  }

  private calculateOverallScore(scores: {
    templateScore: number;
    leadCompatibility: number;
    timingScore: number;
    contentQuality: number;
    riskAssessment: number;
  }): number {
    // Weighted scoring
    const weights = {
      templateScore: 0.3,      // 30% - Historical performance is crucial
      leadCompatibility: 0.25, // 25% - Lead fit is important
      contentQuality: 0.2,     // 20% - Message quality matters
      timingScore: 0.15,       // 15% - Timing is somewhat important
      riskAssessment: 0.1      // 10% - Risk mitigation
    };

    const weightedScore = (
      scores.templateScore * weights.templateScore +
      scores.leadCompatibility * weights.leadCompatibility +
      scores.contentQuality * weights.contentQuality +
      scores.timingScore * weights.timingScore +
      (100 - scores.riskAssessment) * weights.riskAssessment // Invert risk
    );

    return Math.max(0, Math.min(100, weightedScore));
  }

  private async calculateConfidenceLevel(leadId: string, messageContent: string): Promise<number> {
    // Check data quality
    let confidence = 50;

    // Template performance data availability
    const hasTemplateData = this.performanceCache.has(this.generateMessageHash(messageContent));
    if (hasTemplateData) {
      confidence += 20;
    }

    // Lead history depth
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', leadId);

    if (conversations && conversations.length > 10) {
      confidence += 15;
    } else if (conversations && conversations.length > 5) {
      confidence += 10;
    }

    // Feedback data availability
    const { data: feedback } = await supabase
      .from('ai_message_feedback')
      .select('id')
      .eq('lead_id', leadId)
      .limit(1);

    if (feedback && feedback.length > 0) {
      confidence += 15;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  private generateRecommendation(
    overallScore: number, 
    confidenceLevel: number, 
    riskScore: number
  ): 'auto_approve' | 'review_required' | 'reject' | 'enhance' {
    // High risk always requires review
    if (riskScore > 50) {
      return 'review_required';
    }

    // High confidence and high score = auto approve
    if (overallScore >= 85 && confidenceLevel >= 80) {
      return 'auto_approve';
    }

    // Good score but lower confidence = review
    if (overallScore >= 75 && confidenceLevel >= 60) {
      return 'review_required';
    }

    // Low score = enhance or reject
    if (overallScore < 40) {
      return confidenceLevel > 70 ? 'enhance' : 'reject';
    }

    // Default to review for middle ground
    return 'review_required';
  }

  private generateReasoning(analysis: {
    templateScore: number;
    leadCompatibility: number;
    timingScore: number;
    contentQuality: number;
    riskAssessment: number;
    overallScore: number;
    confidenceLevel: number;
  }): string[] {
    const reasoning: string[] = [];

    if (analysis.templateScore > 80) {
      reasoning.push(`✅ Excellent template performance (${analysis.templateScore.toFixed(1)}%)`);
    } else if (analysis.templateScore < 40) {
      reasoning.push(`⚠️ Low template performance (${analysis.templateScore.toFixed(1)}%)`);
    }

    if (analysis.leadCompatibility > 80) {
      reasoning.push(`✅ High lead compatibility (${analysis.leadCompatibility.toFixed(1)}%)`);
    } else if (analysis.leadCompatibility < 40) {
      reasoning.push(`⚠️ Poor lead compatibility (${analysis.leadCompatibility.toFixed(1)}%)`);
    }

    if (analysis.timingScore > 80) {
      reasoning.push(`✅ Optimal timing (${analysis.timingScore.toFixed(1)}%)`);
    } else if (analysis.timingScore < 40) {
      reasoning.push(`⚠️ Suboptimal timing (${analysis.timingScore.toFixed(1)}%)`);
    }

    if (analysis.contentQuality > 80) {
      reasoning.push(`✅ High content quality (${analysis.contentQuality.toFixed(1)}%)`);
    } else if (analysis.contentQuality < 40) {
      reasoning.push(`⚠️ Content needs improvement (${analysis.contentQuality.toFixed(1)}%)`);
    }

    if (analysis.riskAssessment > 50) {
      reasoning.push(`🚨 High risk factors detected (${analysis.riskAssessment.toFixed(1)}%)`);
    } else if (analysis.riskAssessment < 20) {
      reasoning.push(`✅ Low risk assessment (${analysis.riskAssessment.toFixed(1)}%)`);
    }

    reasoning.push(`Overall Score: ${analysis.overallScore.toFixed(1)}% (Confidence: ${analysis.confidenceLevel.toFixed(1)}%)`);

    return reasoning;
  }

  private async storeAnalysisForLearning(
    leadId: string, 
    messageContent: string, 
    analysis: MessageAnalysis
  ): Promise<void> {
    try {
      await supabase
        .from('ai_quality_scores')
        .insert({
          lead_id: leadId,
          message_content: messageContent,
          overall_score: analysis.overallScore,
          relevance_score: analysis.leadCompatibility,
          personalization_score: analysis.contentQuality,
          tone_appropriateness_score: analysis.timingScore,
          compliance_score: 100 - analysis.riskAssessment,
          approved_for_sending: analysis.recommendation === 'auto_approve',
          quality_factors: {
            template_score: analysis.templateScore,
            timing_score: analysis.timingScore,
            confidence_level: analysis.confidenceLevel,
            recommendation: analysis.recommendation,
            reasoning: analysis.reasoning
          }
        });
    } catch (error) {
      console.error('Failed to store analysis for learning:', error);
    }
  }

  private generateMessageHash(content: string): string {
    // Simple hash for caching
    return btoa(content.substring(0, 100)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  }

  // Learning methods
  async learnFromFeedback(
    messageId: string, 
    wasApproved: boolean, 
    actualPerformance?: { responseReceived: boolean; responseTime?: number }
  ): Promise<void> {
    try {
      const { data: qualityScore } = await supabase
        .from('ai_quality_scores')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (qualityScore) {
        // Update learning data based on actual performance
        const learningInsight = {
          predicted_score: qualityScore.overall_score,
          actual_approval: wasApproved,
          actual_performance: actualPerformance,
          accuracy: this.calculateAccuracy(qualityScore.overall_score, wasApproved),
          timestamp: new Date().toISOString()
        };

        await supabase
          .from('ai_learning_insights')
          .insert({
            insight_type: 'approval_accuracy',
            insight_title: 'Auto-Approval Prediction Accuracy',
            insight_description: `Predicted: ${qualityScore.overall_score}%, Actual: ${wasApproved ? 'Approved' : 'Rejected'}`,
            confidence_score: learningInsight.accuracy,
            actionable: true,
            insight_data: learningInsight,
            lead_id: qualityScore.lead_id
          });
      }
    } catch (error) {
      console.error('Failed to learn from feedback:', error);
    }
  }

  private calculateAccuracy(predictedScore: number, wasApproved: boolean): number {
    const predicted = predictedScore > 75; // Our approval threshold
    const actual = wasApproved;
    return predicted === actual ? 100 : 0;
  }

  // Cache management
  clearCache(): void {
    this.performanceCache.clear();
    this.learningData.clear();
  }

  getCacheStats(): { performance: number; learning: number } {
    return {
      performance: this.performanceCache.size,
      learning: this.learningData.size
    };
  }
}

export const intelligentAutoApproval = IntelligentAutoApprovalEngine.getInstance();