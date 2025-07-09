import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  MessageSquare, 
  BarChart3, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Zap,
  Database,
  Target,
  Activity
} from 'lucide-react';
import { useComprehensiveAIContentGeneration } from '@/hooks/useComprehensiveAIContentGeneration';

export const ComprehensiveAIContentGenerator: React.FC = () => {
  const { 
    isGenerating, 
    progress, 
    phases, 
    startGeneration, 
    resetGeneration 
  } = useComprehensiveAIContentGeneration();

  const phaseIcons = {
    'Conversation Intelligence': MessageSquare,
    'Feedback & Performance': BarChart3,
    'Learning Insights': Brain,
    'Predictive Analytics': TrendingUp,
    'Conversation Context': Users,
    'Edge Case Scenarios': AlertTriangle
  };

  const getPhaseIcon = (phaseName: string) => {
    const IconComponent = phaseIcons[phaseName as keyof typeof phaseIcons] || Brain;
    return <IconComponent className="w-4 h-4" />;
  };

  const getPhaseStatus = (phaseName: string) => {
    if (progress.isComplete) return 'complete';
    if (progress.phase === phaseName) return 'active';
    
    const phaseIndex = phases.findIndex(p => p.name === phaseName);
    const currentPhaseIndex = phases.findIndex(p => p.name === progress.phase);
    
    if (phaseIndex < currentPhaseIndex) return 'complete';
    return 'pending';
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" />
            Comprehensive AI Content Generation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate 50,000+ AI learning records across 6 comprehensive phases to build a robust training database
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Generation Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm font-medium">Target Records</div>
                <div className="text-lg font-bold text-blue-600">50,000+</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm font-medium">Generation Phases</div>
                <div className="text-lg font-bold text-green-600">6</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Zap className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-sm font-medium">AI Categories</div>
                <div className="text-lg font-bold text-purple-600">12+</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={startGeneration}
              disabled={isGenerating}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isGenerating ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Start Comprehensive Generation
                </>
              )}
            </Button>
            
            {progress.isComplete && (
              <Button 
                onClick={resetGeneration}
                variant="outline"
                size="lg"
              >
                Reset Progress
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      {(isGenerating || progress.isComplete) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Generation Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {progress.totalProgress}%
                </span>
              </div>
              <Progress value={progress.totalProgress} className="h-2" />
            </div>

            {/* Current Action */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium mb-1">Current Action</div>
              <div className="text-sm text-gray-600">{progress.currentAction}</div>
            </div>

            {/* Phase Progress */}
            {progress.phase && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    Phase: {progress.phase}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {progress.phaseProgress}%
                  </span>
                </div>
                <Progress value={progress.phaseProgress} className="h-1" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Phase Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Generation Phases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {phases.map((phase, index) => {
              const status = getPhaseStatus(phase.name);
              return (
                <div 
                  key={phase.name}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    status === 'complete' ? 'bg-green-50 border-green-200' :
                    status === 'active' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    status === 'complete' ? 'bg-green-100 text-green-600' :
                    status === 'active' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {status === 'complete' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      getPhaseIcon(phase.name)
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{phase.name}</span>
                      <Badge variant={
                        status === 'complete' ? 'default' :
                        status === 'active' ? 'secondary' :
                        'outline'
                      }>
                        {status === 'complete' ? 'Complete' :
                         status === 'active' ? 'In Progress' :
                         'Pending'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {phase.name === 'Conversation Intelligence' && 'Generate 10,000+ conversation responses and multi-turn threads'}
                      {phase.name === 'Feedback & Performance' && 'Create 15,000+ feedback records and performance analytics'}
                      {phase.name === 'Learning Insights' && 'Generate 5,000+ actionable AI learning insights'}
                      {phase.name === 'Predictive Analytics' && 'Build 2,000+ predictive models and engagement forecasts'}
                      {phase.name === 'Conversation Context' && 'Create 8,000+ contextual conversation metadata records'}
                      {phase.name === 'Edge Case Scenarios' && 'Generate 3,000+ complex real-world scenarios'}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {phase.weight}%
                    </div>
                    <div className="text-xs text-gray-500">
                      weight
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {progress.isComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Generation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">Conversation Responses</div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatNumber(progress.stats.conversationResponses)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium">Feedback Records</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatNumber(progress.stats.feedbackRecords)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Brain className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-sm font-medium">Learning Insights</div>
                  <div className="text-lg font-bold text-purple-600">
                    {formatNumber(progress.stats.learningInsights)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
                <div>
                  <div className="text-sm font-medium">Performance Data</div>
                  <div className="text-lg font-bold text-yellow-600">
                    {formatNumber(progress.stats.performanceData)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="text-sm font-medium">Context Records</div>
                  <div className="text-lg font-bold text-indigo-600">
                    {formatNumber(progress.stats.contextRecords)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="text-sm font-medium">Edge Cases</div>
                  <div className="text-lg font-bold text-red-600">
                    {formatNumber(progress.stats.edgeCases)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-purple-800">
                  Total Records Generated
                </span>
              </div>
              <div className="text-3xl font-bold text-purple-600">
                {formatNumber(progress.stats.total)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};