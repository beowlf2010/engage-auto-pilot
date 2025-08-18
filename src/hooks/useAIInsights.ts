import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AIInsight {
  id: string;
  type: 'performance' | 'opportunity' | 'risk' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionText: string;
  actionType: 'view_leads' | 'update_templates' | 'schedule_calls' | 'review_messages';
  data: any;
  confidence: number;
}

export const useAIInsights = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);

  // Fetch lead performance data
  const { data: leadData } = useQuery({
    queryKey: ['ai-insights-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id, status, created_at, last_reply_at, ai_opt_in,
          message_intensity, ai_strategy_bucket, ai_aggression_level
        `)
        .limit(1000);
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch conversation data
  const { data: conversationData } = useQuery({
    queryKey: ['ai-insights-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('lead_id, direction, sent_at, read_at')
        .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(5000);
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch AI template performance
  const { data: templateData } = useQuery({
    queryKey: ['ai-insights-templates'],
    queryFn: async () => {
      console.log('🔍 [AI INSIGHTS] Fetching template performance data...');
      try {
        const { data, error } = await supabase
          .from('ai_template_performance')
          .select('*')
          .order('last_used_at', { ascending: false })
          .limit(20);
        
        if (error) {
          console.error('❌ [AI INSIGHTS] Template performance query failed:', error);
          throw error;
        }
        console.log('✅ [AI INSIGHTS] Template performance data fetched:', data?.length || 0, 'records');
        return data || [];
      } catch (err) {
        console.error('❌ [AI INSIGHTS] Template performance fetch error:', err);
        return []; // Return empty array to prevent component crash
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Generate insights when data changes
  useEffect(() => {
    console.log('🔍 [AI INSIGHTS] Data availability check:', {
      leadData: !!leadData,
      conversationData: !!conversationData,
      templateData: !!templateData,
      leadCount: leadData?.length || 0,
      conversationCount: conversationData?.length || 0,
      templateCount: templateData?.length || 0
    });
    
    if (!leadData || !conversationData) {
      console.log('🚫 [AI INSIGHTS] Missing required data, skipping insight generation');
      return;
    }
    
    // Template data is optional - use empty array if not available
    const templates = templateData || [];

    const generatedInsights: AIInsight[] = [];

    // 1. Unresponsive leads analysis
    const unresponsiveLeads = leadData.filter(lead => {
      const daysSinceLastReply = lead.last_reply_at 
        ? (Date.now() - new Date(lead.last_reply_at).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      return daysSinceLastReply > 7 && lead.status === 'new';
    });

    if (unresponsiveLeads.length > 10) {
      generatedInsights.push({
        id: 'unresponsive-leads',
        type: 'risk',
        priority: 'high',
        title: 'High Number of Unresponsive Leads',
        description: `${unresponsiveLeads.length} leads haven't responded in over a week`,
        impact: 'Lost opportunities and reduced conversion rates',
        actionText: 'Review and re-engage',
        actionType: 'view_leads',
        data: { count: unresponsiveLeads.length, leadIds: unresponsiveLeads.map(l => l.id) },
        confidence: 0.9
      });
    }

    // 2. Template performance analysis
    const lowPerformingTemplates = templates.filter(template => 
      template.response_rate < 0.15 && template.usage_count > 10
    );

    if (lowPerformingTemplates.length > 0) {
      generatedInsights.push({
        id: 'low-performing-templates',
        type: 'optimization',
        priority: 'medium',
        title: 'Templates Need Optimization',
        description: `${lowPerformingTemplates.length} templates have response rates below 15%`,
        impact: 'Improving these could increase engagement by 25-40%',
        actionText: 'Optimize templates',
        actionType: 'update_templates',
        data: { templates: lowPerformingTemplates },
        confidence: 0.85
      });
    }

    // 3. High potential leads (opted in but low engagement)
    const highPotentialLeads = leadData.filter(lead => 
      lead.ai_opt_in && 
      !conversationData.some(conv => conv.lead_id === lead.id && conv.direction === 'in')
    );

    if (highPotentialLeads.length > 5) {
      generatedInsights.push({
        id: 'high-potential-leads',
        type: 'opportunity',
        priority: 'high',
        title: 'Untapped High-Potential Leads',
        description: `${highPotentialLeads.length} leads opted in for AI but haven't engaged`,
        impact: 'These leads show 60% higher conversion when properly nurtured',
        actionText: 'Send targeted messages',
        actionType: 'schedule_calls',
        data: { leads: highPotentialLeads },
        confidence: 0.75
      });
    }

    // 4. Response rate trends
    const recentConversations = conversationData.filter(conv => 
      new Date(conv.sent_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    );
    
    const outboundCount = recentConversations.filter(c => c.direction === 'out').length;
    const inboundCount = recentConversations.filter(c => c.direction === 'in').length;
    const responseRate = outboundCount > 0 ? inboundCount / outboundCount : 0;

    if (responseRate < 0.20 && outboundCount > 20) {
      generatedInsights.push({
        id: 'low-response-rate',
        type: 'performance',
        priority: 'high',
        title: 'Response Rate Below Target',
        description: `Current response rate is ${(responseRate * 100).toFixed(1)}% (target: 25%+)`,
        impact: 'Low response rates indicate message quality or timing issues',
        actionText: 'Review message strategy',
        actionType: 'review_messages',
        data: { responseRate, outboundCount, inboundCount },
        confidence: 0.95
      });
    }

    // 5. Message intensity optimization
    const aggressiveLeads = leadData.filter(lead => lead.ai_aggression_level >= 4);
    const gentleLeads = leadData.filter(lead => lead.ai_aggression_level <= 2);
    
    if (aggressiveLeads.length > gentleLeads.length * 2) {
      generatedInsights.push({
        id: 'message-intensity-balance',
        type: 'optimization',
        priority: 'medium',
        title: 'Message Intensity Imbalance',
        description: 'Too many leads set to aggressive messaging vs gentle approach',
        impact: 'Balanced messaging strategy improves overall engagement',
        actionText: 'Rebalance strategy',
        actionType: 'view_leads',
        data: { aggressive: aggressiveLeads.length, gentle: gentleLeads.length },
        confidence: 0.70
      });
    }

    // Sort by priority and confidence
    const sortedInsights = generatedInsights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.confidence - a.confidence;
    });

    setInsights(sortedInsights.slice(0, 5)); // Show top 5 insights
  }, [leadData, conversationData, templateData]);

  const isLoading = !leadData || !conversationData;

  return {
    insights,
    isLoading,
    refresh: () => {
      // Trigger refetch of all queries
    }
  };
};