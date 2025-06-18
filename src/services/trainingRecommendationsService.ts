
import { supabase } from '@/integrations/supabase/client';

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

export const generateTrainingRecommendations = async (salespersonId: string): Promise<TrainingRecommendation[]> => {
  try {
    // For now, return mock recommendations - this would be enhanced with AI analysis
    const mockRecommendations: Omit<TrainingRecommendation, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        salespersonId,
        recommendationType: 'communication_improvement',
        title: 'Improve Response Time',
        description: 'Focus on responding to leads within 2 hours during business hours',
        priority: 'high',
        skillsFocus: ['time_management', 'customer_service'],
        conversationExamples: ['Quick acknowledgment messages', 'Setting expectations'],
        completionStatus: 'pending',
        createdBy: 'system'
      }
    ];

    // Create recommendations in database
    const createdRecommendations: TrainingRecommendation[] = [];
    
    for (const rec of mockRecommendations) {
      const created = await createTrainingRecommendation(rec);
      if (created) {
        // Fetch the created recommendation
        const { data } = await supabase
          .from('training_recommendations')
          .select('*')
          .eq('salesperson_id', salespersonId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          createdRecommendations.push({
            id: data.id,
            salespersonId: data.salesperson_id,
            recommendationType: data.recommendation_type,
            title: data.title,
            description: data.description,
            priority: data.priority as 'low' | 'medium' | 'high',
            skillsFocus: Array.isArray(data.skills_focus) 
              ? data.skills_focus.filter((skill): skill is string => typeof skill === 'string')
              : [],
            conversationExamples: Array.isArray(data.conversation_examples) 
              ? data.conversation_examples.filter((example): example is string => typeof example === 'string')
              : [],
            completionStatus: data.completion_status as 'pending' | 'in_progress' | 'completed',
            dueDate: data.due_date,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          });
        }
      }
    }

    return createdRecommendations;
  } catch (error) {
    console.error('Error generating training recommendations:', error);
    return [];
  }
};

export const getTrainingRecommendations = async (): Promise<TrainingRecommendation[]> => {
  try {
    const { data, error } = await supabase
      .from('training_recommendations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(item => ({
      id: item.id,
      salespersonId: item.salesperson_id,
      recommendationType: item.recommendation_type,
      title: item.title,
      description: item.description,
      priority: item.priority as 'low' | 'medium' | 'high',
      skillsFocus: Array.isArray(item.skills_focus) 
        ? item.skills_focus.filter((skill): skill is string => typeof skill === 'string')
        : [],
      conversationExamples: Array.isArray(item.conversation_examples) 
        ? item.conversation_examples.filter((example): example is string => typeof example === 'string')
        : [],
      completionStatus: item.completion_status as 'pending' | 'in_progress' | 'completed',
      dueDate: item.due_date,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    })) || [];
  } catch (error) {
    console.error('Error fetching training recommendations:', error);
    throw error;
  }
};

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

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating training recommendation status:', error);
    return false;
  }
};

export const createTrainingRecommendation = async (
  recommendation: Omit<TrainingRecommendation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('training_recommendations')
      .insert({
        salesperson_id: recommendation.salespersonId,
        recommendation_type: recommendation.recommendationType,
        title: recommendation.title,
        description: recommendation.description,
        priority: recommendation.priority,
        skills_focus: recommendation.skillsFocus,
        conversation_examples: recommendation.conversationExamples,
        completion_status: recommendation.completionStatus,
        due_date: recommendation.dueDate,
        created_by: recommendation.createdBy
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating training recommendation:', error);
    return false;
  }
};
