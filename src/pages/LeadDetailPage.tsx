
import React from 'react';
import StreamlinedNavigation from "@/components/StreamlinedNavigation";
import LeadDetail from '@/components/LeadDetail';

const LeadDetailPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <StreamlinedNavigation />
      <main className="flex-1">
        <LeadDetail />
      </main>
    </div>
  );
};

export default LeadDetailPage;
