
import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, Eye, Calendar } from "lucide-react";
import { Lead } from "@/types/lead";
import LeadStatusBadge from "./LeadStatusBadge";
import LeadContactStatusBadge from "./LeadContactStatusBadge";
import LeadEngagementScore from "./LeadEngagementScore";
import AIStatusBadges from "./AIStatusBadges";

interface LeadTableRowProps {
  lead: Lead;
  selected: boolean;
  onSelect: (leadId: string) => void;
  onAiOptInChange: (leadId: string, value: boolean) => void;
  canEdit: boolean;
  onQuickView: (lead: Lead) => void;
  handleMessageClick: (lead: Lead) => void;
  handleLeadClick: (leadId: string) => void;
  getEngagementScore: (lead: Lead) => number;
}

const LeadTableRow = ({
  lead,
  selected,
  onSelect,
  onAiOptInChange,
  canEdit,
  onQuickView,
  handleMessageClick,
  handleLeadClick,
  getEngagementScore
}: LeadTableRowProps) => {
  return (
    <TableRow 
      className={`hover:bg-gray-50 cursor-pointer ${selected ? 'bg-blue-50' : ''}`}
      onClick={() => handleLeadClick(lead.id)}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(lead.id.toString())}
        />
      </TableCell>
      
      <TableCell className="font-medium">
        <div className="space-y-1">
          <div>{lead.firstName} {lead.lastName}</div>
          <div className="text-xs text-gray-500">{lead.primaryPhone}</div>
          <div className="text-xs text-gray-500">{lead.email}</div>
        </div>
      </TableCell>

      <TableCell>
        <div className="space-y-1">
          <div className="font-medium">{lead.vehicleInterest}</div>
          <div className="text-xs text-gray-500">{lead.source}</div>
        </div>
      </TableCell>

      <TableCell>
        <div className="space-y-1">
          <LeadStatusBadge status={lead.status} />
          <LeadContactStatusBadge status={lead.contactStatus} />
        </div>
      </TableCell>

      <TableCell>
        <div className="text-center">
          <div className="font-medium">{lead.salesperson}</div>
        </div>
      </TableCell>

      <TableCell>
        <LeadEngagementScore score={getEngagementScore(lead)} />
      </TableCell>

      <TableCell>
        <div className="space-y-1">
          <AIStatusBadges 
            aiContactEnabled={lead.aiContactEnabled}
            aiRepliesEnabled={lead.aiRepliesEnabled}
          />
          {canEdit && (
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={lead.aiOptIn}
                onCheckedChange={(value) => onAiOptInChange(lead.id, value)}
                size="sm"
              />
            </div>
          )}
        </div>
      </TableCell>

      <TableCell>
        <div className="text-center">
          <div className="font-medium">{lead.messageCount || 0}</div>
          {lead.unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {lead.unreadCount} new
            </Badge>
          )}
        </div>
      </TableCell>

      <TableCell>
        <div className="text-sm text-gray-600">
          {lead.lastMessage ? (
            <div>
              <div className="truncate max-w-32">{lead.lastMessage}</div>
              <div className="text-xs text-gray-500">{lead.lastMessageTime}</div>
            </div>
          ) : (
            <span className="text-gray-400">No messages</span>
          )}
        </div>
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleMessageClick(lead)}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`tel:${lead.primaryPhone}`)}
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickView(lead)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default LeadTableRow;
