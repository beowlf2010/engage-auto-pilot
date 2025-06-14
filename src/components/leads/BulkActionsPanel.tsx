
import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  UserCheck, 
  UserX, 
  Trash2, 
  X,
  Mail
} from "lucide-react";
import BulkEmailAction from "./BulkEmailAction";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  status: string;
  vehicle_interest?: string;
}

interface BulkActionsPanelProps {
  selectedLeads: Lead[];
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: string) => void;
  onBulkDelete: () => void;
  onBulkMessage: () => void;
}

const BulkActionsPanel = ({
  selectedLeads,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkDelete,
  onBulkMessage,
}: BulkActionsPanelProps) => {
  if (selectedLeads.length === 0) return null;

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {selectedLeads.length} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onBulkMessage}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send SMS
            </Button>
            
            <BulkEmailAction
              selectedLeads={selectedLeads}
              onComplete={onClearSelection}
            />
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onBulkStatusUpdate("qualified")}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Mark Qualified
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onBulkStatusUpdate("unqualified")}
            >
              <UserX className="w-4 h-4 mr-2" />
              Mark Unqualified
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBulkDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsPanel;
