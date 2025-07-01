
import { supabase } from '@/integrations/supabase/client';

interface ConversationPattern {
  pattern_type: string;
  pattern_data: any;
  success_rate: number;
  sample_size: number;
  last_updated: Date;
}

interface GlobalLearning {
  insight_type: string;
  insight_data: any;
  confidence: number;
  applicable_contexts: string[];
}

class CrossConversationIntelligenceService {
  private patternCache = new Map<string, ConversationPattern>();
  private globalInsights: GlobalLearning[] = [];

  async analyzeGlobalPatterns(): Promise<ConversationPattern[]> {
    try {
      console.log('🌐 [CROSS-CONV] Analyzing global conversation patterns');

      // Get successful conversation patterns
      const { data: successfulConversations } = await supabase
        .from('conversations')
        .select(`
          id, body, direction, sent_at, lead_id,
          leads!inner (
            id, status, vehicle_interest,
            ai_learning_outcomes (outcome_type, outcome_value)
          )
        `)
        .eq('direction', 'out')
        .eq('ai_generated', true)
        .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!successfulConversations) return [];

      // Analyze patterns in successful responses
      const patterns = this.extractResponsePatterns(successfulConversations);
      
      // Update pattern cache
      patterns.forEach(pattern => {
        this.patternCache.set(pattern.pattern_type, pattern);
      });

      console.log(`✅ [CROSS-CONV] Found ${patterns.length} global patterns`);
      return patterns;

    } catch (error) {
      console.error('❌ [CROSS-CONV] Error analyzing patterns:', error);
      return [];
    }
  }

  private extractResponsePatterns(conversations: any[]): ConversationPattern[] {
    const patterns: ConversationPattern[] = [];

    // Group by response type and analyze success rates
    const responseTypes = new Map<string, any[]>();
    
    conversations.forEach(conv => {
      const responseType = this.categorizeResponse(conv.body);
      if (!responseTypes.has(responseType)) {
        responseTypes.set(responseType, []);
      }
      responseTypes.get(responseType)!.push(conv);
    });

    // Calculate success rates for each pattern
    responseTypes.forEach((convs, type) => {
      const successfulOutcomes = convs.filter(c => 
        c.leads?.ai_learning_outcomes?.some((o: any) => 
          ['positive_response', 'appointment_booked'].includes(o.outcome_type)
        )
      );

      if (convs.length >= 5) { // Minimum sample size
        patterns.push({
          pattern_type: type,
          pattern_data: {
            common_phrases: this.extractCommonPhrases(convs.map(c => c.body)),
            avg_length: convs.reduce((sum, c) => sum + c.body.length, 0) / convs.length,
            timing_patterns: this.analyzeTimingPatterns(convs)
          },
          success_rate: successfulOutcomes.length / convs.length,
          sample_size: convs.length,
          last_updated: new Date()
        });
      }
    });

    return patterns.sort((a, b) => b.success_rate - a.success_rate);
  }

  private categorizeResponse(body: string): string {
    const lowerBody = body.toLowerCase();
    
    if (lowerBody.includes('financing') || lowerBody.includes('payment')) {
      return 'financing_discussion';
    } else if (lowerBody.includes('test drive') || lowerBody.includes('appointment')) {
      return 'appointment_setting';
    } else if (lowerBody.includes('inventory') || lowerBody.includes('available')) {
      return 'inventory_inquiry';
    } else if (lowerBody.includes('price') || lowerBody.includes('cost')) {
      return 'pricing_discussion';
    } else {
      return 'general_engagement';
    }
  }

  private extractCommonPhrases(messages: string[]): string[] {
    const phrases = new Map<string, number>();
    
    messages.forEach(msg => {
      const words = msg.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 2; i++) {
        const phrase = words.slice(i, i + 3).join(' ');
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
      }
    });

    return Array.from(phrases.entries())
      .filter(([_, count]) => count >= Math.ceil(messages.length * 0.3))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phrase]) => phrase);
  }

  private analyzeTimingPatterns(conversations: any[]): any {
    const hours = conversations.map(c => new Date(c.sent_at).getHours());
    const avgHour = hours.reduce((sum, h) => sum + h, 0) / hours.length;
    
    return {
      optimal_hours: hours.filter(h => Math.abs(h - avgHour) <= 2),
      peak_performance_time: Math.round(avgHour)
    };
  }

  async getSimilarConversations(currentMessage: string, leadId: string): Promise<any[]> {
    try {
      // Get similar successful conversations for pattern matching
      const patterns = Array.from(this.patternCache.values())
        .filter(p => p.success_rate > 0.6)
        .slice(0, 3);

      return patterns.map(pattern => ({
        pattern_type: pattern.pattern_type,
        success_rate: pattern.success_rate,
        suggested_elements: pattern.pattern_data.common_phrases?.slice(0, 2) || [],
        timing_suggestion: pattern.pattern_data.timing_patterns?.peak_performance_time
      }));

    } catch (error) {
      console.error('❌ [CROSS-CONV] Error finding similar conversations:', error);
      return [];
    }
  }

  async getGlobalInsights(): Promise<GlobalLearning[]> {
    if (this.globalInsights.length === 0) {
      await this.generateGlobalInsights();
    }
    return this.globalInsights;
  }

  private async generateGlobalInsights(): Promise<void> {
    try {
      const patterns = Array.from(this.patternCache.values());
      
      this.globalInsights = [
        {
          insight_type: 'optimal_response_timing',
          insight_data: {
            best_hours: patterns
              .map(p => p.pattern_data.timing_patterns?.peak_performance_time)
              .filter(h => h !== undefined),
            recommendation: 'Send AI responses during peak engagement hours'
          },
          confidence: 0.85,
          applicable_contexts: ['all']
        },
        {
          insight_type: 'high_success_phrases',
          insight_data: {
            phrases: patterns
              .filter(p => p.success_rate > 0.7)
              .flatMap(p => p.pattern_data.common_phrases || [])
              .slice(0, 10)
          },
          confidence: 0.9,
          applicable_contexts: ['response_generation']
        }
      ];

    } catch (error) {
      console.error('❌ [CROSS-CONV] Error generating global insights:', error);
    }
  }

  async optimizeResponseWithGlobalLearning(
    originalResponse: string,
    context: { leadId: string; messageType: string }
  ): Promise<string> {
    try {
      const insights = await this.getGlobalInsights();
      const patterns = await this.getSimilarConversations('', context.leadId);
      
      let optimizedResponse = originalResponse;

      // Apply high-success phrases if relevant
      const phraseInsight = insights.find(i => i.insight_type === 'high_success_phrases');
      if (phraseInsight && phraseInsight.insight_data.phrases.length > 0) {
        // Subtly incorporate successful patterns without being repetitive
        const successPhrase = phraseInsight.insight_data.phrases[0];
        if (!optimizedResponse.toLowerCase().includes(successPhrase)) {
          // Add natural integration of successful phrases
          optimizedResponse = this.integrateSuccessfulPattern(optimizedResponse, successPhrase);
        }
      }

      return optimizedResponse;

    } catch (error) {
      console.error('❌ [CROSS-CONV] Error optimizing response:', error);
      return originalResponse;
    }
  }

  private integrateSuccessfulPattern(response: string, pattern: string): string {
    // Smart integration of successful patterns without being obvious
    if (pattern.includes('happy to help') && !response.includes('happy')) {
      return response.replace(/^(Hi|Hello)/, '$1! Happy to help with');
    }
    
    if (pattern.includes('right fit') && response.includes('find')) {
      return response.replace(/find/, 'find the right fit for');
    }

    return response;
  }
}

export const crossConversationIntelligence = new CrossConversationIntelligenceService();
