
import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";

interface LeadsPageHeaderProps {
  canImport: boolean;
  onVINImportClick: () => void;
}

const LeadsPageHeader = ({ canImport, onVINImportClick }: LeadsPageHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold">Leads</h1>
      <div className="flex space-x-2">
        {canImport && (
          <Button variant="outline" onClick={onVINImportClick}>
            <Upload className="w-4 h-4 mr-2" />
            Import from VIN
          </Button>
        )}
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>
    </div>
  );
};

export default LeadsPageHeader;
