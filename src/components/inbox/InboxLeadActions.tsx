
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UserCheck,
  UserX,
  Check,
  Calendar,
  Phone,
  Mail,
  MessageSquare
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { markLeadAsLost } from '@/services/leadStatusService';
import { supabase } from '@/integrations/supabase/client';
import MarkLostConfirmDialog from '../leads/MarkLostConfirmDialog';

interface InboxLeadActionsProps {
  conversation: any;
  onActionComplete?: () => void;
}

const InboxLeadActions: React.FC<InboxLeadActionsProps> = ({
  conversation,
  onActionComplete
}) => {
  const [showMarkLostDialog, setShowMarkLostDialog] = useState(false);
  const [isMarkingLost, setIsMarkingLost] = useState(false);
  const [isMarkingSold, setIsMarkingSold] = useState(false);
  const [isSettingSlowerFollowup, setIsSettingSlowerFollowup] = useState(false);

  const handleMarkAsLost = async () => {
    if (!conversation?.leadId) return;
    
    setIsMarkingLost(true);
    try {
      const result = await markLeadAsLost(conversation.leadId);
      
      if (result.success) {
        toast({
          title: "Lead marked as lost",
          description: `${conversation.leadName} has been marked as lost and removed from all automation.`,
        });
        
        if (onActionComplete) onActionComplete();
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
    if (!conversation?.leadId) return;
    
    setIsMarkingSold(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: 'closed',
          ai_opt_in: false,
          ai_sequence_paused: true,
          ai_pause_reason: 'lead_sold',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.leadId);

      if (error) throw error;

      toast({
        title: "Lead marked as sold",
        description: `${conversation.leadName} has been marked as sold. Congratulations!`,
      });
      
      if (onActionComplete) onActionComplete();
    } catch (error) {
      console.error('Error marking lead as sold:', error);
      toast({
        title: "Error",
        description: "Failed to mark lead as sold",
        variant: "destructive",
      });
    } finally {
      setIsMarkingSold(false);
    }
  };

  const handleSlowerFollowup = async () => {
    if (!conversation?.leadId) return;
    
    setIsSettingSlowerFollowup(true);
    try {
      const nextSendTime = new Date();
      nextSendTime.setDate(nextSendTime.getDate() + 7);
      
      const { error } = await supabase
        .from('leads')
        .update({
          message_intensity: 'gentle',
          ai_sequence_paused: false,
          ai_pause_reason: null,
          next_ai_send_at: nextSendTime.toISOString(),
          ai_stage: 'gentle_nurture'
        })
        .eq('id', conversation.leadId);

      if (error) throw error;

      toast({
        title: "Weekly follow-up enabled",
        description: `${conversation.leadName} has been set to receive gentle weekly follow-ups.`,
      });
      
      if (onActionComplete) onActionComplete();
    } catch (error) {
      console.error('Error setting slower follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to set up weekly follow-up",
        variant: "destructive",
      });
    } finally {
      setIsSettingSlowerFollowup(false);
    }
  };

  if (!conversation) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select a conversation to view actions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="text-sm font-medium">Lead Actions</span>
            <Badge variant={conversation.status === 'lost' ? 'destructive' : conversation.status === 'closed' ? 'secondary' : 'outline'}>
              {conversation.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Contact Actions */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Quick Contact</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`tel:${conversation.leadPhone}`, '_self')}
                disabled={!conversation.leadPhone}
                className="text-xs"
              >
                <Phone className="w-3 h-3 mr-1" />
                Call
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`mailto:${conversation.leadEmail}`, '_self')}
                disabled={!conversation.leadEmail}
                className="text-xs"
              >
                <Mail className="w-3 h-3 mr-1" />
                Email
              </Button>
            </div>
          </div>

          {/* Lead Status Actions */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Lead Status</h4>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={handleSlowerFollowup}
              disabled={isSettingSlowerFollowup || conversation.status === 'lost' || conversation.status === 'closed'}
              className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
            >
              <UserCheck className="w-3 h-3 mr-2" />
              {isSettingSlowerFollowup ? 'Setting Up...' : 'Weekly Follow-up'}
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={handleMarkAsSold}
              disabled={isMarkingSold || conversation.status === 'closed'}
              className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
            >
              <Check className="w-3 h-3 mr-2" />
              {isMarkingSold ? 'Marking Sold...' : 'Mark Sold'}
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowMarkLostDialog(true)}
              disabled={isMarkingLost || conversation.status === 'lost'}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <UserX className="w-3 h-3 mr-2" />
              {isMarkingLost ? 'Marking Lost...' : 'Mark Lost'}
            </Button>
          </div>

          {/* Lead Info */}
          <div className="pt-2 border-t">
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Vehicle:</span>
                <span className="font-medium text-right text-xs">{conversation.vehicleInterest || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Source:</span>
                <span className="font-medium">{conversation.leadSource || 'Unknown'}</span>
              </div>
              {conversation.unreadCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Unread:</span>
                  <Badge variant="destructive" className="text-xs">
                    {conversation.unreadCount}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <MarkLostConfirmDialog
        open={showMarkLostDialog}
        onOpenChange={setShowMarkLostDialog}
        onConfirm={handleMarkAsLost}
        leadCount={1}
        leadName={conversation.leadName}
      />
    </>
  );
};

export default InboxLeadActions;
