
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Car, Calendar, Building, UserX } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import UnifiedAIControls from "../UnifiedAIControls";
import MarkLostConfirmDialog from "../../MarkLostConfirmDialog";
import { markLeadAsLost } from "@/services/leadStatusService";
import type { LeadDetailData } from "@/services/leadDetailService";

interface LeadDetailSidebarProps {
  lead: LeadDetailData;
  onAIOptInChange: (enabled: boolean) => Promise<void>;
  onMessageSent: () => void;
}

const LeadDetailSidebar: React.FC<LeadDetailSidebarProps> = ({
  lead,
  onAIOptInChange,
  onMessageSent
}) => {
  const [showMarkLostDialog, setShowMarkLostDialog] = useState(false);
  const [isMarkingLost, setIsMarkingLost] = useState(false);

  const handleMarkAsLost = async () => {
    setIsMarkingLost(true);
    try {
      const result = await markLeadAsLost(lead.id);
      
      if (result.success) {
        toast({
          title: "Lead marked as lost",
          description: `${lead.firstName} ${lead.lastName} has been marked as lost and removed from all automation.`,
        });
        
        // Refresh the page or navigate back after successful marking
        window.location.reload();
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

  return (
    <>
      <div className="w-80 space-y-4">
        {/* Lead Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{lead.primaryPhone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
              {(lead.city || lead.state) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm mb-2">
                <Car className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Vehicle Interest</span>
              </div>
              <Badge variant="outline">{lead.vehicleInterest}</Badge>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm mb-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Source</span>
              </div>
              <Badge variant="secondary">{lead.source}</Badge>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Created</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(lead.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Unified AI Controls */}
        <UnifiedAIControls
          leadId={lead.id}
          leadName={`${lead.firstName} ${lead.lastName}`}
          aiOptIn={lead.aiOptIn || false}
          messageIntensity={lead.messageIntensity}
          aiMessagesSent={lead.aiMessagesSent}
          aiSequencePaused={lead.aiSequencePaused}
          aiPauseReason={lead.aiPauseReason}
          pendingHumanResponse={lead.pendingHumanResponse}
          onUpdate={onMessageSent}
        />

        {/* Mark Lost Action */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Lead Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowMarkLostDialog(true)}
              disabled={isMarkingLost || lead.status === 'lost'}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <UserX className="w-4 h-4 mr-2" />
              {isMarkingLost ? 'Marking Lost...' : 'Mark Lost'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <MarkLostConfirmDialog
        open={showMarkLostDialog}
        onOpenChange={setShowMarkLostDialog}
        onConfirm={handleMarkAsLost}
        leadCount={1}
        leadName={`${lead.firstName} ${lead.lastName}`}
      />
    </>
  );
};

export default LeadDetailSidebar;
