import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import ConversationsList from "./inbox/ConversationsList";
import EnhancedChatView from "./inbox/EnhancedChatView";
import ConversationMemory from "./ConversationMemory";
import { useStableConversationOperations } from "@/hooks/useStableConversationOperations";
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
  
  // Use the stable conversation operations
  const { 
    conversations, 
    messages, 
    loading, 
    error,
    selectedLeadId,
    sendingMessage, // Get the sending state
    loadMessages, 
    sendMessage, 
    manualRefresh,
    setError
  } = useStableConversationOperations();

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
      console.log('📱 [SMART INBOX] Selecting conversation for lead:', leadId);
      setSelectedLead(leadId);
      setError(null); // Clear any previous errors
      
      // Load messages using stable operations
      await loadMessages(leadId);
      
      console.log('✅ [SMART INBOX] Conversation selected and messages loaded');
    } catch (err) {
      console.error('Error selecting conversation:', err);
      toast({
        title: "Error",
        description: "Failed to load messages for this conversation.",
        variant: "destructive"
      });
    }
  }, [loadMessages, setError]);

  const handleSendMessage = useCallback(async (message: string, isTemplate?: boolean) => {
    if (selectedLead && selectedConversation) {
      try {
        console.log('📤 [SMART INBOX] Sending message:', message);
        
        // Prevent multiple sends
        if (sendingMessage) {
          console.log('⏳ [SMART INBOX] Already sending, ignoring request');
          return;
        }
        
        // Auto-assign lead if it's unassigned and user can reply
        if (!selectedConversation.salespersonId && canReply(selectedConversation)) {
          console.log(`🎯 [SMART INBOX] Auto-assigning lead ${selectedLead} to user ${user.id}`);
          
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
        
        // Use stable send message function
        await sendMessage(selectedLead, message);
        
        if (isTemplate) {
          setShowTemplates(false);
        }
        
        toast({
          title: "Message sent",
          description: "Your message has been sent successfully.",
        });
        
        console.log('✅ [SMART INBOX] Message sent successfully');
        
      } catch (err) {
        console.error('❌ [SMART INBOX] Error sending message:', err);
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to send message. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [selectedLead, selectedConversation, canReply, sendMessage, sendingMessage, user.id]);

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
    console.log('🔗 [SMART INBOX] URL leadId:', leadIdFromUrl);
    console.log('📊 [SMART INBOX] Available conversations:', filteredConversations.length);

    if (leadIdFromUrl) {
      const conversation = filteredConversations.find(conv => conv.leadId === leadIdFromUrl);
      if (conversation) {
        console.log('✅ [SMART INBOX] Found conversation for URL leadId, selecting...');
        handleSelectConversation(leadIdFromUrl);
        setIsInitialized(true);
        return;
      } else {
        console.log('❌ [SMART INBOX] Lead from URL not found in conversations');
      }
    }

    // Default selection if no URL parameter or conversation not found
    if (filteredConversations.length > 0 && !selectedLead) {
      const firstConv = filteredConversations[0];
      console.log('📌 [SMART INBOX] Selecting first conversation:', firstConv.leadId);
      handleSelectConversation(firstConv.leadId);
    }
    
    setIsInitialized(true);
  }, [loading, isInitialized, filteredConversations, searchParams, selectedLead, handleSelectConversation]);

  // Show error state with retry option
  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mb-4">
            {error}
          </AlertDescription>
          <Button onClick={manualRefresh} className="w-full">
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
          <Button onClick={manualRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex space-x-4">
      {/* Conversations list with reasonable width */}
      <div className="w-80 flex-shrink-0 relative">
        <ConversationsList
          conversations={filteredConversations}
          selectedLead={selectedLead}
          onSelectConversation={handleSelectConversation}
          canReply={canReply}
        />
      </div>

      {/* Chat area takes remaining width */}
      <div className="flex-1 min-w-0">
        <EnhancedChatView
          selectedConversation={selectedConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          showTemplates={showTemplates}
          onToggleTemplates={handleToggleTemplates}
          user={user}
          isLoading={sendingMessage} // Pass the sending state
        />
      </div>

      {showMemory && selectedLead && (
        <ConversationMemory leadId={parseInt(selectedLead)} />
      )}
    </div>
  );
};

export default SmartInbox;
