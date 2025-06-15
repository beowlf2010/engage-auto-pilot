import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Eye,
  MessageSquare,
  Edit,
  MoreHorizontal,
  Phone,
  Mail,
  Star,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";
import { Lead } from "@/types/lead";
import LeadStatusBadge from "./LeadStatusBadge";
import LeadContactStatusBadge from "./LeadContactStatusBadge";
import LeadEngagementScore from "./LeadEngagementScore";
import LeadActionsDropdown from "./LeadActionsDropdown";

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

const LeadTableRow: React.FC<LeadTableRowProps> = ({
  lead,
  selected,
  onSelect,
  onAiOptInChange,
  canEdit,
  onQuickView,
  handleMessageClick,
  handleLeadClick,
  getEngagementScore,
}) => {
  const getStatusBadge = (status: string) => {
    const statusColors = {
      'new': 'bg-blue-100 text-blue-800',
      'engaged': 'bg-green-100 text-green-800',
      'paused': 'bg-yellow-100 text-yellow-800',
      'closed': 'bg-gray-100 text-gray-800',
      'lost': 'bg-red-100 text-red-800'
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const getContactStatusBadge = (contactStatus: string) => {
    const contactColors = {
      'no_contact': 'bg-gray-100 text-gray-800',
      'contact_attempted': 'bg-yellow-100 text-yellow-800',
      'response_received': 'bg-green-100 text-green-800'
    };
    return contactColors[contactStatus as keyof typeof contactColors] || 'bg-gray-100 text-gray-800';
  };

  const formatContactStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const engagementScore = getEngagementScore(lead);

  return (
    <TableRow key={lead.id}>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(lead.id.toString())}
        />
      </TableCell>
      <TableCell className="font-medium">
        <div
          className="cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => handleLeadClick(lead.id)}
        >
          <div className="font-medium">{lead.firstName} {lead.lastName}</div>
          {lead.middleName && (
            <div className="text-xs text-muted-foreground">{lead.middleName}</div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {lead.primaryPhone ? formatPhoneForDisplay(lead.primaryPhone) : 'No phone'}
          </span>
          {lead.phoneNumbers?.length > 1 && (
            <Badge variant="secondary" className="text-xs">
              +{lead.phoneNumbers.length - 1}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {lead.email ? (
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm truncate max-w-[200px]">{lead.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">No email</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm">{lead.vehicleInterest || 'Not specified'}</span>
      </TableCell>
      <TableCell>
        <LeadStatusBadge status={lead.status} />
      </TableCell>
      <TableCell>
        <div className="flex flex-col space-y-1">
          <LeadContactStatusBadge contactStatus={lead.contactStatus} />
          {lead.unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {lead.unreadCount} unread
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <LeadEngagementScore score={engagementScore} />
      </TableCell>
      <TableCell>
        <Switch
          checked={lead.aiOptIn}
          onCheckedChange={(value) => onAiOptInChange(lead.id.toString(), value)}
          disabled={!canEdit || lead.doNotCall}
        />
      </TableCell>
      <TableCell>
        <div className="text-xs text-muted-foreground">
          {lead.lastMessageTime || 'Never'}
        </div>
      </TableCell>
      <TableCell>
        <LeadActionsDropdown
          lead={lead}
          canEdit={canEdit}
          onQuickView={onQuickView}
          handleMessageClick={handleMessageClick}
        />
      </TableCell>
    </TableRow>
  );
};

export default LeadTableRow;
