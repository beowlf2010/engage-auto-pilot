
import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import LeadDetailHeader from "./LeadDetailHeader";

interface LeadDetailPageHeaderProps {
  lead: any;
  onSendMessage?: () => void;
  onAIOptInChange?: (enabled: boolean) => Promise<void>;
}

const LeadDetailPageHeader: React.FC<LeadDetailPageHeaderProps> = ({ 
  lead, 
  onSendMessage,
  onAIOptInChange 
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Leads</span>
          </Button>
        </div>
        
        <LeadDetailHeader 
          lead={lead} 
          onSendMessage={onSendMessage}
          onAIOptInChange={onAIOptInChange}
        />
      </div>
    </div>
  );
};

export default LeadDetailPageHeader;
