
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Mail, User, Calendar, MapPin, Car, UserX, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import EmailComposer from "../../email/EmailComposer";
import QuickControlsCard from "./QuickControlsCard";
import MarkLostConfirmDialog from "../MarkLostConfirmDialog";
import MarkSoldConfirmDialog from "../MarkSoldConfirmDialog";
import { markLeadAsLost, markLeadAsSold } from "@/services/leadStatusService";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  status: string;
  vehicle_interest?: string;
  city?: string;
  state?: string;
  created_at: string;
  aiOptIn?: boolean;
}

interface LeadDetailHeaderProps {
  lead: Lead;
  onSendMessage?: () => void;
  onAIOptInChange?: (enabled: boolean) => Promise<void>;
  onLeadUpdate?: () => void;
}

const LeadDetailHeader = ({ lead, onSendMessage, onAIOptInChange, onLeadUpdate }: LeadDetailHeaderProps) => {
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showMarkLostDialog, setShowMarkLostDialog] = useState(false);
  const [showMarkSoldDialog, setShowMarkSoldDialog] = useState(false);
  const [isMarkingLost, setIsMarkingLost] = useState(false);
  const [isMarkingSold, setIsMarkingSold] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "contacted":
        return "bg-yellow-100 text-yellow-800";
      case "qualified":
        return "bg-green-100 text-green-800";
      case "lost":
        return "bg-red-100 text-red-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleAIOptInChange = async (enabled: boolean) => {
    if (onAIOptInChange) {
      await onAIOptInChange(enabled);
    }
  };

  const handleMarkAsLost = async () => {
    setIsMarkingLost(true);
    try {
      const result = await markLeadAsLost(lead.id);
      
      if (result.success) {
        toast({
          title: "Lead marked as lost",
          description: `${lead.first_name} ${lead.last_name} has been marked as lost and removed from all automation.`,
        });
        
        if (onLeadUpdate) {
          onLeadUpdate();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark lead as lost",
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

  const handleMarkAsSold = async () => {
    setIsMarkingSold(true);
    try {
      const result = await markLeadAsSold(lead.id);
      
      if (result.success) {
        toast({
          title: "Lead marked as sold",
          description: `${lead.first_name} ${lead.last_name} has been marked as sold and removed from all automation.`,
        });
        
        if (onLeadUpdate) {
          onLeadUpdate();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark lead as sold",
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
      setIsMarkingSold(false);
      setShowMarkSoldDialog(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {lead.first_name} {lead.last_name}
              </h1>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Added {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                </div>
                {lead.city && lead.state && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{lead.city}, {lead.state}</span>
                  </div>
                )}
                {lead.vehicle_interest && (
                  <div className="flex items-center space-x-1">
                    <Car className="w-4 h-4" />
                    <span>{lead.vehicle_interest}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <Badge className={getStatusColor(lead.status)}>
              {lead.status}
            </Badge>
            
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
              
              <Button size="sm" variant="outline" onClick={onSendMessage}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Text
              </Button>

              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowEmailComposer(true)}
                disabled={!lead.email}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>

              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowMarkSoldDialog(true)}
                disabled={isMarkingSold || lead.status === 'closed'}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark Sold
              </Button>

              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowMarkLostDialog(true)}
                disabled={isMarkingLost || lead.status === 'lost'}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <UserX className="w-4 h-4 mr-2" />
                Mark Lost
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Controls for AI and Email */}
        <QuickControlsCard
          leadId={lead.id}
          aiOptIn={lead.aiOptIn || false}
          onAIOptInChange={handleAIOptInChange}
        />
      </div>

      <EmailComposer
        open={showEmailComposer}
        onOpenChange={setShowEmailComposer}
        leadId={lead.id}
        leadEmail={lead.email}
        leadFirstName={lead.first_name}
        leadLastName={lead.last_name}
        vehicleInterest={lead.vehicle_interest}
      />

      <MarkSoldConfirmDialog
        open={showMarkSoldDialog}
        onOpenChange={setShowMarkSoldDialog}
        onConfirm={handleMarkAsSold}
        leadCount={1}
        leadName={`${lead.first_name} ${lead.last_name}`}
      />

      <MarkLostConfirmDialog
        open={showMarkLostDialog}
        onOpenChange={setShowMarkLostDialog}
        onConfirm={handleMarkAsLost}
        leadCount={1}
        leadName={`${lead.first_name} ${lead.last_name}`}
      />
    </>
  );
};

export default LeadDetailHeader;
