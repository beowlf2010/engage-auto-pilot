
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Search, Zap } from 'lucide-react';

interface LeadsPageHeaderProps {
  canImport: boolean;
  onVINImportClick: () => void;
  onFreshLeadsClick: () => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

const LeadsPageHeader = ({ 
  canImport, 
  onVINImportClick, 
  onFreshLeadsClick,
  searchTerm = '',
  onSearchChange
}: LeadsPageHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={onFreshLeadsClick}
          className="flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Fresh Leads
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Input */}
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        )}

        {canImport && (
          <Button
            onClick={onVINImportClick}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import VINs
          </Button>
        )}
      </div>
    </div>
  );
};

export default LeadsPageHeader;
