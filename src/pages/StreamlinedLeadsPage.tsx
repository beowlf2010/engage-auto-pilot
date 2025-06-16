
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import LeadsList from '@/components/LeadsList';

const StreamlinedLeadsPage = () => {
  const { profile } = useAuth();
  
  if (!profile) {
    return <div>Please sign in to access leads</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <LeadsList />
    </div>
  );
};

export default StreamlinedLeadsPage;
