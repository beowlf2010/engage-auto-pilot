
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  Save,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";

export interface FilterOptions {
  status: string[];
  contactStatus: string[];
  source: string[];
  aiOptIn: boolean | null;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  vehicleInterest: string;
  city: string;
  state: string;
  engagementScore: {
    min: number | null;
    max: number | null;
  };
}

interface AdvancedFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onSavePreset: (name: string, filters: FilterOptions) => void;
  savedPresets: Array<{ name: string; filters: FilterOptions }>;
  onLoadPreset: (filters: FilterOptions) => void;
  onClearFilters: () => void;
}

const AdvancedFilters = ({ 
  filters, 
  onFiltersChange, 
  onSavePreset, 
  savedPresets, 
  onLoadPreset,
  onClearFilters 
}: AdvancedFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [presetName, setPresetName] = useState('');

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: 'status' | 'contactStatus' | 'source', value: string) => {
    const currentArray = filters[key];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.contactStatus.length > 0) count++;
    if (filters.source.length > 0) count++;
    if (filters.aiOptIn !== null) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.vehicleInterest) count++;
    if (filters.city) count++;
    if (filters.state) count++;
    if (filters.engagementScore.min || filters.engagementScore.max) count++;
    return count;
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim(), filters);
      setPresetName('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" />
            Advanced Filters
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFilterCount()} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide' : 'Show'}
            </Button>
            {getActiveFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Saved Presets */}
          {savedPresets.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {savedPresets.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => onLoadPreset(preset.filters)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Status Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <div className="space-y-2">
                {['new', 'engaged', 'paused', 'closed', 'lost'].map(status => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.status.includes(status)}
                      onCheckedChange={() => toggleArrayFilter('status', status)}
                    />
                    <span className="text-sm">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Contact Status</label>
              <div className="space-y-2">
                {['no_contact', 'contact_attempted', 'response_received'].map(status => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.contactStatus.includes(status)}
                      onCheckedChange={() => toggleArrayFilter('contactStatus', status)}
                    />
                    <span className="text-sm">
                      {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">AI Status</label>
              <Select
                value={filters.aiOptIn === null ? 'all' : filters.aiOptIn.toString()}
                onValueChange={(value) => 
                  updateFilter('aiOptIn', value === 'all' ? null : value === 'true')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Created From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? format(filters.dateRange.from, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.from || undefined}
                    onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, from: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Created To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.to ? format(filters.dateRange.to, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.to || undefined}
                    onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, to: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Search Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Vehicle Interest</label>
              <Input
                placeholder="Search vehicle interest..."
                value={filters.vehicleInterest}
                onChange={(e) => updateFilter('vehicleInterest', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">City</label>
              <Input
                placeholder="City..."
                value={filters.city}
                onChange={(e) => updateFilter('city', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">State</label>
              <Input
                placeholder="State..."
                value={filters.state}
                onChange={(e) => updateFilter('state', e.target.value)}
              />
            </div>
          </div>

          {/* Engagement Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Min Engagement Score</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={filters.engagementScore.min || ''}
                onChange={(e) => updateFilter('engagementScore', {
                  ...filters.engagementScore,
                  min: e.target.value ? parseInt(e.target.value) : null
                })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Max Engagement Score</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="100"
                value={filters.engagementScore.max || ''}
                onChange={(e) => updateFilter('engagementScore', {
                  ...filters.engagementScore,
                  max: e.target.value ? parseInt(e.target.value) : null
                })}
              />
            </div>
          </div>

          {/* Save Preset */}
          <div className="flex gap-2 pt-4 border-t">
            <Input
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              size="sm"
            >
              <Save className="h-3 w-3 mr-1" />
              Save Preset
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdvancedFilters;
