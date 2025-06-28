
import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, Edit2, EyeOff, Phone, AlertCircle, Sparkles } from "lucide-react";
import { Lead } from "@/types/lead";
import { formatDistanceToNow } from "date-fns";
import ContactPreferenceToggles from "./ContactPreferenceToggles";
import AISequenceStatus from "./AISequenceStatus";
import QuickAIActions from "./QuickAIActions";

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
  onEditData?: (leadId: string) => void;
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
  onToggleHidden,
  onEditData
}) => {
  const isSelected = selectedLeads.includes(lead.id.toString());
  const engagementScore = getEngagementScore(lead);
  
  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'engaged': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAIOptInChange = (checked: boolean) => {
    onAiOptInChange(lead.id, checked);
  };

  const handleRefresh = () => {
    // Trigger a refresh of the leads data
    window.location.reload();
  };

  return (
    <TableRow className={`hover:bg-gray-50 ${lead.is_hidden ? 'opacity-50' : ''}`}>
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onLeadSelect(lead.id.toString())}
        />
      </TableCell>
      
      <TableCell className="font-medium">
        <div className="flex items-center space-x-2">
          <span>{lead.firstName} {lead.lastName}</span>
          {isFresh && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Fresh
            </Badge>
          )}
          {lead.is_hidden && (
            <Badge variant="outline" className="text-xs">
              Hidden
            </Badge>
          )}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{lead.primaryPhone}</span>
        </div>
      </TableCell>
      
      <TableCell className="text-sm text-gray-600">
        {lead.email}
      </TableCell>
      
      <TableCell>
        <Badge className={getStatusColor(lead.status)}>
          {lead.status}
        </Badge>
      </TableCell>
      
      <TableCell className="text-sm">
        {lead.vehicleInterest}
      </TableCell>
      
      <TableCell>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getEngagementColor(engagementScore)}`} />
          <span className="text-xs">{engagementScore}%</span>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center space-x-2">
          <AISequenceStatus 
            lead={lead}
            showQuickActions={true}
          />
          <QuickAIActions
            leadId={lead.id}
            leadName={`${lead.firstName} ${lead.lastName}`}
            aiOptIn={lead.aiOptIn}
            onUpdate={handleRefresh}
          />
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center space-x-2">
          <div className="text-xs">
            <div className="flex space-x-1">
              <span className="text-blue-600">↗{lead.outgoingCount}</span>
              <span className="text-green-600">↙{lead.incomingCount}</span>
            </div>
            {lead.lastMessageTime && (
              <div className="text-gray-500 text-xs">
                {formatDistanceToNow(new Date(lead.lastMessageTime), { addSuffix: true })}
              </div>
            )}
          </div>
          {lead.unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {lead.unreadCount}
            </Badge>
          )}
        </div>
      </TableCell>
      
      <TableCell>
        <ContactPreferenceToggles
          lead={lead}
          onDoNotContactChange={onDoNotContactChange}
          canEdit={canEdit}
        />
      </TableCell>
      
      <TableCell>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickView(lead)}
            className="h-6 w-6 p-0"
          >
            <Eye className="h-3 w-3" />
          </Button>
          
          {onEditData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditData(lead.id)}
              className="h-6 w-6 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
          
          {onToggleHidden && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleHidden(lead.id, !lead.is_hidden)}
              className="h-6 w-6 p-0"
              title={lead.is_hidden ? "Show lead" : "Hide lead"}
            >
              {lead.is_hidden ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default LeadsTableRow;
