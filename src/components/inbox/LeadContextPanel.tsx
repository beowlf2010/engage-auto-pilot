
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  StickyNote,
  TrendingUp,
  Brain,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppointmentsList from '../appointments/AppointmentsList';
import MarkLostConfirmDialog from '../leads/MarkLostConfirmDialog';
import LeadNotesTab from './LeadNotesTab';
import LeadOverviewTab from './LeadOverviewTab';
import IntelligentAIPanel from './IntelligentAIPanel';
import { markLeadAsLost } from '@/services/leadStatusService';
import { supabase } from '@/integrations/supabase/client';

interface LeadContextPanelProps {
  conversation: any;
  messages: any[]; // Add messages prop
  onSendMessage: (message: string) => Promise<void>; // Add onSendMessage prop
  onScheduleAppointment?: () => void;
}

const LeadContextPanel = ({ 
  conversation, 
  messages = [], // Default to empty array
  onSendMessage, // Accept the send message function
  onScheduleAppointment 
}: LeadContextPanelProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showMarkLostDialog, setShowMarkLostDialog] = useState(false);
  const [isMarkingLost, setIsMarkingLost] = useState(false);
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

      if (error) {
        throw error;
      }

      toast({
        title: "Weekly follow-up enabled",
        description: `${conversation.leadName} has been set to receive gentle weekly follow-ups based on conversation history.`,
      });
      
      window.location.reload();
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

  const handleSendAIMessage = async (message: string) => {
    try {
      console.log('🤖 [LEAD CONTEXT] Sending AI message via parent:', message);
      await onSendMessage(message);
      
      toast({
        title: "AI Message Sent",
        description: "Finn's response has been sent successfully",
      });
    } catch (error) {
      console.error('❌ [LEAD CONTEXT] Failed to send AI message:', error);
      toast({
        title: "Error",
        description: "Failed to send AI message",
        variant: "destructive"
      });
    }
  };

  if (!conversation) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 text-center">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No conversation selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-blue-600" />
            <span>Lead Details</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 h-[calc(100%-5rem)] overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mx-4">
              <TabsTrigger value="overview" title="Overview">
                <User className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="notes" title="Notes">
                <StickyNote className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="appointments" title="Appointments">
                <Calendar className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="activity" title="Activity">
                <TrendingUp className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="ai" title="AI">
                <Brain className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <TabsContent value="overview" className="mt-4">
                <LeadOverviewTab
                  conversation={conversation}
                  onScheduleAppointment={onScheduleAppointment}
                  onMarkAsLost={() => setShowMarkLostDialog(true)}
                  onSlowerFollowup={handleSlowerFollowup}
                  isMarkingLost={isMarkingLost}
                  isSettingSlowerFollowup={isSettingSlowerFollowup}
                />
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                {conversation.leadId ? (
                  <LeadNotesTab 
                    leadId={conversation.leadId} 
                    leadName={conversation.leadName || 'Lead'}
                  />
                ) : (
                  <div className="text-center py-8">
                    <StickyNote className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No lead selected</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="appointments" className="mt-4">
                <AppointmentsList
                  leadId={conversation.leadId}
                  onScheduleNew={onScheduleAppointment}
                  maxHeight="500px"
                />
              </TabsContent>

              <TabsContent value="activity" className="mt-4 space-y-4">
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Activity tracking coming soon</p>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="mt-4 space-y-4">
                <IntelligentAIPanel
                  conversation={conversation}
                  messages={messages} // Pass actual messages from parent
                  onSendMessage={handleSendAIMessage} // Connect to parent's send function
                  canReply={true}
                  isCollapsed={false}
                />
              </TabsContent>
            </div>
          </Tabs>
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

export default LeadContextPanel;
