
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, TrendingUp, Clock, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { getTrainingRecommendations, updateTrainingRecommendationStatus, generateTrainingRecommendations } from '@/services/trainingRecommendationsService';
import type { TrainingRecommendation } from '@/services/trainingRecommendationsService';
import { toast } from '@/hooks/use-toast';

const TrainingRecommendationsPanel = () => {
  const [recommendations, setRecommendations] = useState<TrainingRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const data = await getTrainingRecommendations();
      setRecommendations(data);
    } catch (error) {
      console.error('Error fetching training recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load training recommendations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (recommendationId: string, status: 'pending' | 'in_progress' | 'completed') => {
    setProcessingId(recommendationId);
    
    try {
      const success = await updateTrainingRecommendationStatus(recommendationId, status);
      
      if (success) {
        setRecommendations(prev => prev.map(rec => 
          rec.id === recommendationId ? { ...rec, completionStatus: status } : rec
        ));
        
        toast({
          title: "Status Updated",
          description: `Training recommendation marked as ${status}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update recommendation status",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleGenerateRecommendations = async () => {
    try {
      setLoading(true);
      await generateTrainingRecommendations('current-salesperson-id');
      await fetchRecommendations();
      
      toast({
        title: "Recommendations Generated",
        description: "New training recommendations have been created",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate recommendations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const pendingRecommendations = recommendations.filter(r => r.completionStatus === 'pending');
  const inProgressRecommendations = recommendations.filter(r => r.completionStatus === 'in_progress');
  const completedRecommendations = recommendations.filter(r => r.completionStatus === 'completed');

  const completionRate = recommendations.length > 0 
    ? (completedRecommendations.length / recommendations.length) * 100 
    : 0;

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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-blue-600" />
              Total Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendations.length}</div>
            <p className="text-xs text-muted-foreground">Training items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2 text-yellow-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingRecommendations.length}</div>
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
            <div className="mt-2">
              <Progress value={completionRate} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">{Math.round(completionRate)}% complete</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Training Recommendations</h2>
        <Button onClick={handleGenerateRecommendations} disabled={loading}>
          <BookOpen className="w-4 h-4 mr-2" />
          Generate New Recommendations
        </Button>
      </div>

      {/* Pending Recommendations */}
      {pendingRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
              Pending Recommendations ({pendingRecommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRecommendations.map((rec) => (
              <div key={rec.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold">{rec.title}</h4>
                      <Badge variant={getPriorityColor(rec.priority)}>
                        {rec.priority} priority
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {rec.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {rec.skillsFocus.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    
                    {rec.conversationExamples.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <strong>Examples:</strong> {rec.conversationExamples.slice(0, 2).join(', ')}
                        {rec.conversationExamples.length > 2 && '...'}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(rec.id, 'in_progress')}
                      disabled={processingId === rec.id}
                    >
                      Start
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(rec.id, 'completed')}
                      disabled={processingId === rec.id}
                    >
                      Complete
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
          <CardContent className="space-y-3">
            {inProgressRecommendations.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{rec.title}</span>
                    <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate(rec.id, 'completed')}
                  disabled={processingId === rec.id}
                >
                  Complete
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Completions */}
      {completedRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Recently Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedRecommendations.slice(0, 5).map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">{rec.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {rec.priority}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(rec.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {recommendations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Training Recommendations</h3>
            <p className="text-muted-foreground mb-4">
              Generate training recommendations to improve AI messaging quality
            </p>
            <Button onClick={handleGenerateRecommendations}>
              Generate Recommendations
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrainingRecommendationsPanel;
