
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MessageSquare, User, Phone, Mail, MapPin, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LeadStatusBadge from "../LeadStatusBadge";
import EnhancedAIControls from "./EnhancedAIControls";
import type { Lead } from "@/types/lead";

interface LeadDetailPageHeaderProps {
  lead: Lead;
  onSendMessage: () => void;
  onAIOptInChange: (enabled: boolean) => Promise<void>;
  onAITakeoverChange?: (enabled: boolean, delayMinutes: number) => Promise<void>;
}

const LeadDetailPageHeader: React.FC<LeadDetailPageHeaderProps> = ({
  lead,
  onSendMessage,
  onAIOptInChange,
  onAITakeoverChange
}) => {
  return (
    <div className="bg-white border-b border-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Lead Info Section */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {lead.firstName} {lead.lastName}
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <LeadStatusBadge status={lead.status} />
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">
                      Created {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <Button onClick={onSendMessage} className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Send Message</span>
              </Button>
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Contact Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>Contact</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{lead.primaryPhone}</div>
                    {lead.email && (
                      <div className="text-xs text-gray-500 flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{lead.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Location</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm">
                    {lead.city && lead.state ? (
                      <span>{lead.city}, {lead.state}</span>
                    ) : (
                      <span className="text-gray-400">Not provided</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Interest */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Car className="w-4 h-4" />
                    <span>Interest</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm font-medium">{lead.vehicleInterest}</div>
                  {(lead.vehicleYear || lead.vehicleMake || lead.vehicleModel) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {[lead.vehicleYear, lead.vehicleMake, lead.vehicleModel].filter(Boolean).join(' ')}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Engagement Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Engagement</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Messages:</span>
                      <span className="font-medium">{lead.messageCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Responses:</span>
                      <span className="font-medium">{lead.incomingCount}</span>
                    </div>
                    {lead.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {lead.unreadCount} unread
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AI Controls Section */}
          <div className="w-full lg:w-80">
            <EnhancedAIControls
              leadId={lead.id}
              aiOptIn={lead.aiOptIn}
              aiStage={lead.aiStage}
              aiMessagesSent={lead.aiMessagesSent}
              aiSequencePaused={lead.aiSequencePaused}
              aiPauseReason={lead.aiPauseReason}
              aiResumeAt={lead.aiResumeAt}
              nextAiSendAt={lead.nextAiSendAt}
              aiTakeoverEnabled={(lead as any).aiTakeoverEnabled}
              aiTakeoverDelayMinutes={(lead as any).aiTakeoverDelayMinutes}
              pendingHumanResponse={(lead as any).pendingHumanResponse}
              humanResponseDeadline={(lead as any).humanResponseDeadline}
              onAIOptInChange={onAIOptInChange}
              onAITakeoverChange={onAITakeoverChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailPageHeader;
