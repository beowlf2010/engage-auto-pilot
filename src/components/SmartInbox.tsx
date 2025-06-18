import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import ConversationsList from "./inbox/ConversationsList";
import EnhancedChatView from "./inbox/EnhancedChatView";
import ConversationMemory from "./ConversationMemory";
import { useRealtimeInbox } from "@/hooks/useRealtimeInbox";
import { useEnhancedAIScheduler } from "@/hooks/useEnhancedAIScheduler";
import { assignCurrentUserToLead } from "@/services/conversationsService";
import { toast } from "@/hooks/use-toast";

interface SmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const SmartInbox = ({ user }: SmartInboxProps) => {
  const [searchParams] = useSearchParams();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { conversations, messages, loading, fetchMessages, sendMessage, refetch, error } = useRealtimeInbox();
  const { processing: aiProcessing } = useEnhancedAIScheduler();

  // Filter conversations based on user role
  const filteredConversations = conversations.filter(conv => 
    user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id || !conv.salespersonId
  );

  const selectedConversation = filteredConversations.find(conv => conv.leadId === selectedLead);

  const canReply = useCallback((conv: any) => {
    // Managers and admins can reply to any conversation
    if (user.role === "manager" || user.role === "admin") return true;
    
    // Sales users can reply to their own leads or unassigned leads
    return conv.salespersonId === user.id || !conv.salespersonId;
  }, [user.role, user.id]);

  const handleSelectConversation = useCallback(async (leadId: string) => {
    try {
      console.log('📱 Selecting conversation for lead:', leadId);
      setSelectedLead(leadId);
      
      // Load messages (which will also mark them as read)
      await fetchMessages(leadId);
      
      console.log('✅ Conversation selected and messages loaded');
    } catch (err) {
      console.error('Error selecting conversation:', err);
      toast({
        title: "Error",
        description: "Failed to load messages for this conversation.",
        variant: "destructive"
      });
    }
  }, [fetchMessages]);

  const handleSendMessage = useCallback(async (message: string, isTemplate?: boolean) => {
    if (selectedLead && selectedConversation) {
      try {
        // Auto-assign lead if it's unassigned and user can reply
        if (!selectedConversation.salespersonId && canReply(selectedConversation)) {
          console.log(`🎯 Auto-assigning lead ${selectedLead} to user ${user.id}`);
          
          const assigned = await assignCurrentUserToLead(selectedLead, user.id);
          if (assigned) {
            toast({
              title: "Lead Assigned",
              description: "This lead has been assigned to you",
            });
            
            // Update the conversation object locally
            selectedConversation.salespersonId = user.id;
          }
        }
        
        await sendMessage(selectedLead, message);
        
        if (isTemplate) {
          setShowTemplates(false);
        }
        
        // Immediately refresh messages for the current conversation to show the new message
        setTimeout(async () => {
          await fetchMessages(selectedLead);
          // Also refresh conversations list to update last message and clear unread badges
          refetch();
        }, 500);
        
      } catch (err) {
        console.error('Error sending message:', err);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [selectedLead, selectedConversation, canReply, sendMessage, user.id, fetchMessages, refetch]);

  const handleToggleMemory = useCallback(() => {
    setShowMemory(prev => !prev);
  }, []);

  const handleToggleTemplates = useCallback(() => {
    setShowTemplates(prev => !prev);
  }, []);

  // Handle pre-selection from URL parameter - only run once after conversations load
  useEffect(() => {
    if (loading || isInitialized || filteredConversations.length === 0) return;

    const leadIdFromUrl = searchParams.get('leadId');
    console.log('🔗 URL leadId:', leadIdFromUrl);
    console.log('📊 Available conversations:', filteredConversations.length);

    if (leadIdFromUrl) {
      // Check if the lead exists in conversations
      const conversation = filteredConversations.find(conv => conv.leadId === leadIdFromUrl);
      if (conversation) {
        console.log('✅ Found conversation for URL leadId, selecting...');
        handleSelectConversation(leadIdFromUrl);
        setIsInitialized(true);
        return;
      } else {
        console.log('❌ Lead from URL not found in conversations');
      }
    }

    // Default selection if no URL parameter or conversation not found
    if (filteredConversations.length > 0 && !selectedLead) {
      const firstConv = filteredConversations[0];
      console.log('📌 Selecting first conversation:', firstConv.leadId);
      handleSelectConversation(firstConv.leadId);
    }
    
    setIsInitialized(true);
  }, [loading, isInitialized, filteredConversations, searchParams, selectedLead, handleSelectConversation]);

  // Show error state
  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mb-4">
            {error}
          </AlertDescription>
          <Button onClick={refetch} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no conversations
  if (filteredConversations.length === 0) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No conversations found</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex space-x-6">
      <div className="relative">
        <ConversationsList
          conversations={filteredConversations}
          selectedLead={selectedLead}
          onSelectConversation={handleSelectConversation}
          canReply={canReply}
        />
        
        {aiProcessing && (
          <div className="absolute top-2 right-2 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs flex items-center space-x-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Finn is working...</span>
          </div>
        )}
      </div>

      <EnhancedChatView
        selectedConversation={selectedConversation}
        messages={messages}
        onSendMessage={handleSendMessage}
        showTemplates={showTemplates}
        onToggleTemplates={handleToggleTemplates}
        user={user}
      />

      {showMemory && selectedLead && (
        <ConversationMemory leadId={parseInt(selectedLead)} />
      )}
    </div>
  );
};

export default SmartInbox;
