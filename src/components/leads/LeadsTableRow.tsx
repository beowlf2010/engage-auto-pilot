
import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, MessageCircle, Phone, Mail, Clock, Star } from "lucide-react";
import { Lead } from "@/types/lead";
import { formatDistanceToNow } from "date-fns";
import HideLeadButton from './HideLeadButton';

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
  onToggleHidden?: (leadId: string, hidden: boolean) => void;
}

const LeadsTableRow: React.FC<LeadsTableRowProps> = ({
  lead,
  selectedLeads,
  onLeadSelect,
  onAiOptInChange,
  onDoNotContactChange,
  canEdit,
  onQuickView,
  getEngagementScore,
  isFresh,
  onToggleHidden
}) => {
  const engagementScore = getEngagementScore(lead);
  const isSelected = selectedLeads.includes(lead.id.toString());
  const hasUnrepliedMessages = lead.unrepliedCount > 0;

  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const getDoNotContactReasons = () => {
    const reasons = [];
    if (lead.doNotCall) reasons.push('Call');
    if (lead.doNotEmail) reasons.push('Email');
    if (lead.doNotMail) reasons.push('Mail');
    return reasons;
  };

  const doNotContactReasons = getDoNotContactReasons();

  return (
    <TableRow 
      className={`hover:bg-gray-50 ${isFresh ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''} ${
        hasUnrepliedMessages ? 'bg-red-50 border-l-4 border-l-red-400' : ''
      } ${lead.is_hidden ? 'opacity-60' : ''}`}
    >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onLeadSelect(lead.id.toString())}
        />
      </TableCell>

      <TableCell>
        <div className="flex items-center space-x-2">
          {isFresh && (
            <Badge variant="default" className="text-xs bg-blue-600">
              Fresh
            </Badge>
          )}
          {hasUnrepliedMessages && (
            <Badge variant="destructive" className="text-xs">
              {lead.unrepliedCount} unreplied
            </Badge>
          )}
          {lead.is_hidden && (
            <Badge variant="outline" className="text-xs text-gray-500">
              Hidden
            </Badge>
          )}
          <div>
            <div className="font-medium">
              {lead.firstName} {lead.lastName}
            </div>
            <div className="text-sm text-gray-500">
              {lead.primaryPhone}
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="text-sm">
          <div>{lead.email}</div>
          {lead.city && lead.state && (
            <div className="text-gray-500">{lead.city}, {lead.state}</div>
          )}
        </div>
      </TableCell>

      <TableCell className="max-w-xs">
        <div className="truncate text-sm" title={lead.vehicleInterest}>
          {lead.vehicleInterest}
        </div>
      </TableCell>

      <TableCell>
        <Badge variant="outline" className="text-xs">
          {lead.source}
        </Badge>
      </TableCell>

      <TableCell>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <MessageCircle className="h-4 w-4 text-blue-500" />
            <span className="text-sm">{lead.incomingCount}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MessageCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">{lead.outgoingCount}</span>
          </div>
        </div>
      </TableCell>

      <TableCell>
        {lead.lastMessageTime && (
          <div className="text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatTimeAgo(lead.lastMessageTime)}</span>
            </div>
            <div className={`text-xs ${
              lead.lastMessageDirection === 'in' ? 'text-blue-600' : 'text-green-600'
            }`}>
              {lead.lastMessageDirection === 'in' ? '← From customer' : '→ To customer'}
            </div>
          </div>
        )}
      </TableCell>

      <TableCell>
        <div className={`text-xs px-2 py-1 rounded ${getEngagementColor(engagementScore)}`}>
          {engagementScore}%
        </div>
      </TableCell>

      <TableCell>
        <Badge 
          variant={lead.status === 'new' ? 'default' : 
                   lead.status === 'engaged' ? 'secondary' : 
                   lead.status === 'paused' ? 'outline' : 'destructive'}
          className="text-xs"
        >
          {lead.status}
        </Badge>
      </TableCell>

      <TableCell>
        {canEdit && (
          <Switch
            checked={lead.aiOptIn}
            onCheckedChange={(checked) => onAiOptInChange(lead.id.toString(), checked)}
            className="data-[state=checked]:bg-green-600"
          />
        )}
      </TableCell>

      <TableCell>
        {doNotContactReasons.length > 0 ? (
          <Badge variant="outline" className="text-xs text-red-600 border-red-200">
            DNC: {doNotContactReasons.join(', ')}
          </Badge>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </TableCell>

      <TableCell>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickView(lead)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {onToggleHidden && (
            <HideLeadButton
              leadId={lead.id}
              isHidden={lead.is_hidden || false}
              onToggleHidden={onToggleHidden}
            />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default LeadsTableRow;
