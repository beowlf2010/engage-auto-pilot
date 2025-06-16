
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Car, 
  Star, 
  TrendingUp, 
  Brain, 
  DollarSign,
  Calendar,
  Loader2,
  RefreshCw,
  Target
} from 'lucide-react';
import { VehicleMatch, getPersonalizedInventory } from '@/services/aiVehicleMatchingService';
import { toast } from '@/hooks/use-toast';

interface SmartVehicleRecommendationsProps {
  leadId: string;
}

const SmartVehicleRecommendations = ({ leadId }: SmartVehicleRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<VehicleMatch[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await getPersonalizedInventory(leadId);
      setRecommendations(data.recommendations);
      setInsights(data.insights);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load vehicle recommendations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshRecommendations = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
    toast({
      title: "Recommendations Updated",
      description: "AI has analyzed latest conversation data",
    });
  };

  useEffect(() => {
    if (leadId) {
      loadRecommendations();
    }
  }, [leadId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">AI is analyzing vehicle preferences...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Vehicle Recommendations
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshRecommendations}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Lead Insights */}
          {insights && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Conversation Insights
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Urgency:</span>
                  <Badge variant="outline" className="ml-1 text-xs">
                    {insights.urgency}
                  </Badge>
                </div>
                {insights.budgetConcerns && (
                  <div>
                    <span className="text-blue-700 font-medium">Budget Conscious</span>
                    <DollarSign className="h-3 w-3 inline ml-1 text-green-600" />
                  </div>
                )}
                {insights.familySize && (
                  <div>
                    <span className="text-blue-700 font-medium">Family Size:</span>
                    <span className="ml-1">{insights.familySize}</span>
                  </div>
                )}
                {insights.mentionedFeatures.length > 0 && (
                  <div>
                    <span className="text-blue-700 font-medium">Key Features:</span>
                    <span className="ml-1 text-xs">{insights.mentionedFeatures.slice(0, 2).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No matches found</h3>
              <p className="text-gray-500">Try updating the lead's vehicle preferences</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((vehicle, index) => (
                <Card key={vehicle.inventoryId} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                          {vehicle.trim && <span className="text-gray-600 ml-1">{vehicle.trim}</span>}
                        </h4>
                        <p className="text-gray-600 text-sm">VIN: {vehicle.vin}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ${vehicle.price.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`h-2 w-16 rounded-full ${getScoreColor(vehicle.matchScore)}`}>
                            <div 
                              className="h-full bg-white bg-opacity-30 rounded-full"
                              style={{ width: `${vehicle.matchScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{vehicle.matchScore}% match</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium text-sm">AI Recommendation</span>
                        <Badge variant="outline" className={`text-xs ${getConfidenceColor(vehicle.confidence)}`}>
                          {Math.round(vehicle.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 italic">
                        "{vehicle.aiRecommendation}"
                      </p>
                    </div>

                    {vehicle.matchReasons.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-medium text-sm mb-1">Why this matches:</h5>
                        <div className="flex flex-wrap gap-1">
                          {vehicle.matchReasons.slice(0, 3).map((reason, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator className="my-3" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{vehicle.year}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>#{index + 1} match</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        <Button size="sm">
                          Recommend to Lead
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartVehicleRecommendations;
