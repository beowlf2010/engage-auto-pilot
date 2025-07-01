
import React from "react";
import { useLeadDetail } from "@/hooks/useLeadDetail";
import { useAIIntelligenceInitialization } from "@/hooks/useAIIntelligenceInitialization";
import StreamlinedLeadDetail from "./leads/detail/StreamlinedLeadDetail";
import EnhancedLoadingState from "./ui/EnhancedLoadingState";

const LeadDetail = () => {
  const {
    lead,
    transformedLead,
    messageThreadLead,
    phoneNumbers,
    primaryPhone,
    isLoading,
    error,
    showMessageComposer,
    setShowMessageComposer,
    handlePhoneSelect,
    handleStatusChanged
  } = useLeadDetail();

  const { 
    isInitialized: aiInitialized, 
    isInitializing: aiInitializing,
    initializationError: aiError
  } = useAIIntelligenceInitialization();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <EnhancedLoadingState
          type="messages"
          message="Loading lead details and initializing AI Intelligence..."
        />
      </div>
    );
  }

  if (error || !lead || !transformedLead || !messageThreadLead) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead Not Found</h2>
          <p className="text-gray-600">The lead you're looking for doesn't exist or you don't have permission to view it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* AI Initialization Status */}
        {aiInitializing && (
          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span className="text-sm text-purple-700">Initializing AI Intelligence Hub...</span>
            </div>
          </div>
        )}
        
        {aiError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-700">AI Intelligence initialization failed: {aiError}</span>
            </div>
          </div>
        )}

        {aiInitialized && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">AI Intelligence Hub Active - 5 Services Running</span>
            </div>
          </div>
        )}

        <StreamlinedLeadDetail
          lead={lead}
          transformedLead={transformedLead}
          messageThreadLead={messageThreadLead}
          phoneNumbers={phoneNumbers}
          primaryPhone={primaryPhone}
          showMessageComposer={showMessageComposer}
          setShowMessageComposer={setShowMessageComposer}
          onPhoneSelect={handlePhoneSelect}
          onStatusChanged={handleStatusChanged}
        />
      </div>
    </div>
  );
};

export default LeadDetail;
