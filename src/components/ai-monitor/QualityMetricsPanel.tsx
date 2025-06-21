
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useEnhancedAI } from '@/hooks/useEnhancedAI';
import { 
  TrendingUp, 
  MessageSquare, 
  Target, 
  Award,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface QualityInsights {
  averageQuality: number;
  bestPerformingTypes: string[];
  improvementAreas: string[];
}

const QualityMetricsPanel = () => {
  const [insights, setInsights] = useState<QualityInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const { getQualityInsights } = useEnhancedAI();

  useEffect(() => {
    const loadInsights = async () => {
      setLoading(true);
      try {
        const data = await getQualityInsights();
        setInsights(data);
      } catch (error) {
        console.error('Error loading quality insights:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [getQualityInsights]);

  const getQualityColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityStatus = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading quality metrics...</p>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No quality data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Quality Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Message Quality Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-bold">
                <span className={getQualityColor(insights.averageQuality)}>
                  {insights.averageQuality}
                </span>
                <span className="text-gray-500 text-lg">/100</span>
              </p>
              <p className="text-sm text-gray-500">
                Average Quality Score ({getQualityStatus(insights.averageQuality)})
              </p>
            </div>
            <div className="w-32">
              <Progress value={insights.averageQuality} className="h-3" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Best Performing Types */}
            <div>
              <h4 className="font-medium mb-3 flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Best Performing Types</span>
              </h4>
              <div className="space-y-2">
                {insights.bestPerformingTypes.length > 0 ? (
                  insights.bestPerformingTypes.map((type, index) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                      <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No performance data yet</p>
                )}
              </div>
            </div>

            {/* Improvement Areas */}
            <div>
              <h4 className="font-medium mb-3 flex items-center space-x-2">
                <Target className="h-4 w-4 text-orange-600" />
                <span>Improvement Areas</span>
              </h4>
              <div className="space-y-2">
                {insights.improvementAreas.length > 0 ? (
                  insights.improvementAreas.map((area) => (
                    <div key={area} className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">{area}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">No major issues identified</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Quality Metrics Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample quality metrics - in a real app, these would come from the API */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Length Optimization</span>
              <div className="flex items-center space-x-2">
                <Progress value={82} className="w-24 h-2" />
                <span className="text-sm text-gray-500">82%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Personalization</span>
              <div className="flex items-center space-x-2">
                <Progress value={75} className="w-24 h-2" />
                <span className="text-sm text-gray-500">75%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Clarity & Readability</span>
              <div className="flex items-center space-x-2">
                <Progress value={88} className="w-24 h-2" />
                <span className="text-sm text-gray-500">88%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Call-to-Action</span>
              <div className="flex items-center space-x-2">
                <Progress value={70} className="w-24 h-2" />
                <span className="text-sm text-gray-500">70%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Compliance</span>
              <div className="flex items-center space-x-2">
                <Progress value={95} className="w-24 h-2" />
                <span className="text-sm text-gray-500">95%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityMetricsPanel;
