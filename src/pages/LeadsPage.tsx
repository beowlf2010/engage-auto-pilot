
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import LeadsList from '@/components/LeadsList';
import MultiFileLeadUploadModal from '@/components/leads/MultiFileLeadUploadModal';
import PostSaleFollowUpPanel from '@/components/leads/PostSaleFollowUpPanel';

const LeadsPage = () => {
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const canUpload = user?.role === 'admin' || user?.role === 'manager';

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    // Trigger a refresh of the leads list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleProcessAssigned = () => {
    // Trigger a refresh of the leads list
    setRefreshTrigger(prev => prev + 1);
  };

  // Listen for sold customers view event
  useEffect(() => {
    const handleNavigateToSoldCustomers = () => {
      // Trigger navigation to sold customers tab
      const event = new CustomEvent('setStatusFilter', { 
        detail: { statusFilter: 'sold_customers' } 
      });
      window.dispatchEvent(event);
    };

    window.addEventListener('navigateToSoldCustomers', handleNavigateToSoldCustomers);
    return () => {
      window.removeEventListener('navigateToSoldCustomers', handleNavigateToSoldCustomers);
    };
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Lead Management</h1>
          <p className="text-slate-600">Manage your leads and track communication</p>
        </div>

        {canUpload && (
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Leads
          </Button>
        )}
      </div>

      {/* Post-Sale Follow-Up Panel */}
      {canUpload && (
        <div className="mb-6">
          <PostSaleFollowUpPanel
            selectedLeadIds={[]}
            onProcessAssigned={handleProcessAssigned}
          />
        </div>
      )}

      <LeadsList key={refreshTrigger} />

      {/* Upload Modal */}
      <MultiFileLeadUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
};

export default LeadsPage;
