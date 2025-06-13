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
  ArrowDown
} from "lucide-react";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";
import { Lead } from "@/types/lead";

interface LeadsTableProps {
  leads: Lead[];
  onAiOptInChange: (leadId: string, value: boolean) => void;
  canEdit: boolean;
  loading: boolean;
  searchTerm: string;
}

type SortField = 'name' | 'status' | 'contactStatus' | 'createdAt' | 'lastMessage';
type SortDirection = 'asc' | 'desc';

const LeadsTable = ({ leads, onAiOptInChange, canEdit, loading, searchTerm }: LeadsTableProps) => {
  const navigate = useNavigate();
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
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
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(leads.map(lead => lead.id.toString()));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const handleMessageClick = (lead: Lead) => {
    navigate(`/inbox?leadId=${lead.id}`);
  };

  const handleLeadClick = (leadId: number) => {
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  if (loading) {
    return <div className="text-center py-8">Loading leads...</div>;
  }

  return (
    <div className="space-y-4">
      {selectedLeads.length > 0 && (
        <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedLeads.length} lead(s) selected
          </span>
          <Button size="sm" variant="outline">
            Bulk Actions
          </Button>
        </div>
      )}

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
              <TableRow key={lead.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedLeads.includes(lead.id.toString())}
                    onCheckedChange={(checked) => handleSelectLead(lead.id.toString(), checked as boolean)}
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
                  <Badge className={getStatusBadge(lead.status)}>
                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <Badge className={getContactStatusBadge(lead.contactStatus)}>
                      {formatContactStatus(lead.contactStatus)}
                    </Badge>
                    {lead.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {lead.unreadCount} unread
                      </Badge>
                    )}
                  </div>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleMessageClick(lead)}
                        disabled={lead.doNotCall}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={!canEdit}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Lead
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
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
