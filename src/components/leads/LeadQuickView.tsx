
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Car, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar,
  MapPin,
  Bot,
  TrendingUp,
  Clock,
  Star
} from "lucide-react";
import { Lead } from "@/types/lead";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";

interface LeadQuickViewProps {
  lead: Lead;
  onClose: () => void;
  onMessage: (lead: Lead) => void;
  onCall: (phoneNumber: string) => void;
  onSchedule: (lead: Lead) => void;
}

const LeadQuickView = ({ lead, onClose, onMessage, onCall, onSchedule }: LeadQuickViewProps) => {
  const getEngagementScore = (lead: Lead) => {
    let score = 0;
    if (lead.incomingCount > 0) score += 40;
    if (lead.outgoingCount > 0) score += 20;
    if (lead.lastMessageTime) score += 20;
    if (lead.aiOptIn) score += 10;
    if (lead.status === 'engaged') score += 10;
    return Math.min(score, 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const engagementScore = getEngagementScore(lead);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {lead.firstName} {lead.lastName}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={lead.status === 'new' ? 'default' : 'secondary'}>
              {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
            </Badge>
            <Badge variant="outline">
              {lead.contactStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
            {lead.unreadCount > 0 && (
              <Badge variant="destructive">{lead.unreadCount} unread</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Engagement Score */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Engagement Score</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(engagementScore)}`}>
                {engagementScore}
              </span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`h-4 w-4 ${engagementScore >= star * 20 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onMessage(lead)}
              disabled={lead.doNotCall}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onCall(lead.primaryPhone)}
              disabled={!lead.primaryPhone || lead.doNotCall}
            >
              <Phone className="h-4 w-4 mr-1" />
              Call
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onSchedule(lead)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Schedule
            </Button>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Information
            </h4>
            
            {lead.primaryPhone && (
              <div className="flex items-center justify-between">
                <span className="text-sm">{formatPhoneForDisplay(lead.primaryPhone)}</span>
                <Badge variant="secondary" className="text-xs">Primary</Badge>
              </div>
            )}
            
            {lead.phoneNumbers?.length > 1 && (
              <div className="text-xs text-gray-500">
                +{lead.phoneNumbers.length - 1} additional numbers
              </div>
            )}

            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-gray-500" />
                <span className="text-sm">{lead.email}</span>
              </div>
            )}

            {(lead.city || lead.state) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-gray-500" />
                <span className="text-sm">
                  {lead.city}{lead.city && lead.state && ', '}{lead.state}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Vehicle Interest */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehicle Interest
            </h4>
            <div className="text-sm">{lead.vehicleInterest}</div>
            {(lead.vehicleYear || lead.vehicleMake || lead.vehicleModel) && (
              <div className="text-xs text-gray-600">
                {lead.vehicleYear} {lead.vehicleMake} {lead.vehicleModel}
              </div>
            )}
          </div>

          <Separator />

          {/* AI & Communication Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Status
              </h4>
              <Badge variant={lead.aiOptIn ? 'default' : 'secondary'}>
                {lead.aiOptIn ? 'Enabled' : 'Disabled'}
              </Badge>
              {lead.aiStage && (
                <div className="text-xs text-gray-600">Stage: {lead.aiStage}</div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Messages
              </h4>
              <div className="text-sm space-y-1">
                <div>Sent: {lead.outgoingCount || 0}</div>
                <div>Received: {lead.incomingCount || 0}</div>
              </div>
            </div>
          </div>

          {lead.lastMessageTime && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-3 w-3" />
                Last contact: {lead.lastMessageTime}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadQuickView;
