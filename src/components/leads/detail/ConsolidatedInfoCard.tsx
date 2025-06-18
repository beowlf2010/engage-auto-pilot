
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, MapPin, Calendar, TrendingUp } from "lucide-react";
import type { LeadDetailData } from "@/services/leadDetailService";

interface ConsolidatedInfoCardProps {
  lead: LeadDetailData;
}

const ConsolidatedInfoCard: React.FC<ConsolidatedInfoCardProps> = ({ lead }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lead Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vehicle Interest */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Car className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Vehicle Interest</span>
          </div>
          <p className="text-sm text-gray-900 font-medium">{lead.vehicleInterest}</p>
          {(lead.vehicleYear || lead.vehicleMake || lead.vehicleModel) && (
            <p className="text-xs text-gray-500 mt-1">
              {[lead.vehicleYear, lead.vehicleMake, lead.vehicleModel].filter(Boolean).join(' ')}
            </p>
          )}
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Location</span>
          </div>
          <p className="text-sm text-gray-900">
            {lead.city && lead.state ? `${lead.city}, ${lead.state}` : 'Not provided'}
          </p>
        </div>

        {/* Timeline */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Timeline</span>
          </div>
          <p className="text-sm text-gray-900">
            Created {new Date(lead.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Engagement Stats */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Engagement</span>
          </div>
          <div className="flex space-x-4 text-sm">
            <span className="text-gray-600">
              <span className="font-medium text-gray-900">{lead.conversations.length}</span> messages
            </span>
            <span className="text-gray-600">
              <span className="font-medium text-gray-900">{lead.conversations.filter(c => c.direction === 'in').length}</span> responses
            </span>
          </div>
        </div>

        {/* AI Status */}
        {lead.aiOptIn && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">AI Automation</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            </div>
            {lead.aiStage && (
              <p className="text-xs text-gray-500 mt-1">
                Current stage: {lead.aiStage}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsolidatedInfoCard;
