
import React from "react";
import { useLeadDetail } from "@/hooks/useLeadDetail";
import StreamlinedLeadDetail from "./leads/detail/StreamlinedLeadDetail";

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lead details...</p>
        </div>
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
