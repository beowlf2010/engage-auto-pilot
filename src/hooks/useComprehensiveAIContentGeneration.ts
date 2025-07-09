import { useState } from 'react';
import { comprehensiveAIContentGenerator } from '@/services/comprehensiveAIContentGenerator';
import { toast } from '@/hooks/use-toast';

interface GenerationProgress {
  phase: string;
  phaseProgress: number;
  totalProgress: number;
  currentAction: string;
  isComplete: boolean;
  stats: {
    conversationResponses: number;
    feedbackRecords: number;
    learningInsights: number;
    performanceData: number;
    contextRecords: number;
    edgeCases: number;
    total: number;
  };
}

export const useComprehensiveAIContentGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    phase: '',
    phaseProgress: 0,
    totalProgress: 0,
    currentAction: '',
    isComplete: false,
    stats: {
      conversationResponses: 0,
      feedbackRecords: 0,
      learningInsights: 0,
      performanceData: 0,
      contextRecords: 0,
      edgeCases: 0,
      total: 0
    }
  });

  const phases = [
    { name: 'Conversation Intelligence', weight: 20 },
    { name: 'Feedback & Performance', weight: 30 },
    { name: 'Learning Insights', weight: 15 },
    { name: 'Predictive Analytics', weight: 10 },
    { name: 'Conversation Context', weight: 15 },
    { name: 'Edge Case Scenarios', weight: 10 }
  ];

  const startGeneration = async () => {
    setIsGenerating(true);
    setProgress(prev => ({
      ...prev,
      phase: 'Initializing',
      totalProgress: 0,
      currentAction: 'Preparing comprehensive content generation...',
      isComplete: false
    }));

    try {
      console.log('🚀 [CONTENT GENERATION] Starting comprehensive AI content generation...');
      
      toast({
        title: "AI Content Generation Started",
        description: "Generating comprehensive AI training data. This may take several minutes.",
      });

      // Simulate phase progress updates
      let totalProgress = 0;
      
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        setProgress(prev => ({
          ...prev,
          phase: phase.name,
          phaseProgress: 0,
          totalProgress: Math.round(totalProgress),
          currentAction: `Processing ${phase.name.toLowerCase()}...`
        }));

        // Simulate phase progress
        for (let j = 0; j <= 100; j += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setProgress(prev => ({
            ...prev,
            phaseProgress: j,
            totalProgress: Math.round(totalProgress + (j / 100) * phase.weight),
            currentAction: `Processing ${phase.name.toLowerCase()}... ${j}%`
          }));
        }
        
        totalProgress += phase.weight;
      }

      // Execute the actual generation
      const stats = await comprehensiveAIContentGenerator.generateComprehensiveContent();
      
      setProgress(prev => ({
        ...prev,
        phase: 'Complete',
        phaseProgress: 100,
        totalProgress: 100,
        currentAction: 'Content generation completed successfully!',
        isComplete: true,
        stats
      }));

      toast({
        title: "Content Generation Complete",
        description: `Successfully generated ${stats.total} AI learning records across all categories`,
      });

      console.log('✅ [CONTENT GENERATION] Comprehensive content generation completed:', stats);

    } catch (error) {
      console.error('❌ [CONTENT GENERATION] Error during generation:', error);
      
      setProgress(prev => ({
        ...prev,
        currentAction: 'Error occurred during generation',
        isComplete: false
      }));

      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate AI content",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetGeneration = () => {
    setProgress({
      phase: '',
      phaseProgress: 0,
      totalProgress: 0,
      currentAction: '',
      isComplete: false,
      stats: {
        conversationResponses: 0,
        feedbackRecords: 0,
        learningInsights: 0,
        performanceData: 0,
        contextRecords: 0,
        edgeCases: 0,
        total: 0
      }
    });
  };

  return {
    isGenerating,
    progress,
    phases,
    startGeneration,
    resetGeneration
  };
};