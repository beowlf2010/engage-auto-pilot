
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Clock, TrendingDown, Lightbulb } from 'lucide-react';
import { ChurnPrediction, predictChurnRisk } from '@/services/leadScoringService';

interface ChurnPredictionCardProps {
  leadId: string;
}

const ChurnPredictionCard = ({ leadId }: ChurnPredictionCardProps) => {
  const [prediction, setPrediction] = useState<ChurnPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChurnPrediction = async () => {
      try {
        setLoading(true);
        const churnPrediction = await predictChurnRisk(leadId);
        setPrediction(churnPrediction);
      } catch (error) {
        console.error('Error loading churn prediction:', error);
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      loadChurnPrediction();
    }
  }, [leadId]);

  const getChurnColor = (probability: number) => {
    if (probability >= 70) return 'text-red-600';
    if (probability >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getChurnBadge = (probability: number) => {
    if (probability >= 70) return 'destructive';
    if (probability >= 40) return 'secondary';
    return 'default';
  };

  const getChurnLabel = (probability: number) => {
    if (probability >= 70) return 'HIGH RISK';
    if (probability >= 40) return 'MEDIUM RISK';
    return 'LOW RISK';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-500">Unable to predict churn risk</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Churn Risk Analysis
          </div>
          <Badge variant={getChurnBadge(prediction.churnProbability)}>
            {getChurnLabel(prediction.churnProbability)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Churn Probability */}
        <div className="text-center mb-6">
          <div className={`text-6xl font-bold ${getChurnColor(prediction.churnProbability)} mb-2`}>
            {prediction.churnProbability}%
          </div>
          <div className="text-sm text-gray-600">Churn Probability</div>
          <Progress 
            value={prediction.churnProbability} 
            className="mt-2" 
          />
        </div>

        {/* Activity Info */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Days Since Last Response</span>
            </div>
            <span className={`font-bold ${prediction.daysSinceLastResponse > 7 ? 'text-red-600' : 'text-green-600'}`}>
              {prediction.daysSinceLastResponse}
            </span>
          </div>

          <div className="text-xs text-gray-600">
            <span className="font-medium">Last Activity:</span> {new Date(prediction.lastActivity).toLocaleDateString()}
          </div>
        </div>

        {/* Risk Factors */}
        {prediction.riskFactors.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Risk Factors
            </h4>
            <ul className="space-y-1">
              {prediction.riskFactors.map((factor, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-red-500 text-xs">•</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Intervention Suggestions */}
        {prediction.interventionSuggestions.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-500" />
              Intervention Suggestions
            </h4>
            <div className="space-y-2">
              {prediction.interventionSuggestions.map((suggestion, index) => (
                <div key={index} className="text-sm text-gray-700 p-2 bg-blue-50 rounded">
                  {suggestion}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" className="flex-1">
                Send Follow-up
              </Button>
              <Button size="sm" className="flex-1">
                Schedule Call
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChurnPredictionCard;
