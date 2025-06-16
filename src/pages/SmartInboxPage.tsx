
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import UnifiedSmartInbox from '@/components/inbox/UnifiedSmartInbox';

const SmartInboxPage = () => {
  const { profile } = useAuth();
  
  if (!profile) {
    return <div>Please sign in to access the Smart Inbox</div>;
  }

  return (
    <UnifiedSmartInbox 
      user={{
        id: profile.id,
        role: profile.role
      }}
    />
  );
};

export default SmartInboxPage;
