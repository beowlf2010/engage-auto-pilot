
import React, { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import BulkEmailAction from "./BulkEmailAction";
import MarkLostConfirmDialog from "./MarkLostConfirmDialog";
import { markMultipleLeadsAsLost } from "@/services/leadStatusService";

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
  onRefresh?: () => void;
}

const BulkActionsPanel = ({
  selectedLeads,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkDelete,
  onBulkMessage,
  onRefresh,
}: BulkActionsPanelProps) => {
  const [showMarkLostDialog, setShowMarkLostDialog] = useState(false);
  const [isMarkingLost, setIsMarkingLost] = useState(false);

  if (selectedLeads.length === 0) return null;

  const handleMarkAsLost = async () => {
    setIsMarkingLost(true);
    try {
      const leadIds = selectedLeads.map(lead => lead.id);
      const result = await markMultipleLeadsAsLost(leadIds);
      
      if (result.success) {
        toast({
          title: "Leads marked as lost",
          description: `${selectedLeads.length} leads have been marked as lost and removed from all automation.`,
        });
        
        onClearSelection();
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark leads as lost",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsMarkingLost(false);
      setShowMarkLostDialog(false);
    }
  };

  return (
    <>
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
                onClick={() => setShowMarkLostDialog(true)}
                disabled={isMarkingLost}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <UserX className="w-4 h-4 mr-2" />
                Mark Lost
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

      <MarkLostConfirmDialog
        open={showMarkLostDialog}
        onOpenChange={setShowMarkLostDialog}
        onConfirm={handleMarkAsLost}
        leadCount={selectedLeads.length}
      />
    </>
  );
};

export default BulkActionsPanel;
