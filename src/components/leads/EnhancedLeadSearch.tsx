
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  X, 
  Save, 
  Loader2,
  Bot,
  BotOff,
  Users
} from 'lucide-react';
import { SearchFilters } from '@/hooks/useAdvancedLeads';

interface EnhancedLeadSearchProps {
  onFiltersChange: (filters: SearchFilters) => void;
  savedPresets: any[];
  onSavePreset: (name: string, filters: SearchFilters) => void;
  onLoadPreset: (preset: any) => void;
  totalResults: number;
  isLoading: boolean;
}

const EnhancedLeadSearch: React.FC<EnhancedLeadSearchProps> = ({
  onFiltersChange,
  savedPresets,
  onSavePreset,
  onLoadPreset,
  totalResults,
  isLoading
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    dateFilter: 'all'
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    const clearedFilters = { searchTerm: '', dateFilter: 'all' as const };
    setFilters(clearedFilters);
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim(), filters);
      setPresetName('');
      setShowSavePreset(false);
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== '' && value !== 'all' && value !== undefined
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Search & Filter Leads</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-sm">
              {isLoading ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading...</>
              ) : (
                `${totalResults} results`
              )}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="w-4 h-4 mr-1" />
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Basic Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, phone, or vehicle interest..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick AI Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.activeNotOptedIn ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter('activeNotOptedIn', filters.activeNotOptedIn ? undefined : true)}
            className="flex items-center gap-1"
          >
            <Users className="w-3 h-3" />
            Active Not Opted In
            {filters.activeNotOptedIn && <X className="w-3 h-3 ml-1" />}
          </Button>
          
          <Button
            variant={filters.aiOptIn === false ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter('aiOptIn', filters.aiOptIn === false ? undefined : false)}
            className="flex items-center gap-1"
          >
            <BotOff className="w-3 h-3" />
            AI Disabled
            {filters.aiOptIn === false && <X className="w-3 h-3 ml-1" />}
          </Button>
          
          <Button
            variant={filters.aiOptIn === true ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter('aiOptIn', filters.aiOptIn === true ? undefined : true)}
            className="flex items-center gap-1"
          >
            <Bot className="w-3 h-3" />
            AI Enabled
            {filters.aiOptIn === true && <X className="w-3 h-3 ml-1" />}
          </Button>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status || ''} onValueChange={(value) => updateFilter('status', value || undefined)}>
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
              <label className="text-sm font-medium mb-2 block">Do Not Contact</label>
              <Select value={filters.doNotContact?.toString() || ''} onValueChange={(value) => updateFilter('doNotContact', value === '' ? undefined : value === 'true')}>
                <SelectTrigger>
                  <SelectValue placeholder="Any contact status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any contact status</SelectItem>
                  <SelectItem value="false">Can Contact</SelectItem>
                  <SelectItem value="true">Do Not Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date Added</label>
              <Select value={filters.dateFilter || 'all'} onValueChange={(value) => updateFilter('dateFilter', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Vehicle Interest</label>
              <Input
                placeholder="e.g., Silverado, Tahoe"
                value={filters.vehicleInterest || ''}
                onChange={(e) => updateFilter('vehicleInterest', e.target.value || undefined)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Source</label>
              <Input
                placeholder="e.g., AutoTrader, Website"
                value={filters.source || ''}
                onChange={(e) => updateFilter('source', e.target.value || undefined)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">City</label>
              <Input
                placeholder="City name"
                value={filters.city || ''}
                onChange={(e) => updateFilter('city', e.target.value || undefined)}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            )}
            
            {showAdvanced && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSavePreset(!showSavePreset)}
              >
                <Save className="w-4 h-4 mr-1" />
                Save Preset
              </Button>
            )}
          </div>

          {savedPresets.length > 0 && (
            <Select onValueChange={(value) => {
              const preset = savedPresets.find(p => p.id === value);
              if (preset) onLoadPreset(preset);
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Load saved preset" />
              </SelectTrigger>
              <SelectContent>
                {savedPresets.map(preset => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {showSavePreset && (
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Input
              placeholder="Preset name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setShowSavePreset(false)}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedLeadSearch;
