
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  MessageSquare,
  Phone,
  Mail,
  Users,
  CheckCircle
} from 'lucide-react';
import { useConversionTracking } from '@/hooks/usePerformanceAnalytics';
import type { ConversionTrackingData, TouchpointData } from '@/services/performanceAnalyticsService';

interface ConversionTrackingPanelProps {
  leadId: string | null;
  className?: string;
}

const ConversionTrackingPanel: React.FC<ConversionTrackingPanelProps> = ({
  leadId,
  className = ''
}) => {
  const { conversionData, isLoading } = useConversionTracking(leadId);

  const getTouchpointIcon = (type: TouchpointData['type']) => {
    switch (type) {
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'call': return <Phone className="h-4 w-4" />;
      case 'appointment': return <Calendar className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'awareness': return 'bg-blue-100 text-blue-800';
      case 'consideration': return 'bg-yellow-100 text-yellow-800';
      case 'decision': return 'bg-green-100 text-green-800';
      case 'purchase': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'appointment_booked': return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'test_drive': return <Users className="h-4 w-4 text-green-600" />;
      case 'purchase': return <DollarSign className="h-4 w-4 text-purple-600" />;
      case 'lead_qualified': return <CheckCircle className="h-4 w-4 text-orange-600" />;
      default: return <TrendingUp className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Conversion Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!conversionData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Conversion Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            No conversion data available for this lead
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Journey Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Conversion Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge className={getStageColor(conversionData.journeyStage)}>
                {conversionData.journeyStage.replace('_', ' ').toUpperCase()}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">Current Stage</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{conversionData.touchpoints.length}</div>
              <p className="text-sm text-gray-600">Touchpoints</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{conversionData.timeToConversion}</div>
              <p className="text-sm text-gray-600">Days in Journey</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${conversionData.totalValue}</div>
              <p className="text-sm text-gray-600">Total Value</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Touchpoints Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Touchpoint Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {conversionData.touchpoints.map((touchpoint, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`p-2 rounded-full ${
                  touchpoint.aiGenerated ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {getTouchpointIcon(touchpoint.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{touchpoint.type}</span>
                    {touchpoint.aiGenerated && (
                      <Badge variant="outline" className="text-xs">AI</Badge>
                    )}
                    {touchpoint.responseReceived && (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {touchpoint.timestamp.toLocaleDateString()} at {touchpoint.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {(touchpoint.sentiment * 100).toFixed(0)}%
                  </div>
                  <p className="text-xs text-gray-600">Sentiment</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Events */}
      {conversionData.conversionEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversion Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conversionData.conversionEvents.map((event, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-full">
                    {getEventIcon(event.eventType)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {event.eventType.replace('_', ' ')}
                    </div>
                    <p className="text-sm text-gray-600">
                      {event.timestamp.toLocaleDateString()} at {event.timestamp.toLocaleTimeString()}
                    </p>
                    {event.contributingFactors.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {event.contributingFactors.slice(0, 3).map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {event.value > 0 && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        ${event.value}
                      </div>
                      <p className="text-xs text-gray-600">Value</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>AI Engagement</span>
                <span>
                  {conversionData.touchpoints.filter(t => t.aiGenerated).length}/
                  {conversionData.touchpoints.length}
                </span>
              </div>
              <Progress 
                value={(conversionData.touchpoints.filter(t => t.aiGenerated).length / conversionData.touchpoints.length) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Response Rate</span>
                <span>
                  {conversionData.touchpoints.filter(t => t.responseReceived).length}/
                  {conversionData.touchpoints.length}
                </span>
              </div>
              <Progress 
                value={(conversionData.touchpoints.filter(t => t.responseReceived).length / conversionData.touchpoints.length) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Journey Completion</span>
                <span>{Math.min((conversionData.timeToConversion / 30) * 100, 100).toFixed(0)}%</span>
              </div>
              <Progress 
                value={Math.min((conversionData.timeToConversion / 30) * 100, 100)}
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversionTrackingPanel;
