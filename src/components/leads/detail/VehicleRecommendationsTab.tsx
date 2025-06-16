
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Car, Sparkles, TrendingUp } from 'lucide-react';
import SmartVehicleRecommendations from '../SmartVehicleRecommendations';
import { LeadDetailData } from '@/services/leadDetailService';

interface VehicleRecommendationsTabProps {
  lead: LeadDetailData;
}

const VehicleRecommendationsTab = ({ lead }: VehicleRecommendationsTabProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI-Powered Vehicle Matching
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Car className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="font-semibold text-blue-900">Lead Interest</div>
              <div className="text-sm text-blue-700">{lead.vehicleInterest}</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="font-semibold text-green-900">AI Analysis</div>
              <div className="text-sm text-green-700">Active</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="font-semibold text-purple-900">Match Quality</div>
              <div className="text-sm text-purple-700">High Confidence</div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="text-sm text-gray-600">
            <p className="mb-2">
              AI analyzes conversation patterns, budget signals, urgency indicators, and behavioral cues 
              to recommend the most relevant vehicles from your inventory.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Conversation Analysis</Badge>
              <Badge variant="outline">Budget Intelligence</Badge>
              <Badge variant="outline">Urgency Detection</Badge>
              <Badge variant="outline">Feature Matching</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Recommendations */}
      <SmartVehicleRecommendations leadId={lead.id} />
    </div>
  );
};

export default VehicleRecommendationsTab;
