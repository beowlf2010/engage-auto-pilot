
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Phone, Calendar, Eye, ArrowDown, ArrowUp } from "lucide-react";
import { Lead } from "@/types/lead";
import LeadStatusBadge from "./LeadStatusBadge";
import LeadContactStatusBadge from "./LeadContactStatusBadge";
import FreshLeadBadge from "./FreshLeadBadge";
import AIPreviewPopout from "./AIPreviewPopout";
import EnhancedAIStatusDisplay from "./EnhancedAIStatusDisplay";

interface LeadsTableRowProps {
  lead: Lead;
  selectedLeads: string[];
  onLeadSelect: (leadId: string) => void;
  onAiOptInChange: (leadId: string, value: boolean) => void;
  onDoNotContactChange?: (leadId: string, field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => void;
  canEdit: boolean;
  onQuickView: (lead: Lead) => void;
  getEngagementScore: (lead: Lead) => number;
  isFresh: boolean;
}

const LeadsTableRow = ({
  lead,
  selectedLeads,
  onLeadSelect,
  onAiOptInChange,
  onDoNotContactChange,
  canEdit,
  onQuickView,
  getEngagementScore,
  isFresh
}: LeadsTableRowProps) => {
  const navigate = useNavigate();

  const handleMessageClick = (lead: Lead) => {
    navigate(`/inbox?leadId=${lead.id}`);
  };

  const handleCallClick = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`);
  };

  const handleScheduleClick = (lead: Lead) => {
    navigate(`/appointments/schedule?leadId=${lead.id}`);
  };

  const handleLeadClick = (leadId: string) => {
    navigate(`/lead/${leadId}`);
  };

  const engagementScore = getEngagementScore(lead);

  // Get message intensity from available lead data or default to 'gentle'
  const messageIntensity = 'gentle'; // Default since property doesn't exist on Lead type

  return (
    <TableRow key={lead.id} className="hover:bg-gray-50">
      <TableCell>
        <Checkbox
          checked={selectedLeads.includes(lead.id.toString())}
          onCheckedChange={() => onLeadSelect(lead.id.toString())}
        />
      </TableCell>
      
      {/* Lead Name with Fresh Badge */}
      <TableCell>
        <div className="flex items-center space-x-2">
          {isFresh && (
            <FreshLeadBadge 
              createdAt={lead.createdAt} 
              aiOptIn={lead.aiOptIn}
              nextAiSendAt={lead.nextAiSendAt}
            />
          )}
          <div>
            <button
              onClick={() => handleLeadClick(lead.id.toString())}
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              {lead.firstName} {lead.lastName}
            </button>
            {lead.email && (
              <div className="text-sm text-gray-500 truncate max-w-32">{lead.email}</div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Source */}
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {lead.source}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell>
        <div className="space-y-1">
          <LeadStatusBadge status={lead.status} />
          <LeadContactStatusBadge contactStatus={lead.contactStatus || 'no_contact'} />
        </div>
      </TableCell>

      {/* Vehicle Interest */}
      <TableCell>
        <div className="text-sm">{lead.vehicleInterest || 'Not specified'}</div>
      </TableCell>

      {/* AI Process - Enhanced Display */}
      <TableCell>
        <div className="space-y-1">
          {canEdit && !lead.aiOptIn ? (
            <AIPreviewPopout
              lead={lead}
              onAIOptInChange={onAiOptInChange}
            >
              <div className="cursor-pointer">
                <EnhancedAIStatusDisplay
                  aiOptIn={false}
                  size="sm"
                />
              </div>
            </AIPreviewPopout>
          ) : (
            <EnhancedAIStatusDisplay
              aiOptIn={lead.aiOptIn}
              messageIntensity={messageIntensity}
              aiMessagesSent={lead.aiMessagesSent}
              aiSequencePaused={lead.aiSequencePaused}
              incomingCount={lead.incomingCount}
              outgoingCount={lead.outgoingCount}
              unrepliedCount={lead.unrepliedCount}
              size="sm"
              showDetailed={true}
            />
          )}
          
          {/* AI Stage and Next Message Info */}
          {lead.aiOptIn && (
            <div className="text-xs text-gray-500 space-y-1">
              {lead.aiStage && (
                <div>Stage: {lead.aiStage}</div>
              )}
              {lead.nextAiSendAt && (
                <div>Next: {new Date(lead.nextAiSendAt).toLocaleDateString()} {new Date(lead.nextAiSendAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              )}
            </div>
          )}
        </div>
      </TableCell>

      {/* Contact Info */}
      <TableCell>
        <div className="space-y-1">
          {lead.primaryPhone && (
            <div className="text-sm">{lead.primaryPhone}</div>
          )}
          <div className="text-xs text-gray-500">
            {new Date(lead.createdAt).toLocaleDateString()}
          </div>
        </div>
      </TableCell>

      {/* Engagement Score */}
      <TableCell>
        <Badge 
          variant={engagementScore > 70 ? "default" : engagementScore > 40 ? "secondary" : "outline"}
        >
          {engagementScore}%
        </Badge>
      </TableCell>

      {/* Messages */}
      <TableCell>
        <div className="text-center space-y-1">
          <div className="font-medium">{lead.messageCount || 0}</div>
          {lead.unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {lead.unreadCount} new
            </Badge>
          )}
          {lead.lastMessage && (
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center gap-1 justify-center">
                {lead.lastMessageDirection && (
                  <Badge 
                    variant={lead.lastMessageDirection === 'in' ? 'default' : 'secondary'}
                    className={`text-xs px-1 py-0 ${
                      lead.lastMessageDirection === 'in' 
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : 'bg-blue-100 text-blue-700 border-blue-200'
                    }`}
                  >
                    {lead.lastMessageDirection === 'in' ? (
                      <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUp className="w-3 h-3" />
                    )}
                  </Badge>
                )}
              </div>
              <div className="truncate max-w-24">{lead.lastMessage}</div>
              <div>{lead.lastMessageTime}</div>
            </div>
          )}
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleMessageClick(lead)}
            className="h-8 w-8 p-0"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          
          {lead.primaryPhone && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCallClick(lead.primaryPhone)}
              className="h-8 w-8 p-0"
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleScheduleClick(lead)}
            className="h-8 w-8 p-0"
          >
            <Calendar className="h-8 w-8 p-0" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onQuickView(lead)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default LeadsTableRow;
