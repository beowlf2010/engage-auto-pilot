
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, UserX, AlertCircle } from 'lucide-react';
import { markLeadAsSold, markLeadAsLost } from '@/services/leadStatusService';
import MarkSoldConfirmDialog from '@/components/leads/MarkSoldConfirmDialog';
import MarkLostConfirmDialog from '@/components/leads/MarkLostConfirmDialog';
import { toast } from '@/hooks/use-toast';
import type { LeadDetailData } from '@/services/leadDetailService';

interface LeadStatusActionsProps {
  lead: LeadDetailData;
  onStatusChanged: () => void;
}

const LeadStatusActions: React.FC<LeadStatusActionsProps> = ({
  lead,
  onStatusChanged
}) => {
  const [showSoldDialog, setShowSoldDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMarkAsSold = async () => {
    setIsProcessing(true);
    try {
      const result = await markLeadAsSold(lead.id);
      
      if (result.success) {
        toast({
          title: "Lead Marked as Sold",
          description: "The lead has been successfully marked as sold and AI automation has been disabled.",
        });
        onStatusChanged();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark lead as sold",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error marking lead as sold:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setShowSoldDialog(false);
    }
  };

  const handleMarkAsLost = async () => {
    setIsProcessing(true);
    try {
      const result = await markLeadAsLost(lead.id);
      
      if (result.success) {
        toast({
          title: "Lead Marked as Lost",
          description: "The lead has been successfully marked as lost and AI automation has been disabled.",
        });
        onStatusChanged();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark lead as lost",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error marking lead as lost:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setShowLostDialog(false);
    }
  };

  const isLeadClosed = lead.status === 'closed' || lead.status === 'lost';

  return (
    <>
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Lead Status Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLeadClosed ? (
            <div className="text-center py-4">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {lead.status === 'closed' ? 'SOLD' : 'LOST'}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">
                This lead has been marked as {lead.status === 'closed' ? 'sold' : 'lost'}
              </p>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-3">
                Mark this lead's final status to disable AI automation and update records.
              </div>
              
              <div className="space-y-2">
                <Button
                  onClick={() => setShowSoldDialog(true)}
                  disabled={isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Sold
                </Button>
                
                <Button
                  onClick={() => setShowLostDialog(true)}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Mark as Lost
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 mt-3">
                <strong>Note:</strong> This will disable all AI automation and stop messaging sequences.
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <MarkSoldConfirmDialog
        open={showSoldDialog}
        onOpenChange={setShowSoldDialog}
        onConfirm={handleMarkAsSold}
        leadCount={1}
        leadName={`${lead.firstName} ${lead.lastName}`}
      />

      <MarkLostConfirmDialog
        open={showLostDialog}
        onOpenChange={setShowLostDialog}
        onConfirm={handleMarkAsLost}
        leadCount={1}
        leadName={`${lead.firstName} ${lead.lastName}`}
      />
    </>
  );
};

export default LeadStatusActions;
