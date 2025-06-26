
import React from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Crown } from 'lucide-react';
import { ProcessedLead } from './duplicateDetection';
import { useBypassCSVUpload } from '@/hooks/useBypassCSVUpload';

interface BypassUploadButtonProps {
  leads: ProcessedLead[];
  uploadHistoryId?: string;
  disabled?: boolean;
}

const BypassUploadButton = ({ leads, uploadHistoryId, disabled }: BypassUploadButtonProps) => {
  const { uploading, uploadLeads, makeAdmin } = useBypassCSVUpload();

  const handleBypassUpload = async () => {
    if (leads.length === 0) return;
    
    // First promote to admin
    const adminResult = await makeAdmin();
    if (!adminResult.success) return;
    
    // Then upload with bypass
    await uploadLeads(leads, uploadHistoryId);
  };

  return (
    <div className="flex flex-col space-y-2">
      <Button
        onClick={handleBypassUpload}
        disabled={disabled || uploading || leads.length === 0}
        variant="outline"
        className="border-orange-500 text-orange-600 hover:bg-orange-50"
      >
        <Shield className="w-4 h-4 mr-2" />
        {uploading ? 'Bypassing RLS...' : 'Bypass RLS Upload'}
      </Button>
      
      <Button
        onClick={makeAdmin}
        disabled={uploading}
        variant="outline"
        size="sm"
        className="border-purple-500 text-purple-600 hover:bg-purple-50"
      >
        <Crown className="w-3 h-3 mr-1" />
        Make Admin
      </Button>
    </div>
  );
};

export default BypassUploadButton;
