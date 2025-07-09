
import React from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Crown, CheckCircle, AlertCircle, Loader2, Users } from 'lucide-react';
import { ProcessedLead } from './duplicateDetection';
import { useEnhancedBypassUpload } from '@/hooks/useEnhancedBypassUpload';
import SoldCustomerSummary from './SoldCustomerSummary';

interface EnhancedBypassUploadButtonProps {
  leads: ProcessedLead[];
  uploadHistoryId?: string;
  disabled?: boolean;
}

const EnhancedBypassUploadButton = ({ leads, uploadHistoryId, disabled }: EnhancedBypassUploadButtonProps) => {
  const { uploading, checkingDuplicates, uploadLeads, makeAdmin, uploadResult } = useEnhancedBypassUpload();

  const handleBypassUpload = async () => {
    if (leads.length === 0) return;
    
    // First promote to admin
    const adminResult = await makeAdmin();
    if (!adminResult.success) return;
    
    // Then upload with enhanced duplicate checking
    await uploadLeads(leads, uploadHistoryId);
  };

  const isProcessing = uploading || checkingDuplicates;

  return (
    <div className="flex flex-col space-y-3">
      <Button
        onClick={handleBypassUpload}
        disabled={disabled || isProcessing || leads.length === 0}
        variant="outline"
        className="border-orange-500 text-orange-600 hover:bg-orange-50 min-h-10"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Shield className="w-4 h-4 mr-2" />
        )}
        {checkingDuplicates ? 'Checking Duplicates...' : 
         uploading ? 'Uploading Leads...' : 
         'Enhanced Bypass Upload'}
      </Button>
      
      <Button
        onClick={makeAdmin}
        disabled={isProcessing}
        variant="outline"
        size="sm"
        className="border-purple-500 text-purple-600 hover:bg-purple-50"
      >
        <Crown className="w-3 h-3 mr-1" />
        Make Admin
      </Button>

      {/* Upload Results Summary */}
      {uploadResult && (
        <div className="mt-3 space-y-3">
          <div className="p-3 border rounded-lg bg-gray-50">
            <div className="flex items-center space-x-2 mb-2">
              {uploadResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                Upload Complete
              </span>
            </div>
            
            <div className="text-xs text-gray-600 space-y-1">
              <div>• Processed: {uploadResult.totalProcessed} leads</div>
              <div className="text-green-600">• Uploaded: {uploadResult.successfulInserts} new leads</div>
              {uploadResult.skippedDuplicates && uploadResult.skippedDuplicates > 0 && (
                <div className="text-orange-600">• Skipped: {uploadResult.skippedDuplicates} duplicates</div>
              )}
              {uploadResult.soldCustomerSummary && uploadResult.soldCustomerSummary.totalSoldCustomers > 0 && (
                <div className="text-blue-600">• Sold: {uploadResult.soldCustomerSummary.totalSoldCustomers} customers</div>
              )}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="text-red-600">• Errors: {uploadResult.errors.length}</div>
              )}
            </div>

            {uploadResult.duplicateCheckResult && uploadResult.duplicateCheckResult.duplicateLeads.length > 0 && (
              <div className="mt-2 pt-2 border-t text-xs">
                <div className="font-medium text-gray-700 mb-1">Duplicate Types:</div>
                <div className="text-gray-600 space-y-1">
                  {uploadResult.duplicateCheckResult.checkSummary.phoneMatches > 0 && (
                    <div>• Phone: {uploadResult.duplicateCheckResult.checkSummary.phoneMatches}</div>
                  )}
                  {uploadResult.duplicateCheckResult.checkSummary.emailMatches > 0 && (
                    <div>• Email: {uploadResult.duplicateCheckResult.checkSummary.emailMatches}</div>
                  )}
                  {uploadResult.duplicateCheckResult.checkSummary.nameMatches > 0 && (
                    <div>• Name: {uploadResult.duplicateCheckResult.checkSummary.nameMatches}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sold Customer Summary */}
          {uploadResult.soldCustomerSummary && (
            <SoldCustomerSummary 
              summary={uploadResult.soldCustomerSummary}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedBypassUploadButton;
