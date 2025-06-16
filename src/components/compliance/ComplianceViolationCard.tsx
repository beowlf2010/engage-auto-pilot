
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ComplianceViolation } from '@/services/complianceMonitoringService';
import { formatDistanceToNow } from 'date-fns';

interface ComplianceViolationCardProps {
  violation: ComplianceViolation;
  onReview?: (violationId: string, status: 'resolved' | 'false_positive') => void;
  showActions?: boolean;
}

const ComplianceViolationCard = ({ violation, onReview, showActions = true }: ComplianceViolationCardProps) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'false_positive': return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'open': return <Clock className="h-4 w-4 text-orange-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'false_positive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'open': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            {violation.violationType}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getSeverityColor(violation.severity)}>
              {violation.severity.toUpperCase()}
            </Badge>
            <Badge variant="outline" className={`${getStatusColor(violation.status)} flex items-center gap-1`}>
              {getStatusIcon(violation.status)}
              {violation.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <h4 className="text-sm font-medium mb-1">Description</h4>
          <p className="text-sm text-gray-700">{violation.description}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-1">Detected Content</h4>
          <div className="bg-gray-50 p-2 rounded text-sm font-mono text-gray-700 border">
            "{violation.detectedContent}"
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Confidence: {Math.round(violation.confidenceScore * 100)}%
          </span>
          <span>
            {formatDistanceToNow(new Date(violation.createdAt), { addSuffix: true })}
          </span>
        </div>

        {showActions && violation.status === 'open' && onReview && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReview(violation.id, 'resolved')}
              className="flex-1"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Mark Resolved
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReview(violation.id, 'false_positive')}
              className="flex-1"
            >
              <XCircle className="h-3 w-3 mr-1" />
              False Positive
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComplianceViolationCard;
