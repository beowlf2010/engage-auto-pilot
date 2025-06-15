import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MessageSquare, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Star,
  TrendingUp
} from "lucide-react";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";
import { Lead } from "@/types/lead";
import LeadTableRow from "./leads/LeadTableRow";

interface LeadsTableProps {
  leads: Lead[];
  onAiOptInChange: (leadId: string, value: boolean) => void;
  canEdit: boolean;
  loading: boolean;
  searchTerm: string;
  selectedLeads: string[];
  onLeadSelect: (leadId: string) => void;
  onQuickView: (lead: Lead) => void;
  getEngagementScore: (lead: Lead) => number;
}

type SortField = 'name' | 'status' | 'contactStatus' | 'createdAt' | 'lastMessage' | 'engagementScore';
type SortDirection = 'asc' | 'desc';

const LeadsTable = ({ 
  leads, 
  onAiOptInChange, 
  canEdit, 
  loading, 
  searchTerm,
  selectedLeads,
  onLeadSelect,
  onQuickView,
  getEngagementScore
}: LeadsTableProps) => {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'contactStatus':
        aValue = a.contactStatus;
        bValue = b.contactStatus;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;
      case 'lastMessage':
        aValue = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
        bValue = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
        break;
      case 'engagementScore':
        aValue = getEngagementScore(a);
        bValue = getEngagementScore(b);
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      leads.forEach(lead => {
        if (!selectedLeads.includes(lead.id.toString())) {
          onLeadSelect(lead.id.toString());
        }
      });
    } else {
      leads.forEach(lead => {
        if (selectedLeads.includes(lead.id.toString())) {
          onLeadSelect(lead.id.toString());
        }
      });
    }
  };

  const handleMessageClick = (lead: Lead) => {
    navigate(`/inbox?leadId=${lead.id}`);
  };

  const handleLeadClick = (leadId: string) => {
    navigate(`/lead/${leadId}`);
  };

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  if (loading) {
    return <div className="text-center py-8">Loading leads...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedLeads.length === leads.length && leads.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-medium"
                >
                  Name <SortIcon field="name" />
                </Button>
              </TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vehicle Interest</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('status')}
                  className="h-auto p-0 font-medium"
                >
                  Status <SortIcon field="status" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('contactStatus')}
                  className="h-auto p-0 font-medium"
                >
                  Contact <SortIcon field="contactStatus" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('engagementScore')}
                  className="h-auto p-0 font-medium"
                >
                  Score <SortIcon field="engagementScore" />
                </Button>
              </TableHead>
              <TableHead>Finn AI</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('lastMessage')}
                  className="h-auto p-0 font-medium"
                >
                  Last Contact <SortIcon field="lastMessage" />
                </Button>
              </TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLeads.map((lead) => (
              <LeadTableRow
                key={lead.id}
                lead={lead}
                selected={selectedLeads.includes(lead.id.toString())}
                onSelect={onLeadSelect}
                onAiOptInChange={onAiOptInChange}
                canEdit={canEdit}
                onQuickView={onQuickView}
                handleMessageClick={handleMessageClick}
                handleLeadClick={handleLeadClick}
                getEngagementScore={getEngagementScore}
              />
            ))}
          </TableBody>
        </Table>

        {sortedLeads.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? `No leads found matching "${searchTerm}"` : 'No leads found'}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsTable;
