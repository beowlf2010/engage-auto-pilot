
import React, { useState } from 'react';
import InboxTabs from './InboxTabs';
import MessageThread from './MessageThread';
import { useStreamlinedInbox } from '@/hooks/useStreamlinedInbox';

const StreamlinedInbox = () => {
  const [activeTab, setActiveTab] = useState('scheduled');
  const {
    leads,
    selectedLead,
    messages,
    sendMessage,
    approveAI,
    toggleAI,
    openThread,
    closeThread
  } = useStreamlinedInbox();

  return (
    <div className="bg-slate-50 p-4 space-y-4 rounded-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Smart Inbox 2.0</h1>
      </div>

      <InboxTabs
        leads={leads}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLeadClick={openThread}
      />

      <MessageThread
        lead={selectedLead}
        messages={messages}
        onClose={closeThread}
        onSendMessage={sendMessage}
        onApproveAI={approveAI}
        onToggleAI={toggleAI}
      />
    </div>
  );
};

export default StreamlinedInbox;
