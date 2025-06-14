
import React, { useState, useEffect, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Filter, 
  X, 
  Save, 
  BookOpen,
  Calendar,
  Phone,
  Mail,
  Bot,
  TrendingUp
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SearchFilters {
  searchTerm: string;
  status: string[];
  source: string[];
  aiOptIn: string;
  hasPhone: string;
  hasEmail: string;
  createdDateFrom: string;
  createdDateTo: string;
  lastActivityFrom: string;
  lastActivityTo: string;
  salesperson: string[];
  vehicleInterest: string;
  minEngagementScore: number;
  maxEngagementScore: number;
}

interface SavedPreset {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
}

interface EnhancedLeadSearchProps {
  onFiltersChange: (filters: SearchFilters) => void;
  savedPresets?: SavedPreset[];
  onSavePreset?: (name: string, filters: SearchFilters) => Promise<void>;
  onLoadPreset?: (preset: SavedPreset) => void;
  onDeletePreset?: (presetId: string) => Promise<void>;
  totalResults: number;
  isLoading?: boolean;
}

const defaultFilters: SearchFilters = {
  searchTerm: '',
  status: [],
  source: [],
  aiOptIn: 'all',
  hasPhone: 'all',
  hasEmail: 'all',
  createdDateFrom: '',
  createdDateTo: '',
  lastActivityFrom: '',
  lastActivityTo: '',
  salesperson: [],
  vehicleInterest: '',
  minEngagementScore: 0,
  maxEngagementScore: 100
};

const STATUS_OPTIONS = [
  'new', 'engaged', 'contacted', 'follow_up', 'not_interested', 
  'paused', 'closed', 'lost', 'sold', 'bad'
];

const SOURCE_OPTIONS = [
  'Website', 'Phone Call', 'Email', 'Walk-in', 'Referral', 
  'Social Media', 'Advertisement', 'CSV Import', 'Manual Entry'
];

const SALESPERSON_OPTIONS = [
  'John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Wilson', 'Tom Brown'
];

const EnhancedLeadSearch: React.FC<EnhancedLeadSearchProps> = ({
  onFiltersChange,
  savedPresets = [],
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  totalResults,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [presetName, setPresetName] = useState('');
  const [showPresetSave, setShowPresetSave] = useState(false);

  // Debounced filter updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange(filters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const currentArray = prev[key] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray };
    });
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const savePreset = async () => {
    if (!presetName.trim()) {
      toast({
        title: "Preset name required",
        description: "Please enter a name for the preset",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSavePreset?.(presetName, filters);
      setPresetName('');
      setShowPresetSave(false);
      toast({
        title: "Preset saved",
        description: `Filter preset "${presetName}" has been saved`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preset",
        variant: "destructive",
      });
    }
  };

  const loadPreset = (preset: SavedPreset) => {
    setFilters(preset.filters);
    onLoadPreset?.(preset);
    toast({
      title: "Preset loaded",
      description: `Filter preset "${preset.name}" has been applied`,
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.status.length > 0) count++;
    if (filters.source.length > 0) count++;
    if (filters.aiOptIn !== 'all') count++;
    if (filters.hasPhone !== 'all') count++;
    if (filters.hasEmail !== 'all') count++;
    if (filters.createdDateFrom || filters.createdDateTo) count++;
    if (filters.lastActivityFrom || filters.lastActivityTo) count++;
    if (filters.salesperson.length > 0) count++;
    if (filters.vehicleInterest) count++;
    if (filters.minEngagementScore > 0 || filters.maxEngagementScore < 100) count++;
    return count;
  }, [filters]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>Search & Filter Leads</span>
          </span>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{totalResults} results</Badge>
            {activeFilterCount > 0 && (
              <Badge>{activeFilterCount} filters</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or vehicle interest..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Filters Row */}
        <div className="flex flex-wrap gap-2">
          <Select 
            value={filters.aiOptIn} 
            onValueChange={(value) => updateFilter('aiOptIn', value)}
          >
            <SelectTrigger className="w-32">
              <Bot className="w-3 h-3 mr-1" />
              <SelectValue placeholder="AI Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All AI Status</SelectItem>
              <SelectItem value="true">AI Enabled</SelectItem>
              <SelectItem value="false">AI Disabled</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.hasPhone} 
            onValueChange={(value) => updateFilter('hasPhone', value)}
          >
            <SelectTrigger className="w-32">
              <Phone className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Phone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phone</SelectItem>
              <SelectItem value="true">Has Phone</SelectItem>
              <SelectItem value="false">No Phone</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.hasEmail} 
            onValueChange={(value) => updateFilter('hasEmail', value)}
          >
            <SelectTrigger className="w-32">
              <Mail className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Email" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Email</SelectItem>
              <SelectItem value="true">Has Email</SelectItem>
              <SelectItem value="false">No Email</SelectItem>
            </SelectContent>
          </Select>

          {/* Advanced Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-3 h-3 mr-1" />
                Advanced
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {STATUS_OPTIONS.map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={filters.status.includes(status)}
                          onCheckedChange={() => toggleArrayFilter('status', status)}
                        />
                        <label htmlFor={`status-${status}`} className="text-sm capitalize">
                          {status.replace('_', ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Source</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {SOURCE_OPTIONS.map((source) => (
                      <div key={source} className="flex items-center space-x-2">
                        <Checkbox
                          id={`source-${source}`}
                          checked={filters.source.includes(source)}
                          onCheckedChange={() => toggleArrayFilter('source', source)}
                        />
                        <label htmlFor={`source-${source}`} className="text-sm">
                          {source}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Salesperson</label>
                  <div className="space-y-2 mt-1">
                    {SALESPERSON_OPTIONS.map((person) => (
                      <div key={person} className="flex items-center space-x-2">
                        <Checkbox
                          id={`person-${person}`}
                          checked={filters.salesperson.includes(person)}
                          onCheckedChange={() => toggleArrayFilter('salesperson', person)}
                        />
                        <label htmlFor={`person-${person}`} className="text-sm">
                          {person}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Vehicle Interest</label>
                  <Input
                    placeholder="e.g., Honda Civic, SUV, Truck"
                    value={filters.vehicleInterest}
                    onChange={(e) => updateFilter('vehicleInterest', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Created From</label>
                    <Input
                      type="date"
                      value={filters.createdDateFrom}
                      onChange={(e) => updateFilter('createdDateFrom', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Created To</label>
                    <Input
                      type="date"
                      value={filters.createdDateTo}
                      onChange={(e) => updateFilter('createdDateTo', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Engagement Score Range</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.minEngagementScore}
                      onChange={(e) => updateFilter('minEngagementScore', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <span>to</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.maxEngagementScore}
                      onChange={(e) => updateFilter('maxEngagementScore', parseInt(e.target.value) || 100)}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Saved Presets */}
        {savedPresets.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Saved Presets</div>
            <div className="flex flex-wrap gap-2">
              {savedPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreset(preset)}
                  className="h-8"
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Save Preset */}
        {onSavePreset && (
          <div className="flex items-center space-x-2">
            {showPresetSave ? (
              <>
                <Input
                  placeholder="Preset name..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={savePreset}>
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setShowPresetSave(false);
                    setPresetName('');
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPresetSave(true)}
                disabled={activeFilterCount === 0}
              >
                <Save className="w-3 h-3 mr-1" />
                Save as Preset
              </Button>
            )}
          </div>
        )}

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1">
            {filters.status.map((status) => (
              <Badge key={`status-${status}`} variant="secondary" className="text-xs">
                Status: {status}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => toggleArrayFilter('status', status)}
                />
              </Badge>
            ))}
            {filters.source.map((source) => (
              <Badge key={`source-${source}`} variant="secondary" className="text-xs">
                Source: {source}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => toggleArrayFilter('source', source)}
                />
              </Badge>
            ))}
            {filters.aiOptIn !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                AI: {filters.aiOptIn === 'true' ? 'Enabled' : 'Disabled'}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => updateFilter('aiOptIn', 'all')}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedLeadSearch;
