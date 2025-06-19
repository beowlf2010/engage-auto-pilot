
import { useState, useEffect, useCallback } from 'react';
import { aiLearningService } from '@/services/aiLearningService';
import { supabase } from '@/integrations/supabase/client';

export interface LearningInsight {
  type: 'pattern' | 'optimization' | 'prediction' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  data?: any;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'template' | 'timing' | 'frequency' | 'content';
  title: string;
  description: string;
  expectedImprovement: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeToImplement: string;
  status: 'pending' | 'testing' | 'implemented' | 'rejected';
}

export const useAdvancedLearning = (leadId?: string) => {
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [learningProgress, setLearningProgress] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Generate predictive insights
  const generateInsights = useCallback(async () => {
    if (!leadId) return;

    try {
      setLoading(true);
      
      // Get historical data for analysis
      const analysis = await aiLearningService.analyzeMessageEffectiveness('', leadId);
      const patterns = await aiLearningService.getSuccessfulPatterns();
      
      const newInsights: LearningInsight[] = [];

      // Pattern analysis
      if (analysis.historicalFeedback && analysis.historicalFeedback.length > 5) {
        const recentPerformance = analysis.historicalFeedback.slice(-5);
        const positiveRate = recentPerformance.filter(f => f.feedback_type === 'positive').length / recentPerformance.length;
        
        if (positiveRate > 0.7) {
          newInsights.push({
            type: 'pattern',
            title: 'Strong Engagement Pattern Detected',
            description: `This lead shows consistently positive responses (${(positiveRate * 100).toFixed(1)}% positive rate)`,
            confidence: 85,
            impact: 'high',
            actionable: true,
            data: { positiveRate, sampleSize: recentPerformance.length }
          });
        }
      }

      // Optimization opportunities
      if (analysis.effectivenessScore < 60) {
        newInsights.push({
          type: 'optimization',
          title: 'Message Optimization Opportunity',
          description: 'Current message effectiveness is below optimal. Consider adjusting tone or timing.',
          confidence: 78,
          impact: 'medium',
          actionable: true,
          data: { currentScore: analysis.effectivenessScore }
        });
      }

      setInsights(newInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  // Generate optimization recommendations
  const generateRecommendations = useCallback(async () => {
    try {
      const metrics = await aiLearningService.getPerformanceMetrics('month');
      const newRecommendations: OptimizationRecommendation[] = [];

      // Template optimization
      if (metrics.feedback && metrics.feedback.length > 10) {
        const negativeRate = metrics.feedback.filter((f: any) => f.feedback_type === 'negative').length / metrics.feedback.length;
        
        if (negativeRate > 0.3) {
          newRecommendations.push({
            id: 'template-optimization-1',
            type: 'template',
            title: 'Improve Message Templates',
            description: 'High negative feedback rate suggests templates need refinement',
            expectedImprovement: 25,
            difficulty: 'medium',
            timeToImplement: '2-3 days',
            status: 'pending'
          });
        }
      }

      // Timing optimization
      newRecommendations.push({
        id: 'timing-optimization-1',
        type: 'timing',
        title: 'Optimize Send Timing',
        description: 'Implement personalized send timing based on lead response patterns',
        expectedImprovement: 15,
        difficulty: 'easy',
        timeToImplement: '1 day',
        status: 'pending'
      });

      setRecommendations(newRecommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  }, []);

  // Track learning progress
  const trackProgress = useCallback(async () => {
    try {
      const progress = {
        totalInteractions: 0,
        successfulOptimizations: 0,
        learningVelocity: 0,
        adaptationScore: 0
      };

      // Get recent learning outcomes
      const { data: outcomes } = await supabase
        .from('ai_learning_outcomes')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (outcomes) {
        progress.totalInteractions = outcomes.length;
        progress.successfulOptimizations = outcomes.filter(o => 
          ['appointment_booked', 'test_drive_scheduled'].includes(o.outcome_type)
        ).length;
        progress.learningVelocity = Math.min(100, outcomes.length * 2);
        progress.adaptationScore = progress.successfulOptimizations > 0 ? 
          (progress.successfulOptimizations / progress.totalInteractions) * 100 : 0;
      }

      setLearningProgress(progress);
    } catch (error) {
      console.error('Error tracking progress:', error);
    }
  }, []);

  // Implement recommendation
  const implementRecommendation = useCallback(async (recommendationId: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === recommendationId 
          ? { ...rec, status: 'testing' }
          : rec
      )
    );

    // Here you would implement the actual optimization
    // For now, we'll simulate the implementation
    setTimeout(() => {
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, status: 'implemented' }
            : rec
        )
      );
    }, 2000);
  }, []);

  // Reject recommendation
  const rejectRecommendation = useCallback(async (recommendationId: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === recommendationId 
          ? { ...rec, status: 'rejected' }
          : rec
      )
    );
  }, []);

  useEffect(() => {
    if (leadId) {
      generateInsights();
    }
    generateRecommendations();
    trackProgress();
  }, [leadId, generateInsights, generateRecommendations, trackProgress]);

  return {
    insights,
    recommendations,
    learningProgress,
    loading,
    generateInsights,
    generateRecommendations,
    implementRecommendation,
    rejectRecommendation,
    trackProgress
  };
};

// Hook for real-time learning optimization
export const useRealtimeLearningOptimization = () => {
  const [optimizationQueue, setOptimizationQueue] = useState<any[]>([]);
  const [autoOptimizeEnabled, setAutoOptimizeEnabled] = useState(false);

  useEffect(() => {
    if (!autoOptimizeEnabled) return;

    const channel = supabase
      .channel('learning-optimization')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_message_feedback'
        },
        async (payload) => {
          console.log('New feedback for optimization:', payload.new);
          
          // Trigger optimization analysis
          const optimization = await analyzeForOptimization(payload.new);
          if (optimization) {
            setOptimizationQueue(prev => [...prev, optimization]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoOptimizeEnabled]);

  const analyzeForOptimization = async (feedback: any) => {
    // Analyze feedback for optimization opportunities
    if (feedback.feedback_type === 'negative' && feedback.rating <= 2) {
      return {
        type: 'immediate_optimization',
        leadId: feedback.lead_id,
        recommendation: 'Adjust message tone and content',
        priority: 'high',
        createdAt: new Date()
      };
    }
    return null;
  };

  const processOptimizationQueue = useCallback(async () => {
    if (optimizationQueue.length === 0) return;

    const optimization = optimizationQueue[0];
    
    // Process the optimization
    console.log('Processing optimization:', optimization);
    
    // Remove from queue
    setOptimizationQueue(prev => prev.slice(1));
  }, [optimizationQueue]);

  return {
    optimizationQueue,
    autoOptimizeEnabled,
    setAutoOptimizeEnabled,
    processOptimizationQueue
  };
};
