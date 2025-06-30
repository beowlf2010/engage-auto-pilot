
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import LeadsList from '@/components/LeadsList';
import MultiFileLeadUploadModal from '@/components/leads/MultiFileLeadUploadModal';

const LeadsPage = () => {
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const canUpload = user?.role === 'admin' || user?.role === 'manager';

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    // Force a page refresh to show new leads
    window.location.reload();
  };

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

      <LeadsList />

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
