
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { useConversationData } from "@/hooks/useConversationData";
import { useEnhancedAIScheduler } from "@/hooks/useEnhancedAIScheduler";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { toggleFinnAI } from '@/services/finnAIService';
import ConsolidatedInfoCard from "./ConsolidatedInfoCard";
import CompactAIControls from "./CompactAIControls";
import type { Lead } from "@/types/lead";
import type { LeadDetailData } from "@/services/leadDetailService";

interface StreamlinedLeadDetailProps {
  lead: LeadDetailData;
  transformedLead: Lead;
  messageThreadLead: any;
  phoneNumbers: any[];
  primaryPhone: string;
  showMessageComposer: boolean;
  setShowMessageComposer: (show: boolean) => void;
  onPhoneSelect: (phone: any) => void;
}

const StreamlinedLeadDetail: React.FC<StreamlinedLeadDetailProps> = ({
  lead,
  transformedLead,
  messageThreadLead,
  phoneNumbers,
  primaryPhone,
  showMessageComposer,
  setShowMessageComposer,
  onPhoneSelect
}) => {
  const navigate = useNavigate();
  const { messages, messagesLoading, loadMessages, sendMessage } = useConversationData();
  const { processing: aiProcessing } = useEnhancedAIScheduler();
  const [aiLoading, setAiLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Load messages when component mounts or lead changes
  useEffect(() => {
    if (lead.id) {
      loadMessages(lead.id);
    }
  }, [lead.id, loadMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage(lead.id, newMessage);
      setNewMessage("");
      await loadMessages(lead.id);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAIOptInChange = async (enabled: boolean): Promise<void> => {
    if (aiLoading) return;

    setAiLoading(true);
    try {
      const result = await toggleFinnAI(lead.id, !enabled);
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to update AI settings",
          variant: "destructive"
        });
        return;
      }

      window.location.reload();
      
    } catch (error) {
      console.error("AI toggle error:", error);
      toast({
        title: "Error",
        description: "Failed to update AI settings",
        variant: "destructive"
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAITakeoverChange = async (enabled: boolean, delayMinutes: number): Promise<void> => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_takeover_enabled: enabled,
          ai_takeover_delay_minutes: delayMinutes
        })
        .eq('id', lead.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update AI takeover settings",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `AI takeover ${enabled ? 'enabled' : 'disabled'}`,
        variant: "default"
      });
    } catch (error) {
      console.error("Failed to update AI takeover:", error);
      toast({
        title: "Error",
        description: "Failed to update AI takeover settings",
        variant: "destructive"
      });
    }
  };

  // Use the messages from the conversation hook if available, otherwise use lead conversations
  const conversationMessages = messages.length > 0 ? messages : lead.conversations;

  return (
    <div className="h-[calc(100vh-8rem)] flex space-x-6">
      {/* Main Chat Area - matches inbox layout */}
      <div className="flex-1 min-w-0 flex flex-col space-y-4">
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

        {/* Chat Container - matches inbox style */}
        <Card className="flex-1 flex flex-col min-h-0">
          {/* Chat Header */}
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {lead.firstName} {lead.lastName}
                </h1>
                <p className="text-sm text-gray-500">{primaryPhone}</p>
              </div>
              {lead.unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {lead.unreadCount} unread
                </Badge>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading messages...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {conversationMessages.map((message: any, index: number) => (
                  <div
                    key={message.id || index}
                    className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.direction === 'out'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="text-sm">{message.body}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {new Date(message.createdAt || message.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isSending || !newMessage.trim()}
                className="px-4 py-2"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Sidebar - matches inbox layout */}
      <div className="w-80 flex-shrink-0 space-y-4">
        <ConsolidatedInfoCard lead={lead} />
        <CompactAIControls
          leadId={lead.id}
          aiOptIn={lead.aiOptIn || false}
          aiStage={lead.aiStage}
          aiSequencePaused={lead.aiSequencePaused || false}
          aiTakeoverEnabled={lead.aiTakeoverEnabled || false}
          aiTakeoverDelayMinutes={lead.aiTakeoverDelayMinutes || 7}
          pendingHumanResponse={lead.pendingHumanResponse || false}
          nextAiSendAt={lead.nextAiSendAt}
          onAIOptInChange={handleAIOptInChange}
          onAITakeoverChange={handleAITakeoverChange}
        />
      </div>
    </div>
  );
};

export default StreamlinedLeadDetail;
