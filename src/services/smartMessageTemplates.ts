import { supabase } from '@/integrations/supabase/client';
import { SentimentMetrics } from './conversationSentimentAnalysis';

export interface TemplateContext {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  leadStatus: string;
  sentiment: SentimentMetrics;
  conversationHistory: string[];
  leadData: {
    city?: string;
    state?: string;
    source?: string;
    daysInFunnel: number;
    lastContactAt?: string;
  };
}

export interface SmartTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  triggers: {
    statuses: string[];
    sentiments: string[];
    urgencies: string[];
    intents: string[];
  };
  priority: number;
  performance: {
    usage_count: number;
    response_rate: number;
    conversion_rate: number;
  };
}

export interface GeneratedMessage {
  template: SmartTemplate;
  content: string;
  reasoning: string;
  confidence: number;
  variables_used: Record<string, string>;
}

export class SmartMessageTemplates {
  private templates: SmartTemplate[] = [];

  constructor() {
    this.initializeTemplates();
  }

  async generateMessage(context: TemplateContext): Promise<GeneratedMessage | null> {
    try {
      console.log('📝 [TEMPLATES] Generating smart message for lead:', context.leadId);
      
      // Load latest templates from database
      await this.loadTemplatesFromDB();
      
      // Find best matching template
      const matchedTemplate = this.findBestTemplate(context);
      
      if (!matchedTemplate) {
        console.log('⚠️ [TEMPLATES] No matching template found');
        return null;
      }

      // Generate personalized content
      const personalizedContent = this.personalizeTemplate(matchedTemplate, context);
      
      // Calculate confidence
      const confidence = this.calculateTemplateConfidence(matchedTemplate, context);
      
      // Track template usage
      await this.trackTemplateUsage(matchedTemplate.id, context.leadId);

      const result: GeneratedMessage = {
        template: matchedTemplate,
        content: personalizedContent.content,
        reasoning: this.generateReasoning(matchedTemplate, context),
        confidence,
        variables_used: personalizedContent.variables
      };

      console.log('✅ [TEMPLATES] Generated message:', {
        template: matchedTemplate.name,
        confidence,
        length: personalizedContent.content.length
      });

      return result;
    } catch (error) {
      console.error('❌ [TEMPLATES] Error generating message:', error);
      return null;
    }
  }

  private findBestTemplate(context: TemplateContext): SmartTemplate | null {
    // Filter templates based on context
    const eligibleTemplates = this.templates.filter(template => {
      return this.isTemplateEligible(template, context);
    });

    if (eligibleTemplates.length === 0) {
      return null;
    }

    // Score templates based on relevance
    const scoredTemplates = eligibleTemplates.map(template => ({
      template,
      score: this.scoreTemplate(template, context)
    }));

    // Sort by score and priority
    scoredTemplates.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.template.priority - a.template.priority;
    });

    return scoredTemplates[0].template;
  }

  private isTemplateEligible(template: SmartTemplate, context: TemplateContext): boolean {
    // Check status eligibility
    if (template.triggers.statuses.length > 0 && 
        !template.triggers.statuses.includes(context.leadStatus)) {
      return false;
    }

    // Check sentiment eligibility
    if (template.triggers.sentiments.length > 0 && 
        !template.triggers.sentiments.includes(context.sentiment.overall)) {
      return false;
    }

    // Check urgency eligibility
    if (template.triggers.urgencies.length > 0 && 
        !template.triggers.urgencies.includes(context.sentiment.urgency)) {
      return false;
    }

    // Check intent eligibility
    if (template.triggers.intents.length > 0 && 
        !template.triggers.intents.includes(context.sentiment.intent)) {
      return false;
    }

    return true;
  }

  private scoreTemplate(template: SmartTemplate, context: TemplateContext): number {
    let score = 0;

    // Base score from template priority
    score += template.priority * 10;

    // Performance-based scoring
    score += template.performance.response_rate * 20;
    score += template.performance.conversion_rate * 30;

    // Context relevance scoring
    if (template.triggers.statuses.includes(context.leadStatus)) score += 15;
    if (template.triggers.sentiments.includes(context.sentiment.overall)) score += 10;
    if (template.triggers.urgencies.includes(context.sentiment.urgency)) score += 20;
    if (template.triggers.intents.includes(context.sentiment.intent)) score += 25;

    // Urgency bonus
    if (context.sentiment.urgency === 'critical') score += 30;
    if (context.sentiment.urgency === 'high') score += 20;

    // Intent bonus
    if (context.sentiment.intent === 'ready_to_buy') score += 40;
    if (context.sentiment.intent === 'shopping') score += 25;

    return score;
  }

  private personalizeTemplate(template: SmartTemplate, context: TemplateContext): {
    content: string;
    variables: Record<string, string>;
  } {
    let content = template.content;
    const variables: Record<string, string> = {};

    // Replace standard variables
    const replacements = {
      '[LEAD_NAME]': context.leadName.split(' ')[0],
      '[FULL_NAME]': context.leadName,
      '[VEHICLE_INTEREST]': context.vehicleInterest,
      '[CITY]': context.leadData.city || 'your area',
      '[STATE]': context.leadData.state || '',
      '[DAYS_IN_FUNNEL]': context.leadData.daysInFunnel.toString(),
      '[URGENCY_LEVEL]': context.sentiment.urgency,
      '[ENGAGEMENT_LEVEL]': context.sentiment.engagement
    };

    // Dynamic content based on context
    if (content.includes('[URGENCY_MESSAGE]')) {
      const urgencyMessage = this.getUrgencyMessage(context.sentiment.urgency);
      replacements['[URGENCY_MESSAGE]'] = urgencyMessage;
    }

    if (content.includes('[ENGAGEMENT_HOOK]')) {
      const engagementHook = this.getEngagementHook(context.sentiment.engagement);
      replacements['[ENGAGEMENT_HOOK]'] = engagementHook;
    }

    if (content.includes('[INTENT_CTA]')) {
      const intentCTA = this.getIntentCTA(context.sentiment.intent);
      replacements['[INTENT_CTA]'] = intentCTA;
    }

    // Apply replacements
    Object.entries(replacements).forEach(([variable, value]) => {
      if (content.includes(variable)) {
        content = content.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        variables[variable] = value;
      }
    });

    return { content, variables };
  }

  private getUrgencyMessage(urgency: string): string {
    switch (urgency) {
      case 'critical':
        return 'I understand this is time-sensitive, so I wanted to reach out right away.';
      case 'high':
        return 'I know you\'re looking to move quickly on this.';
      case 'medium':
        return 'I wanted to follow up while this is still fresh.';
      default:
        return 'I hope you\'re having a great day!';
    }
  }

  private getEngagementHook(engagement: string): string {
    switch (engagement) {
      case 'highly_engaged':
        return 'I can tell you\'re really excited about this!';
      case 'engaged':
        return 'I appreciate your interest and want to help you move forward.';
      case 'neutral':
        return 'I\'d love to answer any questions you might have.';
      default:
        return 'I wanted to check in and see how I can help.';
    }
  }

  private getIntentCTA(intent: string): string {
    switch (intent) {
      case 'ready_to_buy':
        return 'Are you ready to take the next step today?';
      case 'shopping':
        return 'What can I do to earn your business?';
      case 'researching':
        return 'What additional information would be most helpful?';
      default:
        return 'Would you like to schedule a time to see this in person?';
    }
  }

  private calculateTemplateConfidence(template: SmartTemplate, context: TemplateContext): number {
    let confidence = 0.5; // Base confidence

    // Template performance boost
    confidence += template.performance.response_rate * 0.3;
    confidence += template.performance.conversion_rate * 0.2;

    // Context match boost
    if (template.triggers.statuses.includes(context.leadStatus)) confidence += 0.1;
    if (template.triggers.sentiments.includes(context.sentiment.overall)) confidence += 0.1;
    if (template.triggers.urgencies.includes(context.sentiment.urgency)) confidence += 0.15;
    if (template.triggers.intents.includes(context.sentiment.intent)) confidence += 0.2;

    // High-priority situations
    if (context.sentiment.urgency === 'critical') confidence += 0.15;
    if (context.sentiment.intent === 'ready_to_buy') confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  private generateReasoning(template: SmartTemplate, context: TemplateContext): string {
    const reasons = [];

    reasons.push(`Selected "${template.name}" template`);
    
    if (template.triggers.statuses.includes(context.leadStatus)) {
      reasons.push(`matches lead status: ${context.leadStatus}`);
    }
    
    if (template.triggers.urgencies.includes(context.sentiment.urgency)) {
      reasons.push(`addresses ${context.sentiment.urgency} urgency`);
    }
    
    if (template.triggers.intents.includes(context.sentiment.intent)) {
      reasons.push(`aligns with ${context.sentiment.intent} intent`);
    }

    if (template.performance.response_rate > 0.3) {
      reasons.push(`high response rate (${Math.round(template.performance.response_rate * 100)}%)`);
    }

    return reasons.join(', ');
  }

  private async loadTemplatesFromDB(): Promise<void> {
    try {
      const { data: templates, error } = await supabase
        .from('ai_message_templates')
        .select('*')
        .eq('is_active', true)
        .order('response_rate', { ascending: false });

      if (error) throw error;

      this.templates = (templates || []).map(this.convertDBTemplate);
    } catch (error) {
      console.error('❌ [TEMPLATES] Error loading templates:', error);
      // Keep default templates if DB load fails
    }
  }

  private convertDBTemplate(dbTemplate: any): SmartTemplate {
    return {
      id: dbTemplate.id,
      name: dbTemplate.variant_name,
      category: dbTemplate.stage,
      content: dbTemplate.template,
      variables: this.extractVariables(dbTemplate.template),
      triggers: {
        statuses: ['new', 'contacted', 'qualified'], // Default - should be in DB
        sentiments: ['positive', 'neutral', 'negative'],
        urgencies: ['low', 'medium', 'high', 'critical'],
        intents: ['browsing', 'researching', 'shopping', 'ready_to_buy']
      },
      priority: 50, // Default priority
      performance: {
        usage_count: dbTemplate.total_sent || 0,
        response_rate: dbTemplate.response_rate || 0,
        conversion_rate: 0 // Calculate separately
      }
    };
  }

  private extractVariables(template: string): string[] {
    const matches = template.match(/\[([^\]]+)\]/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  }

  private async trackTemplateUsage(templateId: string, leadId: string): Promise<void> {
    try {
      // Update usage count (simplified)
      await supabase
        .from('ai_message_templates')
        .update({ 
          total_sent: 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);

      // Track usage analytics with required fields
      await supabase
        .from('ai_message_analytics')
        .insert({
          lead_id: leadId,
          message_content: 'Template generated message',
          message_stage: 'template_generated',
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ [TEMPLATES] Error tracking usage:', error);
    }
  }

  private initializeTemplates(): void {
    // Default templates that work without database
    this.templates = [
      {
        id: 'initial-contact-high-urgency',
        name: 'Initial Contact - High Urgency',
        category: 'initial_contact',
        content: 'Hi [LEAD_NAME]! I saw your interest in [VEHICLE_INTEREST]. [URGENCY_MESSAGE] I\'d love to help you find exactly what you\'re looking for. [INTENT_CTA]',
        variables: ['LEAD_NAME', 'VEHICLE_INTEREST', 'URGENCY_MESSAGE', 'INTENT_CTA'],
        triggers: {
          statuses: ['new'],
          sentiments: ['positive', 'neutral'],
          urgencies: ['high', 'critical'],
          intents: ['shopping', 'ready_to_buy']
        },
        priority: 90,
        performance: {
          usage_count: 0,
          response_rate: 0.35,
          conversion_rate: 0.12
        }
      },
      {
        id: 'follow-up-engaged',
        name: 'Follow-up - Engaged Customer',
        category: 'follow_up',
        content: 'Hi [LEAD_NAME]! [ENGAGEMENT_HOOK] I wanted to follow up about [VEHICLE_INTEREST]. Do you have any questions I can answer?',
        variables: ['LEAD_NAME', 'ENGAGEMENT_HOOK', 'VEHICLE_INTEREST'],
        triggers: {
          statuses: ['contacted', 'qualified'],
          sentiments: ['positive'],
          urgencies: ['medium', 'high'],
          intents: ['researching', 'shopping']
        },
        priority: 75,
        performance: {
          usage_count: 0,
          response_rate: 0.28,
          conversion_rate: 0.08
        }
      },
      {
        id: 'reengagement-neutral',
        name: 'Re-engagement - Neutral Response',
        category: 'reengagement',
        content: 'Hi [LEAD_NAME]! I wanted to check back in about [VEHICLE_INTEREST]. Is there anything specific you\'d like to know that would help with your decision?',
        variables: ['LEAD_NAME', 'VEHICLE_INTEREST'],
        triggers: {
          statuses: ['contacted', 'qualified'],
          sentiments: ['neutral'],
          urgencies: ['low', 'medium'],
          intents: ['browsing', 'researching']
        },
        priority: 60,
        performance: {
          usage_count: 0,
          response_rate: 0.22,
          conversion_rate: 0.05
        }
      }
    ];
  }
}

export const smartMessageTemplates = new SmartMessageTemplates();
