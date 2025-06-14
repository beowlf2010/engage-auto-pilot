
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Save, X, Calendar } from "lucide-react";

export interface SearchFilters {
  searchTerm: string;
  status?: string;
  source?: string;
  aiOptIn?: boolean;
  dateRange?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  salesperson?: string;
  contactStatus?: string;
}

export interface SavedPreset {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
}

interface EnhancedLeadSearchProps {
  onFiltersChange: (filters: SearchFilters) => void;
  savedPresets: SavedPreset[];
  onSavePreset: (name: string, filters: SearchFilters) => Promise<void>;
  onLoadPreset: (preset: SavedPreset) => void;
  totalResults: number;
  isLoading?: boolean;
}

const EnhancedLeadSearch: React.FC<EnhancedLeadSearchProps> = ({
  onFiltersChange,
  savedPresets,
  onSavePreset,
  onLoadPreset,
  totalResults,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: SearchFilters = { searchTerm: '' };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const handleSavePreset = async () => {
    if (savePresetName.trim() && Object.keys(filters).length > 1) {
      await onSavePreset(savePresetName.trim(), filters);
      setSavePresetName('');
      setShowSavePreset(false);
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => 
    v !== '' && v !== undefined && v !== null
  ).length - (filters.searchTerm ? 1 : 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Search & Filter Leads</span>
          <Badge variant="outline">{totalResults} results</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name, email, phone, or vehicle interest..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm"
          >
            <Filter className="w-4 h-4 mr-1" />
            Advanced {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
          
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-sm"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSavePreset(true)}
            disabled={activeFilterCount === 0}
            className="text-sm"
          >
            <Save className="w-4 h-4 mr-1" />
            Save Preset
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={filters.status || ''} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="engaged">Engaged</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Source</label>
              <Select value={filters.source || ''} onValueChange={(value) => handleFilterChange('source', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any source</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">AI Status</label>
              <Select 
                value={filters.aiOptIn === undefined ? '' : filters.aiOptIn.toString()} 
                onValueChange={(value) => handleFilterChange('aiOptIn', value === '' ? undefined : value === 'true')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any AI status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any AI status</SelectItem>
                  <SelectItem value="true">AI Enabled</SelectItem>
                  <SelectItem value="false">AI Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Saved Presets */}
        {savedPresets.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Saved Presets</label>
            <div className="flex flex-wrap gap-2">
              {savedPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onLoadPreset(preset)}
                  className="text-sm"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Save Preset Dialog */}
        {showSavePreset && (
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <Input
              placeholder="Preset name..."
              value={savePresetName}
              onChange={(e) => setSavePresetName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSavePreset} size="sm">
              Save
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowSavePreset(false)} 
              size="sm"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedLeadSearch;
