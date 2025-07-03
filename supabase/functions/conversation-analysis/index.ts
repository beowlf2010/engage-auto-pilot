import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversationAnalysisRequest {
  leadId: string;
  analysisType: 'insights' | 'metrics' | 'response' | 'prioritization';
  messageContext?: {
    latestMessage: string;
    conversationHistory: string[];
    vehicleInterest: string;
    leadName: string;
  };
}

interface BuyingSignal {
  type: string;
  confidence: number;
  detected_text: string;
}

interface ConversationInsight {
  type: 'buying_signal' | 'urgency' | 'sentiment' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, analysisType, messageContext }: ConversationAnalysisRequest = await req.json();

    console.log(`🧠 [CONVERSATION-ANALYSIS] Processing ${analysisType} for lead:`, leadId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (analysisType) {
      case 'insights':
        return await generateInsights(supabaseClient, leadId, messageContext);
      
      case 'metrics':
        return await calculateMetrics(supabaseClient, leadId, messageContext);
      
      case 'response':
        return await generateResponse(supabaseClient, leadId, messageContext);
      
      case 'prioritization':
        return await calculatePriority(supabaseClient, leadId, messageContext);
      
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }

  } catch (error) {
    console.error('❌ [CONVERSATION-ANALYSIS] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateInsights(
  supabaseClient: any, 
  leadId: string, 
  messageContext?: any
): Promise<Response> {
  console.log('🔍 [INSIGHTS] Generating conversation insights for lead:', leadId);

  // Get conversation data
  const { data: conversations } = await supabaseClient
    .from('conversations')
    .select('body, direction, sent_at')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: true })
    .limit(20);

  const { data: lead } = await supabaseClient
    .from('leads')
    .select('first_name, vehicle_interest, status, created_at')
    .eq('id', leadId)
    .single();

  if (!lead) {
    throw new Error('Lead not found');
  }

  const insights: ConversationInsight[] = [];
  const latestMessage = messageContext?.latestMessage || conversations?.[conversations.length - 1]?.body || '';

  // Analyze buying signals
  const buyingSignals = detectBuyingSignals(latestMessage, lead.vehicle_interest);
  if (buyingSignals.length > 0) {
    insights.push({
      type: 'buying_signal',
      title: 'Strong Buying Signals Detected',
      description: `Customer showing: ${buyingSignals.map(s => s.type).join(', ')}`,
      confidence: Math.max(...buyingSignals.map(s => s.confidence)),
      actionable: true,
      priority: 'high'
    });
  }

  // Analyze urgency
  const urgencyAnalysis = analyzeUrgency(conversations || [], latestMessage);
  if (urgencyAnalysis.level !== 'low') {
    insights.push({
      type: 'urgency',
      title: `${urgencyAnalysis.level.charAt(0).toUpperCase() + urgencyAnalysis.level.slice(1)} Urgency`,
      description: urgencyAnalysis.reason,
      confidence: urgencyAnalysis.confidence,
      actionable: true,
      priority: urgencyAnalysis.level === 'high' ? 'high' : 'medium'
    });
  }

  // Analyze sentiment
  const sentiment = analyzeSentiment(latestMessage);
  if (sentiment.needsAttention) {
    insights.push({
      type: 'sentiment',
      title: 'Sentiment Alert',
      description: sentiment.description,
      confidence: sentiment.confidence,
      actionable: true,
      priority: sentiment.severity
    });
  }

  // Generate recommendation
  const recommendation = generateRecommendation(buyingSignals, urgencyAnalysis, conversations || []);
  insights.push({
    type: 'recommendation',
    title: 'AI Recommendation',
    description: recommendation.action,
    confidence: recommendation.confidence,
    actionable: true,
    priority: 'medium'
  });

  console.log(`✅ [INSIGHTS] Generated ${insights.length} insights for lead ${leadId}`);

  return new Response(JSON.stringify({ insights }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function calculateMetrics(
  supabaseClient: any, 
  leadId: string, 
  messageContext?: any
): Promise<Response> {
  console.log('📊 [METRICS] Calculating conversation metrics for lead:', leadId);

  // Get conversation data
  const { data: conversations } = await supabaseClient
    .from('conversations')
    .select('body, direction, sent_at')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: true });

  const { data: lead } = await supabaseClient
    .from('leads')
    .select('first_name, vehicle_interest, status, created_at')
    .eq('id', leadId)
    .single();

  if (!lead || !conversations) {
    throw new Error('Lead or conversation data not found');
  }

  const latestMessage = messageContext?.latestMessage || conversations[conversations.length - 1]?.body || '';
  
  // Calculate metrics
  const buyingSignals = detectBuyingSignals(latestMessage, lead.vehicle_interest);
  const urgencyAnalysis = analyzeUrgency(conversations, latestMessage);
  const sentiment = analyzeSentiment(latestMessage);
  const engagement = calculateEngagement(conversations);

  const metrics = {
    confidence: calculateOverallConfidence(buyingSignals, urgencyAnalysis, sentiment),
    urgencyLevel: urgencyAnalysis.level,
    buyingSignals: buyingSignals.map(s => s.type),
    nextBestAction: determineNextBestAction(buyingSignals, urgencyAnalysis, engagement),
    responseStrategy: determineResponseStrategy(buyingSignals, urgencyAnalysis, engagement),
    sentimentScore: sentiment.score,
    engagementScore: engagement.score,
    conversationStage: determineConversationStage(conversations, lead),
    momentum: calculateMomentum(conversations),
    responseTime: calculateAverageResponseTime(conversations)
  };

  console.log('✅ [METRICS] Calculated metrics for lead:', leadId, {
    confidence: Math.round(metrics.confidence * 100) + '%',
    urgency: metrics.urgencyLevel,
    engagement: Math.round(metrics.engagementScore * 100) + '%'
  });

  return new Response(JSON.stringify({ metrics }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateResponse(
  supabaseClient: any, 
  leadId: string, 
  messageContext?: any
): Promise<Response> {
  console.log('🤖 [RESPONSE] Generating AI response for lead:', leadId);

  if (!messageContext) {
    throw new Error('Message context required for response generation');
  }

  const { latestMessage, conversationHistory, vehicleInterest, leadName } = messageContext;

  // Analyze message intent
  const intent = analyzeMessageIntent(latestMessage);
  const buyingSignals = detectBuyingSignals(latestMessage, vehicleInterest);
  
  // Generate contextual response
  const response = generateContextualResponse({
    leadName,
    latestMessage,
    vehicleInterest,
    intent,
    buyingSignals,
    conversationHistory
  });

  console.log(`✅ [RESPONSE] Generated ${response.responseType} response for lead ${leadId}`);

  return new Response(JSON.stringify({ response }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function calculatePriority(
  supabaseClient: any, 
  leadId: string, 
  messageContext?: any
): Promise<Response> {
  console.log('⚡ [PRIORITY] Calculating priority score for lead:', leadId);

  // Get lead data
  const { data: lead } = await supabaseClient
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  const { data: conversations } = await supabaseClient
    .from('conversations')
    .select('body, direction, sent_at')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(10);

  if (!lead) {
    throw new Error('Lead not found');
  }

  let priorityScore = 0;
  const factors: string[] = [];

  // Unread messages weight
  const unreadCount = conversations?.filter(c => c.direction === 'in' && !c.read_at).length || 0;
  if (unreadCount > 3) {
    priorityScore += 40;
    factors.push(`${unreadCount} unread messages`);
  } else if (unreadCount > 1) {
    priorityScore += 20;
    factors.push('Multiple unread messages');
  }

  // Recent activity weight
  const latestMessage = conversations?.[0];
  if (latestMessage) {
    const hoursSinceLastMessage = (Date.now() - new Date(latestMessage.sent_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastMessage < 1) {
      priorityScore += 25;
      factors.push('Very recent activity');
    } else if (hoursSinceLastMessage < 4) {
      priorityScore += 15;
      factors.push('Recent activity');
    }
  }

  // Buying signals weight
  const latestMessageBody = latestMessage?.body || '';
  const buyingSignals = detectBuyingSignals(latestMessageBody, lead.vehicle_interest);
  priorityScore += buyingSignals.length * 15;
  if (buyingSignals.length > 0) {
    factors.push(`${buyingSignals.length} buying signals`);
  }

  // Engagement weight
  const engagement = calculateEngagement(conversations || []);
  priorityScore += engagement.score * 25;
  if (engagement.score > 0.7) {
    factors.push('High engagement');
  }

  // Lead status weight
  if (lead.status === 'hot') {
    priorityScore += 30;
    factors.push('Hot lead status');
  } else if (lead.status === 'warm') {
    priorityScore += 15;
    factors.push('Warm lead status');
  }

  const finalScore = Math.min(100, Math.max(0, priorityScore));

  console.log(`✅ [PRIORITY] Priority score for lead ${leadId}: ${finalScore}%, factors: ${factors.join(', ')}`);

  return new Response(JSON.stringify({ 
    priorityScore: finalScore,
    factors,
    urgencyLevel: finalScore >= 70 ? 'high' : finalScore >= 40 ? 'medium' : 'low'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper functions
function detectBuyingSignals(message: string, vehicleInterest?: string): BuyingSignal[] {
  if (!message) return [];

  const signals: BuyingSignal[] = [];
  const lowerMessage = message.toLowerCase();

  const signalPatterns = [
    { pattern: /(price|cost|payment|afford)/i, type: 'Price Inquiry', confidence: 0.8 },
    { pattern: /(schedule|appointment|visit|see it|test drive)/i, type: 'Scheduling Interest', confidence: 0.9 },
    { pattern: /(available|in stock|still have)/i, type: 'Availability Check', confidence: 0.7 },
    { pattern: /(finance|loan|credit|monthly)/i, type: 'Financing Interest', confidence: 0.75 },
    { pattern: /(trade|exchange)/i, type: 'Trade-In Interest', confidence: 0.7 },
    { pattern: /(soon|quickly|asap|urgent)/i, type: 'Urgency Expressed', confidence: 0.8 }
  ];

  signalPatterns.forEach(({ pattern, type, confidence }) => {
    const match = message.match(pattern);
    if (match) {
      signals.push({
        type,
        confidence,
        detected_text: match[0]
      });
    }
  });

  return signals;
}

function analyzeUrgency(conversations: any[], latestMessage: string): {
  level: 'low' | 'medium' | 'high',
  reason: string,
  confidence: number
} {
  let urgencyScore = 0;
  const reasons: string[] = [];

  // Check message frequency
  const recentMessages = conversations.filter(c => {
    const messageTime = new Date(c.sent_at).getTime();
    const hoursAgo = (Date.now() - messageTime) / (1000 * 60 * 60);
    return hoursAgo < 24;
  });

  if (recentMessages.length > 5) {
    urgencyScore += 30;
    reasons.push('High message frequency');
  }

  // Check for urgent language
  const urgentWords = ['urgent', 'asap', 'quickly', 'soon', 'need now', 'immediately'];
  const hasUrgentLanguage = urgentWords.some(word => latestMessage.toLowerCase().includes(word));
  if (hasUrgentLanguage) {
    urgencyScore += 40;
    reasons.push('Urgent language detected');
  }

  // Check response timing
  const customerMessages = conversations.filter(c => c.direction === 'in');
  if (customerMessages.length > 0) {
    const latestCustomerMessage = customerMessages[0];
    const hoursAgo = (Date.now() - new Date(latestCustomerMessage.sent_at).getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 1) {
      urgencyScore += 25;
      reasons.push('Very recent customer message');
    }
  }

  let level: 'low' | 'medium' | 'high' = 'low';
  if (urgencyScore >= 50) level = 'high';
  else if (urgencyScore >= 25) level = 'medium';

  return {
    level,
    reason: reasons.join(', ') || 'Standard follow-up timing',
    confidence: Math.min(0.95, urgencyScore / 100)
  };
}

function analyzeSentiment(message: string): {
  score: number,
  needsAttention: boolean,
  description: string,
  confidence: number,
  severity: 'low' | 'medium' | 'high'
} {
  if (!message) {
    return { score: 0.5, needsAttention: false, description: 'Neutral', confidence: 0.5, severity: 'low' };
  }

  const lowerMessage = message.toLowerCase();
  let sentimentScore = 0.5;

  // Positive indicators
  const positiveWords = ['great', 'excellent', 'perfect', 'love', 'interested', 'excited', 'good', 'thanks'];
  const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
  sentimentScore += positiveCount * 0.1;

  // Negative indicators
  const negativeWords = ['disappointed', 'frustrated', 'annoyed', 'upset', 'angry', 'terrible', 'awful'];
  const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
  sentimentScore -= negativeCount * 0.2;

  sentimentScore = Math.min(1, Math.max(0, sentimentScore));

  const needsAttention = sentimentScore < 0.3;
  let description = 'Neutral sentiment';
  let severity: 'low' | 'medium' | 'high' = 'low';

  if (sentimentScore >= 0.7) {
    description = 'Positive sentiment';
  } else if (sentimentScore <= 0.3) {
    description = 'Negative sentiment - needs attention';
    severity = negativeCount > 1 ? 'high' : 'medium';
  }

  return {
    score: sentimentScore,
    needsAttention,
    description,
    confidence: 0.75,
    severity
  };
}

function calculateEngagement(conversations: any[]): { score: number, factors: string[] } {
  if (!conversations || conversations.length === 0) {
    return { score: 0.3, factors: ['No conversation history'] };
  }

  let engagementScore = 0.5;
  const factors: string[] = [];

  const customerMessages = conversations.filter(c => c.direction === 'in');
  
  // Message frequency
  if (customerMessages.length > 10) {
    engagementScore += 0.2;
    factors.push('High message volume');
  } else if (customerMessages.length > 5) {
    engagementScore += 0.1;
    factors.push('Good message volume');
  }

  // Message length
  const avgLength = customerMessages.reduce((sum, msg) => sum + msg.body.length, 0) / customerMessages.length;
  if (avgLength > 100) {
    engagementScore += 0.2;
    factors.push('Detailed messages');
  }

  // Questions indicate engagement
  const questionCount = customerMessages.filter(msg => msg.body.includes('?')).length;
  if (questionCount > 0) {
    engagementScore += Math.min(0.2, questionCount * 0.05);
    factors.push(`${questionCount} questions asked`);
  }

  return {
    score: Math.min(1, Math.max(0, engagementScore)),
    factors
  };
}

function analyzeMessageIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('pic') || lowerMessage.includes('photo')) {
    return 'photo_request';
  } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return 'price_inquiry';
  } else if (lowerMessage.includes('available') || lowerMessage.includes('in stock')) {
    return 'availability_inquiry';
  } else if (lowerMessage.includes('schedule') || lowerMessage.includes('appointment')) {
    return 'appointment_request';
  } else if (lowerMessage.includes('?')) {
    return 'question';
  } else if (lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
    return 'greeting';
  } else {
    return 'general_inquiry';
  }
}

function generateContextualResponse(context: any): any {
  const { leadName, latestMessage, vehicleInterest, intent, buyingSignals } = context;

  const responses = {
    photo_request: {
      message: `Hi ${leadName}! I'd love to get you photos of ${vehicleInterest || 'the vehicle'}. Let me gather the best shots for you right away!`,
      confidence: 0.85,
      responseType: 'vehicle_inquiry'
    },
    price_inquiry: {
      message: `Hi ${leadName}! I'd be happy to discuss pricing for ${vehicleInterest || 'the vehicle you\'re interested in'}. Let me get you the most current information.`,
      confidence: 0.8,
      responseType: 'vehicle_inquiry'
    },
    appointment_request: {
      message: `Hi ${leadName}! I'd be happy to schedule a time for you to see ${vehicleInterest || 'the vehicle'}. When works best for your schedule?`,
      confidence: 0.9,
      responseType: 'follow_up'
    },
    general_inquiry: {
      message: `Hi ${leadName}! Thanks for your message. I'm here to help with ${vehicleInterest || 'finding the perfect vehicle'}. What questions can I answer?`,
      confidence: 0.65,
      responseType: 'general'
    }
  };

  return responses[intent as keyof typeof responses] || responses.general_inquiry;
}

function generateRecommendation(buyingSignals: BuyingSignal[], urgencyAnalysis: any, conversations: any[]): {
  action: string,
  confidence: number
} {
  if (buyingSignals.some(s => s.type === 'Scheduling Interest')) {
    return { action: 'Schedule a test drive or appointment immediately', confidence: 0.9 };
  }

  if (buyingSignals.some(s => s.type === 'Price Inquiry')) {
    return { action: 'Provide pricing and financing options', confidence: 0.85 };
  }

  if (urgencyAnalysis.level === 'high') {
    return { action: 'Respond immediately - high urgency detected', confidence: 0.8 };
  }

  if (buyingSignals.length > 0) {
    return { action: 'Follow up on buying signals with more information', confidence: 0.7 };
  }

  return { action: 'Continue building rapport and identifying needs', confidence: 0.6 };
}

function calculateOverallConfidence(buyingSignals: BuyingSignal[], urgencyAnalysis: any, sentiment: any): number {
  let confidence = 0.5;
  
  // Add confidence from buying signals
  if (buyingSignals.length > 0) {
    confidence += Math.max(...buyingSignals.map(s => s.confidence)) * 0.3;
  }
  
  // Add confidence from urgency
  confidence += urgencyAnalysis.confidence * 0.2;
  
  // Add confidence from sentiment
  confidence += sentiment.confidence * 0.1;
  
  return Math.min(1, confidence);
}

function determineNextBestAction(buyingSignals: BuyingSignal[], urgencyAnalysis: any, engagement: any): string {
  if (buyingSignals.some(s => s.type === 'Scheduling Interest')) {
    return 'schedule_appointment';
  }
  if (buyingSignals.some(s => s.type === 'Price Inquiry')) {
    return 'provide_pricing';
  }
  if (urgencyAnalysis.level === 'high') {
    return 'immediate_response';
  }
  if (engagement.score > 0.7) {
    return 'advance_conversation';
  }
  return 'continue_nurturing';
}

function determineResponseStrategy(buyingSignals: BuyingSignal[], urgencyAnalysis: any, engagement: any): string {
  if (buyingSignals.length > 1) return 'value_focused';
  if (urgencyAnalysis.level === 'high') return 'urgency_focused';
  if (engagement.score > 0.7) return 'relationship_building';
  return 'consultative';
}

function determineConversationStage(conversations: any[], lead: any): string {
  const messageCount = conversations.length;
  const conversationText = conversations.map(c => c.body).join(' ').toLowerCase();

  if (conversationText.includes('price') && conversationText.includes('when can')) {
    return 'closing';
  } else if (conversationText.includes('interested') || conversationText.includes('like that')) {
    return 'interest';
  } else if (messageCount > 10) {
    return 'nurture';
  } else if (messageCount > 3) {
    return 'discovery';
  } else {
    return 'initial';
  }
}

function calculateMomentum(conversations: any[]): string {
  if (conversations.length < 4) return 'stable';

  const recentMessages = conversations.slice(-4);
  const customerMessages = recentMessages.filter(msg => msg.direction === 'in');
  
  const hasQuestions = customerMessages.some(msg => msg.body.includes('?'));
  const hasSchedulingLanguage = conversations.some(msg => 
    msg.body.toLowerCase().includes('schedule') || 
    msg.body.toLowerCase().includes('appointment')
  );
  
  if (hasSchedulingLanguage || hasQuestions) {
    return 'increasing';
  } else if (customerMessages.length < 2) {
    return 'decreasing';
  } else {
    return 'stable';
  }
}

function calculateAverageResponseTime(conversations: any[]): number {
  const responseTimes: number[] = [];
  
  for (let i = 1; i < conversations.length; i++) {
    const current = conversations[i];
    const previous = conversations[i - 1];
    
    if (current.direction !== previous.direction) {
      const timeDiff = new Date(current.sent_at).getTime() - new Date(previous.sent_at).getTime();
      responseTimes.push(timeDiff / (1000 * 60 * 60)); // Convert to hours
    }
  }
  
  return responseTimes.length > 0 
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
    : 24; // Default 24 hours if no data
}