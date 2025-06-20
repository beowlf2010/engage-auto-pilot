
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Upload, Files, Clock } from "lucide-react";
import MultiFileLeadUploadModal from './MultiFileLeadUploadModal';

interface LeadsPageHeaderProps {
  canImport: boolean;
  onVINImportClick: () => void;
  onFreshLeadsClick?: () => void;
}

const LeadsPageHeader = ({ canImport, onVINImportClick, onFreshLeadsClick }: LeadsPageHeaderProps) => {
  const [isMultiFileModalOpen, setIsMultiFileModalOpen] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Leads</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={onFreshLeadsClick}
            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
          >
            <Clock className="w-4 h-4 mr-2" />
            Fresh Leads (Today)
          </Button>
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
