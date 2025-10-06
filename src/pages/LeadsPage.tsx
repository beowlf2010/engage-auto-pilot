import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import { useLeads } from '@/hooks/useLeads';
import LeadsManagement from '@/components/leads/LeadsManagement';
import TodayOnlyToggle from '@/components/leads/TodayOnlyToggle';
import ManualLeadEntry from '@/components/leads/ManualLeadEntry';
import EnhancedLeadDetailModal from '@/components/leads/EnhancedLeadDetailModal';

const LeadsPage = () => {
  const { profile, loading } = useAuth();
  const { todayOnly, toggleTodayOnly } = useLeads();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/50 to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-foreground">Loading leads...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
        <div>
          <h2 className="text-lg font-semibold">Lead Filter Options</h2>
          <p className="text-sm text-muted-foreground">Control which leads are displayed</p>
        </div>
        <TodayOnlyToggle
          todayOnly={todayOnly}
          onToggle={toggleTodayOnly}
        />
      </div>
      <LeadsManagement onOpenLeadDetail={setSelectedLeadId} />
      <ManualLeadEntry />
      
      <EnhancedLeadDetailModal
        leadId={selectedLeadId}
        open={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />
    </div>
  );
};

export default LeadsPage;