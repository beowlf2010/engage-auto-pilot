
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Upload, Files } from "lucide-react";
import MultiFileLeadUploadModal from './MultiFileLeadUploadModal';

interface LeadsPageHeaderProps {
  canImport: boolean;
  onVINImportClick: () => void;
}

const LeadsPageHeader = ({ canImport, onVINImportClick }: LeadsPageHeaderProps) => {
  const [isMultiFileModalOpen, setIsMultiFileModalOpen] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Leads</h1>
        <div className="flex space-x-2">
          {canImport && (
            <>
              <Button variant="outline" onClick={onVINImportClick}>
                <Upload className="w-4 h-4 mr-2" />
                Import from VIN
              </Button>
              <Button variant="outline" onClick={() => setIsMultiFileModalOpen(true)}>
                <Files className="w-4 h-4 mr-2" />
                Multi-File Upload
              </Button>
            </>
          )}
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      <MultiFileLeadUploadModal
        isOpen={isMultiFileModalOpen}
        onClose={() => setIsMultiFileModalOpen(false)}
        onSuccess={() => {
          setIsMultiFileModalOpen(false);
          // Refresh the leads list
          window.location.reload();
        }}
      />
    </>
  );
};

export default LeadsPageHeader;
