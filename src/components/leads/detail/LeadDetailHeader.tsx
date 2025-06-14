
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Edit } from "lucide-react";
import { LeadDetailData } from '@/services/leadDetailService';

interface LeadDetailHeaderProps {
  lead: LeadDetailData;
  onSendMessageClick: () => void;
}

const LeadDetailHeader = ({ lead, onSendMessageClick }: LeadDetailHeaderProps) => {
  const navigate = useNavigate();

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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => navigate('/leads')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leads
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {lead.firstName} {lead.lastName}
            {lead.middleName && ` ${lead.middleName}`}
          </h1>
          <div className="flex items-center space-x-2 mt-1">
            <Badge className={getStatusBadge(lead.status)}>
              {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
            </Badge>
            <span className="text-sm text-gray-500">
              Created {formatTimestamp(lead.createdAt)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button onClick={onSendMessageClick}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Send Message
        </Button>
        <Button variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Edit Lead
        </Button>
      </div>
    </div>
  );
};

export default LeadDetailHeader;
