
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText } from 'lucide-react';

interface UploadInfoPanelProps {
  updateExistingLeads: boolean;
}

const UploadInfoPanel = ({ updateExistingLeads }: UploadInfoPanelProps) => {
  return (
    <>
      {/* VIN Solutions Import Notice */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Looking to import VIN Solutions message logs?</strong> Use the dedicated Message Import feature 
          in the sidebar navigation or visit the Message Export page for proper VIN Solutions file processing.
        </AlertDescription>
      </Alert>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Lead Upload Information</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each file will be processed independently as lead data</li>
          <li>• Duplicate leads will be automatically detected and {updateExistingLeads ? 'updated with new information' : 'skipped'}</li>
          <li>• Phone numbers will be prioritized: Cell → Day → Evening</li>
          <li>• Multi-sheet Excel files require individual processing</li>
          <li>• For VIN Solutions message imports, use the Message Import feature</li>
          <li>• Manager or admin permissions are required for uploads</li>
        </ul>
      </div>
    </>
  );
};

export default UploadInfoPanel;
