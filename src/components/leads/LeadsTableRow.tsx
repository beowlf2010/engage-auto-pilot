
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Phone, Calendar, Eye } from "lucide-react";
import { Lead } from "@/types/lead";
import LeadStatusBadge from "./LeadStatusBadge";
import LeadContactStatusBadge from "./LeadContactStatusBadge";
import FreshLeadBadge from "./FreshLeadBadge";
import AIPreviewPopout from "./AIPreviewPopout";
import DoNotContactControls from "./DoNotContactControls";

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

  const handleAIToggle = (checked: boolean) => {
    // If disabling AI, use simple toggle
    if (!checked) {
      onAiOptInChange(lead.id.toString(), false);
    }
    // If enabling AI, it will be handled by AIPreviewPopout
  };

  const handleAIEnabled = () => {
    onAiOptInChange(lead.id.toString(), true);
  };

  const engagementScore = getEngagementScore(lead);

  return (
    <TableRow key={lead.id} className="hover:bg-gray-50">
      <TableCell>
        <Checkbox
          checked={selectedLeads.includes(lead.id.toString())}
          onCheckedChange={() => onLeadSelect(lead.id.toString())}
        />
      </TableCell>
      
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
              <div className="text-sm text-gray-500">{lead.email}</div>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="space-y-1">
          {lead.primaryPhone && (
            <div className="text-sm">{lead.primaryPhone}</div>
          )}
          <LeadContactStatusBadge contactStatus={lead.contactStatus || 'no_contact'} />
        </div>
      </TableCell>

      <TableCell>
        <LeadStatusBadge status={lead.status} />
      </TableCell>

      <TableCell>
        <div className="text-sm">{lead.vehicleInterest || 'Not specified'}</div>
      </TableCell>

      <TableCell>
        <Badge variant="outline">{lead.source}</Badge>
      </TableCell>

      <TableCell>
        <div className="text-sm text-gray-500">
          {new Date(lead.createdAt).toLocaleDateString()}
        </div>
      </TableCell>

      <TableCell>
        <Badge 
          variant={engagementScore > 70 ? "default" : engagementScore > 40 ? "secondary" : "outline"}
        >
          {engagementScore}%
        </Badge>
      </TableCell>

      <TableCell>
        <div className="space-y-1">
          {canEdit && (
            <div className="flex items-center gap-2">
              {!lead.aiOptIn ? (
                // Show preview modal when enabling AI
                <AIPreviewPopout
                  lead={lead}
                  onAIOptInChange={onAiOptInChange}
                >
                  <div className="cursor-pointer">
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => {}}
                    />
                  </div>
                </AIPreviewPopout>
              ) : (
                // Show simple checkbox when disabling AI
                <Checkbox
                  checked={true}
                  onCheckedChange={handleAIToggle}
                />
              )}
            </div>
          )}
          {!canEdit && (
            <Badge variant={lead.aiOptIn ? "default" : "outline"}>
              {lead.aiOptIn ? "On" : "Off"}
            </Badge>
          )}
          {/* Show next message schedule if AI is enabled */}
          {lead.aiOptIn && lead.nextAiSendAt && (
            <div className="text-xs text-gray-500">
              Next: {new Date(lead.nextAiSendAt).toLocaleDateString()} {new Date(lead.nextAiSendAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </TableCell>

      <TableCell>
        <DoNotContactControls
          lead={lead}
          onDoNotContactChange={onDoNotContactChange}
          canEdit={canEdit}
          size="sm"
        />
      </TableCell>

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
            <Calendar className="h-4 w-4" />
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
