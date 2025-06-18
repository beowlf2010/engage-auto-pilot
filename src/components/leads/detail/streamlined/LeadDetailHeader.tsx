
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { LeadDetailData } from "@/services/leadDetailService";

interface LeadDetailHeaderProps {
  lead: LeadDetailData;
  primaryPhone: string;
  unreadCount?: number;
  aiProcessing?: boolean;
}

const LeadDetailHeader: React.FC<LeadDetailHeaderProps> = ({
  lead,
  primaryPhone,
  unreadCount = 0,
  aiProcessing = false
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <button 
            onClick={() => navigate('/dashboard')}
            className="hover:text-blue-600 transition-colors"
          >
            Dashboard
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

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/leads')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads</span>
        </Button>
      </div>

      {/* AI Processing Indicator */}
      {aiProcessing && (
        <div className="bg-purple-100 text-purple-800 px-3 py-2 rounded-lg text-sm flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Finn is analyzing...</span>
        </div>
      )}
    </>
  );
};

export default LeadDetailHeader;
