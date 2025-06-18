
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, User, Phone, Mail, ArrowLeft, Home } from "lucide-react";
import LeadStatusBadge from "../LeadStatusBadge";
import type { Lead } from "@/types/lead";

interface StreamlinedLeadHeaderProps {
  lead: Lead;
  onSendMessage: () => void;
}

const StreamlinedLeadHeader: React.FC<StreamlinedLeadHeaderProps> = ({
  lead,
  onSendMessage
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-100 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <span>/</span>
          <button 
            onClick={() => navigate('/leads')}
            className="hover:text-blue-600 transition-colors"
          >
            Leads
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            {lead.firstName} {lead.lastName}
          </span>
        </div>

        <div className="flex items-center justify-between">
          {/* Back Button and Lead Info */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/leads')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Leads</span>
            </Button>
            
            <div className="bg-blue-50 p-3 rounded-xl">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {lead.firstName} {lead.lastName}
              </h1>
              <div className="flex items-center space-x-4 mt-1">
                <LeadStatusBadge status={lead.status} />
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{lead.primaryPhone}</span>
                </div>
                {lead.email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{lead.email}</span>
                  </div>
                )}
                {lead.unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {lead.unreadCount} unread
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button onClick={onSendMessage} size="lg" className="px-6">
            <MessageSquare className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StreamlinedLeadHeader;
