
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, HelpCircle, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { unknownMessageLearning } from '@/services/unknownMessageLearning';

const UnknownMessageLearning = () => {
  const [stats, setStats] = useState({
    totalUnknown: 0,
    recentUnknown: 0,
    resolvedCount: 0,
    learnedPatterns: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const unknownStats = await unknownMessageLearning.getUnknownMessageStats();
      setStats(unknownStats);
    } catch (error) {
      console.error('Error loading unknown message stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolutionRate = stats.totalUnknown > 0 ? (stats.resolvedCount / stats.totalUnknown) * 100 : 0;
  const learningEfficiency = stats.learnedPatterns > 0 ? (stats.resolvedCount / stats.learnedPatterns) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Unknown Message Learning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading learning statistics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Unknown Message Learning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.totalUnknown}</div>
              <div className="text-sm text-gray-600">Total Unknown</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.recentUnknown}</div>
              <div className="text-sm text-gray-600">Recent (7 days)</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.resolvedCount}</div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.learnedPatterns}</div>
              <div className="text-sm text-gray-600">Learned Patterns</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Resolution Rate</span>
                <span className="text-sm text-gray-600">{resolutionRate.toFixed(1)}%</span>
              </div>
              <Progress value={resolutionRate} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Learning Efficiency</span>
                <span className="text-sm text-gray-600">{learningEfficiency.toFixed(1)}%</span>
              </div>
              <Progress value={learningEfficiency} className="h-2" />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {stats.recentUnknown > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                {stats.recentUnknown} Recent Unknown
              </Badge>
            )}
            
            {resolutionRate > 70 && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3" />
                High Resolution Rate
              </Badge>
            )}
            
            {stats.learnedPatterns > 5 && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-700">
                <TrendingUp className="w-3 h-3" />
                Active Learning
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Unknown Message Detection</div>
              <div className="text-gray-600">When Finn can't generate a response, the system captures the message for learning</div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Users className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Human Response Capture</div>
              <div className="text-gray-600">When humans respond to unknown messages, their responses become training data</div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Brain className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Pattern Learning</div>
              <div className="text-gray-600">The system learns patterns and can handle similar messages in the future</div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Adaptive Improvement</div>
              <div className="text-gray-600">Finn gets smarter over time by learning from successful human interventions</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnknownMessageLearning;
