
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LeadDetailPageHeaderProps {
  onSendMessage: () => void;
}

const LeadDetailPageHeader: React.FC<LeadDetailPageHeaderProps> = ({
  onSendMessage
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/leads")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leads
            </Button>
          </div>
          <Button
            onClick={onSendMessage}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailPageHeader;
