
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, Clock, CheckCircle, Play, ArrowRight } from 'lucide-react';
import { TrainingRecommendation } from '@/services/trainingRecommendationsService';
import { formatDistanceToNow } from 'date-fns';

interface TrainingRecommendationCardProps {
  recommendation: TrainingRecommendation;
  onStatusUpdate?: (recommendationId: string, status: 'pending' | 'in_progress' | 'completed') => void;
  showActions?: boolean;
}

const TrainingRecommendationCard = ({ 
  recommendation, 
  onStatusUpdate, 
  showActions = true 
}: TrainingRecommendationCardProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'in_progress': return <Play className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getNextAction = () => {
    switch (recommendation.completionStatus) {
      case 'pending': return { text: 'Start Training', status: 'in_progress' as const };
      case 'in_progress': return { text: 'Mark Complete', status: 'completed' as const };
      case 'completed': return null;
      default: return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <Card className={`border-l-4 ${recommendation.priority === 'high' ? 'border-l-red-500' : recommendation.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <GraduationCap className="h-4 w-4" />
            {recommendation.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getPriorityColor(recommendation.priority)}>
              {recommendation.priority.toUpperCase()}
            </Badge>
            <Badge variant="outline" className={`${getStatusColor(recommendation.completionStatus)} flex items-center gap-1`}>
              {getStatusIcon(recommendation.completionStatus)}
              {recommendation.completionStatus.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <h4 className="text-sm font-medium mb-1">Description</h4>
          <p className="text-sm text-gray-700">{recommendation.description}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-1">Type</h4>
          <Badge variant="outline" className="text-xs">
            {recommendation.recommendationType.replace('_', ' ')}
          </Badge>
        </div>

        {recommendation.skillsFocus.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Skills Focus</h4>
            <div className="flex flex-wrap gap-1">
              {recommendation.skillsFocus.map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {recommendation.dueDate && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="h-3 w-3" />
            Due: {new Date(recommendation.dueDate).toLocaleDateString()}
          </div>
        )}

        <div className="text-xs text-gray-500">
          Created {formatDistanceToNow(new Date(recommendation.createdAt), { addSuffix: true })}
        </div>

        {showActions && nextAction && onStatusUpdate && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusUpdate(recommendation.id, nextAction.status)}
              className="w-full"
            >
              {nextAction.text}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainingRecommendationCard;
