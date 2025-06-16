
import { supabase } from '@/integrations/supabase/client';

export interface LeadScore {
  leadId: string;
  overallScore: number;
  engagementScore: number;
  responseScore: number;
  sentimentScore: number;
  urgencyScore: number;
  scoreBreakdown: {
    messageFrequency: number;
    responseTime: number;
    conversationDepth: number;
    positiveKeywords: number;
    urgencyIndicators: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface ChurnPrediction {
  leadId: string;
  churnProbability: number;
  riskFactors: string[];
  lastActivity: string;
  daysSinceLastResponse: number;
  interventionSuggestions: string[];
}

export interface SalesPerformanceMetrics {
  salespersonId: string;
  salespersonName: string;
  totalLeads: number;
  responseRate: number;
  averageResponseTime: number;
  conversionRate: number;
  engagementQuality: number;
  conversationQualityScore: number;
  topPerformingMessages: string[];
  improvementAreas: string[];
}

export const calculateLeadScore = async (leadId: string): Promise<LeadScore> => {
  try {
    // Get lead and conversation data
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (!lead || !conversations) {
      throw new Error('Lead or conversation data not found');
    }

    const incomingMessages = conversations.filter(c => c.direction === 'in');
    const outgoingMessages = conversations.filter(c => c.direction === 'out');

    // Calculate engagement score (0-100)
    const messageFrequency = Math.min(incomingMessages.length * 10, 100);
    const conversationDepth = Math.min(conversations.length * 3, 100);
    const engagementScore = Math.round((messageFrequency + conversationDepth) / 2);

    // Calculate response score based on timing
    let responseScore = 0;
    if (incomingMessages.length > 0) {
      const responseTimes = [];
      for (let i = 0; i < incomingMessages.length; i++) {
        const incoming = incomingMessages[i];
        const previousOutgoing = outgoingMessages
          .filter(o => new Date(o.sent_at) < new Date(incoming.sent_at))
          .pop();
        
        if (previousOutgoing) {
          const timeDiff = new Date(incoming.sent_at).getTime() - new Date(previousOutgoing.sent_at).getTime();
          const hours = timeDiff / (1000 * 60 * 60);
          responseTimes.push(hours);
        }
      }

      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        // Score based on response time: < 1 hour = 100, < 4 hours = 80, < 24 hours = 60, etc.
        if (avgResponseTime < 1) responseScore = 100;
        else if (avgResponseTime < 4) responseScore = 80;
        else if (avgResponseTime < 24) responseScore = 60;
        else if (avgResponseTime < 72) responseScore = 40;
        else responseScore = 20;
      }
    }

    // Calculate sentiment score based on keywords
    const allText = incomingMessages.map(m => m.body.toLowerCase()).join(' ');
    const positiveKeywords = ['yes', 'interested', 'great', 'perfect', 'excellent', 'love', 'want', 'need'];
    const negativeKeywords = ['no', 'not interested', 'maybe later', 'busy', 'expensive', 'think about it'];
    
    const positiveCount = positiveKeywords.reduce((count, word) => 
      count + (allText.match(new RegExp(word, 'g')) || []).length, 0
    );
    const negativeCount = negativeKeywords.reduce((count, word) => 
      count + (allText.match(new RegExp(word, 'g')) || []).length, 0
    );

    const sentimentScore = Math.max(0, Math.min(100, 50 + (positiveCount - negativeCount) * 10));

    // Calculate urgency score
    const urgencyKeywords = ['asap', 'urgent', 'soon', 'immediately', 'this week', 'need now'];
    const urgencyCount = urgencyKeywords.reduce((count, word) => 
      count + (allText.match(new RegExp(word, 'g')) || []).length, 0
    );
    const urgencyScore = Math.min(urgencyCount * 25, 100);

    // Calculate overall score
    const overallScore = Math.round(
      (engagementScore * 0.3) + 
      (responseScore * 0.25) + 
      (sentimentScore * 0.25) + 
      (urgencyScore * 0.2)
    );

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (overallScore >= 70) riskLevel = 'low';
    else if (overallScore >= 40) riskLevel = 'medium';
    else riskLevel = 'high';

    // Generate recommendations
    const recommendations = [];
    if (responseScore < 50) recommendations.push('Follow up more promptly to improve response rates');
    if (sentimentScore < 40) recommendations.push('Focus on addressing concerns and building rapport');
    if (engagementScore < 30) recommendations.push('Increase engagement with more relevant content');
    if (urgencyScore > 70) recommendations.push('Prioritize this lead - high urgency indicators');

    return {
      leadId,
      overallScore,
      engagementScore,
      responseScore,
      sentimentScore,
      urgencyScore,
      scoreBreakdown: {
        messageFrequency: Math.round(messageFrequency),
        responseTime: Math.round(responseScore),
        conversationDepth: Math.round(conversationDepth),
        positiveKeywords: positiveCount,
        urgencyIndicators: urgencyCount
      },
      riskLevel,
      recommendations
    };
  } catch (error) {
    console.error('Error calculating lead score:', error);
    throw error;
  }
};

export const predictChurnRisk = async (leadId: string): Promise<ChurnPrediction> => {
  try {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false });

    if (!conversations) {
      throw new Error('Conversation data not found');
    }

    const lastIncoming = conversations.find(c => c.direction === 'in');
    const lastActivity = conversations[0]?.sent_at || new Date().toISOString();
    const daysSinceLastResponse = lastIncoming 
      ? Math.floor((Date.now() - new Date(lastIncoming.sent_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Calculate churn probability based on various factors
    let churnProbability = 0;
    const riskFactors = [];

    // Time-based factors
    if (daysSinceLastResponse > 7) {
      churnProbability += 30;
      riskFactors.push('No response in over a week');
    }
    if (daysSinceLastResponse > 14) {
      churnProbability += 25;
      riskFactors.push('No response in over two weeks');
    }

    // Engagement pattern analysis
    const recentConversations = conversations.slice(0, 10);
    const incomingCount = recentConversations.filter(c => c.direction === 'in').length;
    const outgoingCount = recentConversations.filter(c => c.direction === 'out').length;

    if (outgoingCount > incomingCount * 3) {
      churnProbability += 20;
      riskFactors.push('Low response rate to outgoing messages');
    }

    // Message content analysis
    const recentIncoming = recentConversations
      .filter(c => c.direction === 'in')
      .slice(0, 3);

    const coldKeywords = ['not interested', 'maybe later', 'busy', 'call back later', 'think about it'];
    const hasColdLanguage = recentIncoming.some(msg => 
      coldKeywords.some(keyword => msg.body.toLowerCase().includes(keyword))
    );

    if (hasColdLanguage) {
      churnProbability += 25;
      riskFactors.push('Recent messages show decreased interest');
    }

    // Cap at 100%
    churnProbability = Math.min(churnProbability, 100);

    // Generate intervention suggestions
    const interventionSuggestions = [];
    if (daysSinceLastResponse > 7) {
      interventionSuggestions.push('Send a re-engagement message with new inventory');
    }
    if (churnProbability > 60) {
      interventionSuggestions.push('Schedule a phone call to address concerns');
      interventionSuggestions.push('Offer special incentives or pricing');
    }
    if (hasColdLanguage) {
      interventionSuggestions.push('Address specific concerns mentioned in recent messages');
    }

    return {
      leadId,
      churnProbability: Math.round(churnProbability),
      riskFactors,
      lastActivity,
      daysSinceLastResponse,
      interventionSuggestions
    };
  } catch (error) {
    console.error('Error predicting churn risk:', error);
    throw error;
  }
};

export const calculateSalesPerformance = async (salespersonId: string): Promise<SalesPerformanceMetrics> => {
  try {
    // Get leads assigned to this salesperson
    const { data: leads } = await supabase
      .from('leads')
      .select(`
        id,
        status,
        created_at,
        conversations (
          id,
          direction,
          sent_at,
          ai_generated,
          body
        ),
        profiles (
          first_name,
          last_name
        )
      `)
      .eq('salesperson_id', salespersonId);

    if (!leads) {
      throw new Error('No leads found for salesperson');
    }

    const salespersonName = leads[0]?.profiles 
      ? `${leads[0].profiles.first_name} ${leads[0].profiles.last_name}`
      : 'Unknown';

    // Calculate metrics
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.status === 'closed').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Analyze conversations
    let totalResponses = 0;
    let totalOutgoing = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    const messageContent: string[] = [];

    leads.forEach(lead => {
      const conversations = lead.conversations || [];
      const incoming = conversations.filter(c => c.direction === 'in');
      const outgoing = conversations.filter(c => c.direction === 'out' && !c.ai_generated);

      totalResponses += incoming.length;
      totalOutgoing += outgoing.length;

      // Collect manual messages for analysis
      outgoing.forEach(msg => {
        if (msg.body.length < 200) { // Reasonable message length
          messageContent.push(msg.body);
        }
      });

      // Calculate response times
      incoming.forEach(inMsg => {
        const previousOutgoing = outgoing
          .filter(o => new Date(o.sent_at) < new Date(inMsg.sent_at))
          .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

        if (previousOutgoing) {
          const timeDiff = new Date(inMsg.sent_at).getTime() - new Date(previousOutgoing.sent_at).getTime();
          totalResponseTime += timeDiff / (1000 * 60 * 60); // Convert to hours
          responseTimeCount++;
        }
      });
    });

    const responseRate = totalOutgoing > 0 ? (totalResponses / totalOutgoing) * 100 : 0;
    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

    // Calculate engagement quality (based on response rate and conversion)
    const engagementQuality = Math.round((responseRate + conversionRate) / 2);

    // Analyze conversation quality
    const qualityIndicators = {
      questionsAsked: 0,
      personalTouch: 0,
      valueProps: 0,
      followUps: 0
    };

    messageContent.forEach(msg => {
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('?')) qualityIndicators.questionsAsked++;
      if (lowerMsg.includes('your') || lowerMsg.includes('you')) qualityIndicators.personalTouch++;
      if (lowerMsg.includes('special') || lowerMsg.includes('deal') || lowerMsg.includes('price')) qualityIndicators.valueProps++;
      if (lowerMsg.includes('follow up') || lowerMsg.includes('check in')) qualityIndicators.followUps++;
    });

    const conversationQualityScore = Math.min(100, 
      (qualityIndicators.questionsAsked * 5) +
      (qualityIndicators.personalTouch * 3) +
      (qualityIndicators.valueProps * 4) +
      (qualityIndicators.followUps * 6)
    );

    // Find top performing messages (most common patterns in converted leads)
    const convertedLeadConversations = leads
      .filter(l => l.status === 'closed')
      .flatMap(l => l.conversations?.filter(c => c.direction === 'out' && !c.ai_generated) || []);
    
    const topPerformingMessages = convertedLeadConversations
      .slice(0, 3)
      .map(c => c.body.substring(0, 100) + '...');

    // Generate improvement areas
    const improvementAreas = [];
    if (responseRate < 30) improvementAreas.push('Improve message engagement to increase response rates');
    if (averageResponseTime > 24) improvementAreas.push('Respond to leads more quickly');
    if (conversationQualityScore < 50) improvementAreas.push('Ask more qualifying questions');
    if (conversionRate < 10) improvementAreas.push('Focus on closing techniques and follow-up');

    return {
      salespersonId,
      salespersonName,
      totalLeads,
      responseRate: Math.round(responseRate),
      averageResponseTime: Math.round(averageResponseTime * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      engagementQuality: Math.round(engagementQuality),
      conversationQualityScore: Math.round(conversationQualityScore),
      topPerformingMessages,
      improvementAreas
    };
  } catch (error) {
    console.error('Error calculating sales performance:', error);
    throw error;
  }
};

export const getAdvancedAnalyticsDashboard = async () => {
  try {
    // Get all leads for overview metrics
    const { data: allLeads } = await supabase
      .from('leads')
      .select(`
        id,
        salesperson_id,
        status,
        conversations (
          direction,
          sent_at
        )
      `);

    if (!allLeads) return null;

    // Calculate lead scores for recent leads
    const recentLeads = allLeads.slice(0, 50); // Analyze most recent 50 leads
    const leadScores = await Promise.all(
      recentLeads.slice(0, 10).map(async (lead) => {
        try {
          return await calculateLeadScore(lead.id);
        } catch {
          return null;
        }
      })
    );

    const validScores = leadScores.filter(score => score !== null);

    // Calculate churn predictions
    const churnPredictions = await Promise.all(
      recentLeads.slice(0, 10).map(async (lead) => {
        try {
          return await predictChurnRisk(lead.id);
        } catch {
          return null;
        }
      })
    );

    const validChurnPredictions = churnPredictions.filter(pred => pred !== null);

    // Overall analytics
    const averageLeadScore = validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + score.overallScore, 0) / validScores.length
      : 0;

    const highRiskLeads = validChurnPredictions.filter(pred => pred.churnProbability > 60).length;
    const totalAnalyzedLeads = validChurnPredictions.length;

    return {
      averageLeadScore: Math.round(averageLeadScore),
      highRiskLeads,
      totalAnalyzedLeads,
      leadScoreDistribution: {
        high: validScores.filter(s => s.overallScore >= 70).length,
        medium: validScores.filter(s => s.overallScore >= 40 && s.overallScore < 70).length,
        low: validScores.filter(s => s.overallScore < 40).length
      },
      churnRiskDistribution: {
        high: validChurnPredictions.filter(p => p.churnProbability > 60).length,
        medium: validChurnPredictions.filter(p => p.churnProbability > 30 && p.churnProbability <= 60).length,
        low: validChurnPredictions.filter(p => p.churnProbability <= 30).length
      }
    };
  } catch (error) {
    console.error('Error getting analytics dashboard:', error);
    return null;
  }
};
