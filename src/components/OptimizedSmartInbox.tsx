
import React, { useState } from "react";
import { useEnhancedPredictiveInbox } from "@/hooks/useEnhancedPredictiveInbox";
import { useUnifiedAIScheduler } from "@/hooks/useUnifiedAIScheduler";
import { useLeads } from "@/hooks/useLeads";
import { useEnhancedMessageWrapper } from "./inbox/EnhancedMessageWrapper";
import { useMarkAsRead } from "@/hooks/inbox/useMarkAsRead";
import InboxStateManager from "./inbox/InboxStateManager";
import InboxStatusDisplay from "./inbox/InboxStatusDisplay";
import OptimizedInboxLayout from "./inbox/OptimizedInboxLayout";
import ConnectionStatusIndicator from "./inbox/ConnectionStatusIndicator";
import MessageDebugPanel from "./debug/MessageDebugPanel";
import PredictiveInsightsPanel from "./inbox/PredictiveInsightsPanel";

interface OptimizedSmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const OptimizedSmartInbox = ({ user }: OptimizedSmartInboxProps) => {
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [predictiveInsightsOpen, setPredictiveInsightsOpen] = useState(false);
  
  // Use the unified AI scheduler
  useUnifiedAIScheduler();

  // Get leads refresh function
  const { forceRefresh: refreshLeads } = useLeads();

  // Use the enhanced predictive inbox hook
  const { 
    conversations, 
    messages, 
    loading, 
    messagesLoading,
    error,
    sendingMessage,
    totalConversations,
    predictions,
    searchQuery,
    searchResults,
    loadMessages, 
    sendMessage, 
    manualRefresh,
    searchConversations,
    getPredictionInsights,
    setError
  } = useEnhancedPredictiveInbox({
    onLeadsRefresh: refreshLeads,
    enablePredictiveLoading: true
  });

  // Mark as read functionality
  const { markAsRead, markingAsRead } = useMarkAsRead(manualRefresh);

  // Enhanced send message function
  const { sendEnhancedMessageWrapper } = useEnhancedMessageWrapper({
    onMessageSent: async () => {
      console.log('Enhanced message sent callback triggered');
    },
    onLeadsRefresh: refreshLeads
  });

  // Filter conversations based on user role
  const filteredConversations = conversations.filter(conv => 
    user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id || !conv.salespersonId
  );

  console.log('🔄 [OPTIMIZED SMART INBOX] Render state:', {
    loading,
    conversationsCount: filteredConversations.length,
    totalConversations,
    predictionsCount: predictions.length,
    hasError: !!error
  });

  // Check if we should show status displays
  const shouldShowStatus = error || (loading && filteredConversations.length === 0);

  if (shouldShowStatus) {
    return (
      <>
        <InboxStatusDisplay
          loading={loading}
          error={error}
          conversationsCount={filteredConversations.length}
          onRetry={manualRefresh}
        />
        <MessageDebugPanel
          isOpen={debugPanelOpen}
          onToggle={() => setDebugPanelOpen(!debugPanelOpen)}
        />
      </>
    );
  }

  return (
    <InboxStateManager>
      {(stateProps) => (
        <OptimizedInboxMain
          user={user}
          conversations={filteredConversations}
          messages={messages}
          sendingMessage={sendingMessage}
          loading={loading}
          messagesLoading={messagesLoading}
          totalConversations={totalConversations}
          predictions={predictions}
          searchQuery={searchQuery}
          searchResults={searchResults}
          loadMessages={loadMessages}
          sendMessage={sendMessage}
          setError={setError}
          debugPanelOpen={debugPanelOpen}
          setDebugPanelOpen={setDebugPanelOpen}
          predictiveInsightsOpen={predictiveInsightsOpen}
          setPredictiveInsightsOpen={setPredictiveInsightsOpen}
          markAsRead={markAsRead}
          markingAsRead={markingAsRead}
          searchConversations={searchConversations}
          getPredictionInsights={getPredictionInsights}
          getLeadIdFromUrl={() => {
            const searchParams = new URLSearchParams(window.location.search);
            return searchParams.get('leadId');
          }}
          {...stateProps}
        />
      )}
    </InboxStateManager>
  );
};

const OptimizedInboxMain = ({
  user,
  conversations,
  messages,
  sendingMessage,
  loading,
  messagesLoading,
  totalConversations,
  predictions,
  searchQuery,
  searchResults,
  loadMessages,
  sendMessage,
  setError,
  selectedLead,
  showMemory,
  showTemplates,
  isInitialized,
  setSelectedLead,
  setIsInitialized,
  handleToggleMemory,
  handleToggleTemplates,
  getLeadIdFromUrl,
  debugPanelOpen,
  setDebugPanelOpen,
  predictiveInsightsOpen,
  setPredictiveInsightsOpen,
  markAsRead,
  markingAsRead,
  searchConversations,
  getPredictionInsights
}) => {
  const selectedConversation = conversations.find(conv => conv.leadId === selectedLead);

  const canReply = (conversation: any) => {
    if (user.role === "manager" || user.role === "admin") return true;
    return !conversation.salespersonId || conversation.salespersonId === user.id;
  };

  const handleSelectConversation = async (leadId: string) => {
    if (selectedLead === leadId) return;
    
    console.log('📱 [OPTIMIZED INBOX] Selecting conversation for lead:', leadId);
    setSelectedLead(leadId);
    await loadMessages(leadId);
  };

  const handleSendMessage = async (message: string, isTemplate?: boolean) => {
    if (!selectedLead || sendingMessage) return;
    
    try {
      await sendMessage(selectedLead, message);
      if (isTemplate) {
        handleToggleTemplates();
      }
    } catch (error) {
      console.error('❌ [OPTIMIZED INBOX] Send message error:', error);
    }
  };

  const topPredictions = predictions.slice(0, 3);
  const predictionScore = topPredictions.reduce((sum, p) => sum + p.predictionScore, 0);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Inbox with Predictive Loading</h1>
          <div className="flex items-center gap-4 text-gray-600">
            <span>
              {totalConversations} total conversations • {conversations.length} loaded
            </span>
            {predictions.length > 0 && (
              <span className="text-blue-600">
                {predictions.filter(p => p.shouldPreload).length} predicted to preload
              </span>
            )}
            {predictionScore > 0 && (
              <span className="text-green-600">
                Prediction confidence: {predictionScore.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setPredictiveInsightsOpen(!predictiveInsightsOpen)}
            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded"
          >
            🧠 Insights
          </button>
          <button
            onClick={() => setDebugPanelOpen(!debugPanelOpen)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Debug
          </button>
        </div>
      </div>

      <OptimizedInboxLayout
        conversations={conversations}
        messages={messages}
        selectedLead={selectedLead}
        selectedConversation={selectedConversation}
        showMemory={showMemory}
        showTemplates={showTemplates}
        sendingMessage={sendingMessage}
        loading={loading}
        user={user}
        onSelectConversation={handleSelectConversation}
        onSendMessage={handleSendMessage}
        onToggleTemplates={handleToggleTemplates}
        canReply={canReply}
        markAsRead={markAsRead}
        markingAsRead={markingAsRead}
        // Enhanced props
        searchQuery={searchQuery}
        searchResults={searchResults}
        predictions={predictions}
        onSearch={searchConversations}
        messagesLoading={messagesLoading}
      />
      
      <PredictiveInsightsPanel
        isOpen={predictiveInsightsOpen}
        onToggle={() => setPredictiveInsightsOpen(!predictiveInsightsOpen)}
        predictions={predictions}
        insights={getPredictionInsights()}
      />
      
      <MessageDebugPanel
        isOpen={debugPanelOpen}
        onToggle={() => setDebugPanelOpen(!debugPanelOpen)}
        leadId={selectedLead || undefined}
      />
    </>
  );
};

export default OptimizedSmartInbox;
