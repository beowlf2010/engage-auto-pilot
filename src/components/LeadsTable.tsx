
import React from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Phone, Calendar, Eye } from "lucide-react";
import { Lead } from "@/types/lead";
import LeadStatusBadge from "./leads/LeadStatusBadge";
import LeadContactStatusBadge from "./leads/LeadContactStatusBadge";
import FreshLeadBadge from "./leads/FreshLeadBadge";

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

  const handleMessageClick = (lead: Lead) => {
    navigate(`/inbox?leadId=${lead.id}`);
  };

  const handleCallClick = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`);
  };

  const handleScheduleClick = (lead: Lead) => {
    // Navigate to appointment scheduling
    navigate(`/appointments/schedule?leadId=${lead.id}`);
  };

  const handleLeadClick = (leadId: string) => {
    navigate(`/lead/${leadId}`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      leads.forEach(lead => onLeadSelect(lead.id.toString()));
    } else {
      selectedLeads.forEach(leadId => onLeadSelect(leadId));
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <div className="text-lg font-medium text-gray-700">Loading leads...</div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <div className="text-lg font-medium text-gray-700 mb-2">
          {searchTerm ? `No leads found matching "${searchTerm}"` : 'No leads found'}
        </div>
        <p className="text-gray-500">
          {searchTerm ? 'Try adjusting your search or filters' : 'Add some leads to get started'}
        </p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
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
            <TableHead>Lead</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Vehicle Interest</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>AI</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const leadDate = new Date(lead.createdAt);
            leadDate.setHours(0, 0, 0, 0);
            const isFresh = leadDate.getTime() === today.getTime();
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
                    {isFresh && <FreshLeadBadge createdAt={lead.createdAt} />}
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
                  {canEdit && (
                    <Checkbox
                      checked={lead.aiOptIn}
                      onCheckedChange={(checked) => onAiOptInChange(lead.id.toString(), !!checked)}
                    />
                  )}
                  {!canEdit && (
                    <Badge variant={lead.aiOptIn ? "default" : "outline"}>
                      {lead.aiOptIn ? "On" : "Off"}
                    </Badge>
                  )}
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
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeadsTable;
