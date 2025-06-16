
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface TrainingRecommendation {
  id: string;
  salespersonId: string;
  recommendationType: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  skillsFocus: string[];
  conversationExamples: string[];
  completionStatus: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Type guards for validation
const isValidPriority = (priority: string): priority is 'low' | 'medium' | 'high' => {
  return ['low', 'medium', 'high'].includes(priority);
};

const isValidCompletionStatus = (status: string): status is 'pending' | 'in_progress' | 'completed' => {
  return ['pending', 'in_progress', 'completed'].includes(status);
};

const parseJsonArray = (jsonValue: Json[] | null | undefined): string[] => {
  if (!jsonValue || !Array.isArray(jsonValue)) return [];
  return jsonValue.filter((item): item is string => typeof item === 'string');
};

// Generate training recommendations based on quality scores and violations
export const generateTrainingRecommendations = async (salespersonId: string): Promise<TrainingRecommendation[]> => {
  try {
    console.log('Generating training recommendations for salesperson:', salespersonId);

    // Get recent quality scores for this salesperson
    const { data: qualityScores, error: qualityError } = await supabase
      .from('conversation_quality_scores')
      .select('*')
      .eq('salesperson_id', salespersonId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent compliance violations for this salesperson
    const { data: violations, error: violationsError } = await supabase
      .from('compliance_violations')
      .select('*, conversations!inner(lead_id, leads!inner(salesperson_id))')
      .eq('conversations.leads.salesperson_id', salespersonId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5);

    if (qualityError || violationsError) {
      console.error('Error fetching data for training recommendations:', qualityError || violationsError);
      return [];
    }

    // Use AI to analyze patterns and generate recommendations
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
      body: {
        action: 'training_recommendations',
        qualityScores: qualityScores || [],
        violations: violations || [],
        salespersonId
      }
    });

    if (aiError || !aiResponse?.recommendations) {
      console.error('Error getting AI training recommendations:', aiError);
      return [];
    }

    const recommendations: TrainingRecommendation[] = [];

    // Store recommendations in database
    for (const rec of aiResponse.recommendations) {
      const validatedPriority = isValidPriority(rec.priority) ? rec.priority : 'medium';
      
      const recommendationData = {
        salesperson_id: salespersonId,
        recommendation_type: rec.type,
        title: rec.title,
        description: rec.description,
        priority: validatedPriority,
        skills_focus: rec.skillsFocus || [],
        conversation_examples: rec.conversationExamples || [],
        completion_status: 'pending' as const,
        due_date: rec.dueDate || null,
        created_by: 'ai_system'
      };

      const { data: recommendation, error: recError } = await supabase
        .from('training_recommendations')
        .insert(recommendationData)
        .select()
        .single();

      if (!recError && recommendation) {
        recommendations.push({
          id: recommendation.id,
          salespersonId: recommendation.salesperson_id,
          recommendationType: recommendation.recommendation_type,
          title: recommendation.title,
          description: recommendation.description,
          priority: validatedPriority,
          skillsFocus: parseJsonArray(recommendation.skills_focus as Json[]),
          conversationExamples: parseJsonArray(recommendation.conversation_examples as Json[]),
          completionStatus: isValidCompletionStatus(recommendation.completion_status) ? recommendation.completion_status : 'pending',
          dueDate: recommendation.due_date,
          createdBy: recommendation.created_by,
          createdAt: recommendation.created_at,
          updatedAt: recommendation.updated_at
        });
      }
    }

    return recommendations;
  } catch (error) {
    console.error('Error generating training recommendations:', error);
    return [];
  }
};

// Get training recommendations for a salesperson
export const getTrainingRecommendations = async (salespersonId: string): Promise<TrainingRecommendation[]> => {
  try {
    const { data, error } = await supabase
      .from('training_recommendations')
      .select('*')
      .eq('salesperson_id', salespersonId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      salespersonId: item.salesperson_id,
      recommendationType: item.recommendation_type,
      title: item.title,
      description: item.description,
      priority: isValidPriority(item.priority) ? item.priority : 'medium',
      skillsFocus: parseJsonArray(item.skills_focus as Json[]),
      conversationExamples: parseJsonArray(item.conversation_examples as Json[]),
      completionStatus: isValidCompletionStatus(item.completion_status) ? item.completion_status : 'pending',
      dueDate: item.due_date,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error getting training recommendations:', error);
    return [];
  }
};

// Update training recommendation status
export const updateTrainingRecommendationStatus = async (
  recommendationId: string, 
  status: 'pending' | 'in_progress' | 'completed'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('training_recommendations')
      .update({
        completion_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', recommendationId);

    return !error;
  } catch (error) {
    console.error('Error updating training recommendation status:', error);
    return false;
  }
};
