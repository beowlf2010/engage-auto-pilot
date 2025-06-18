import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Clock, TrendingUp, User, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getTrainingRecommendations, updateTrainingRecommendationStatus } from '@/services/trainingRecommendationsService';
import type { TrainingRecommendation } from '@/services/trainingRecommendationsService';

const TrainingRecommendationsPanel = () => {
  const [recommendations, setRecommendations] = useState<TrainingRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      // Get all training recommendations
      const { data, error } = await supabase
        .from('training_recommendations')
        .select(`
          *,
          profiles!training_recommendations_salesperson_id_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedRecommendations: TrainingRecommendation[] = data?.map(item => ({
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

      setRecommendations(formattedRecommendations);
    } catch (error) {
      console.error('Error fetching training recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (recommendationId: string, status: 'pending' | 'in_progress' | 'completed') => {
    setProcessingId(recommendationId);
    
    try {
      const success = await updateTrainingRecommendationStatus(recommendationId, status);
      
      if (success) {
        setRecommendations(prev => prev.map(r => 
          r.id === recommendationId 
            ? { ...r, completionStatus: status, updatedAt: new Date().toISOString() }
            : r
        ));
      }
    } catch (error) {
      console.error('Error updating recommendation status:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const pendingRecommendations = recommendations.filter(r => r.completionStatus === 'pending');
  const inProgressRecommendations = recommendations.filter(r => r.completionStatus === 'in_progress');
  const completedRecommendations = recommendations.filter(r => r.completionStatus === 'completed');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading training recommendations...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2 text-orange-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingRecommendations.length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressRecommendations.length}</div>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedRecommendations.length}</div>
            <p className="text-xs text-muted-foreground">Finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="w-4 h-4 mr-2 text-purple-600" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {recommendations.length > 0 ? Math.round((completedRecommendations.length / recommendations.length) * 100) : 0}%
            </div>
            <Progress 
              value={recommendations.length > 0 ? (completedRecommendations.length / recommendations.length) * 100 : 0} 
              className="h-2 mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Pending Recommendations */}
      {pendingRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-orange-600" />
                Pending Recommendations ({pendingRecommendations.length})
              </span>
              <Badge variant="secondary">Action Required</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRecommendations.map((recommendation) => (
              <div key={recommendation.id} className={`p-4 rounded-lg border ${getPriorityColor(recommendation.priority)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={getPriorityBadgeVariant(recommendation.priority)} className="text-xs">
                        {recommendation.priority.toUpperCase()}
                      </Badge>
                      <span className="font-medium text-sm">{recommendation.recommendationType}</span>
                      {recommendation.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Due: {new Date(recommendation.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-semibold mb-2">{recommendation.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{recommendation.description}</p>
                    
                    {recommendation.skillsFocus.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Skills Focus:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {recommendation.skillsFocus.map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(recommendation.createdAt).toLocaleDateString()} • 
                      Created by: {recommendation.createdBy}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStatusUpdate(recommendation.id, 'in_progress')}
                      disabled={processingId === recommendation.id}
                    >
                      Start Training
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStatusUpdate(recommendation.id, 'completed')}
                      disabled={processingId === recommendation.id}
                    >
                      Mark Complete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* In Progress Recommendations */}
      {inProgressRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              In Progress ({inProgressRecommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inProgressRecommendations.map((recommendation) => (
                <div key={recommendation.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="text-xs">
                      {recommendation.recommendationType}
                    </Badge>
                    <span className="font-medium">{recommendation.title}</span>
                    <Badge variant={getPriorityBadgeVariant(recommendation.priority)} className="text-xs">
                      {recommendation.priority}
                    </Badge>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStatusUpdate(recommendation.id, 'completed')}
                    disabled={processingId === recommendation.id}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Completions */}
      {completedRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Recent Completions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedRecommendations.slice(0, 5).map((recommendation) => (
                <div key={recommendation.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-xs">
                      {recommendation.recommendationType}
                    </Badge>
                    <span className="font-medium">{recommendation.title}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="text-xs">
                      Completed
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(recommendation.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Recommendations */}
      {recommendations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Training Recommendations</h3>
            <p className="text-muted-foreground">
              All team members are performing well. New recommendations will appear here when needed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrainingRecommendationsPanel;
