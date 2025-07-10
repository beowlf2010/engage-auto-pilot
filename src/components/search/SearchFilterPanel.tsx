import React, { useState } from 'react';
import { Plus, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useUnifiedSearch, SearchFilter } from './UnifiedSearchProvider';

interface SearchFilterPanelProps {
  onClose: () => void;
}

export const SearchFilterPanel: React.FC<SearchFilterPanelProps> = ({ onClose }) => {
  const { activeFilters, addFilter, removeFilter, updateFilter, clearAllFilters } = useUnifiedSearch();
  const [newFilter, setNewFilter] = useState<Partial<SearchFilter>>({
    type: 'text',
    field: '',
    label: '',
    value: '',
    operator: 'eq',
  });

  // Available filters for different data types
  const availableFilters = [
    // Lead filters
    { field: 'first_name', label: 'First Name', type: 'text', operator: 'ilike' },
    { field: 'last_name', label: 'Last Name', type: 'text', operator: 'ilike' },
    { field: 'email', label: 'Email', type: 'text', operator: 'ilike' },
    { field: 'source', label: 'Lead Source', type: 'select', operator: 'eq', options: [
      { label: 'Website', value: 'website' },
      { label: 'Phone', value: 'phone' },
      { label: 'Referral', value: 'referral' },
      { label: 'Social Media', value: 'social' },
      { label: 'Email', value: 'email' },
    ]},
    { field: 'status', label: 'Lead Status', type: 'select', operator: 'eq', options: [
      { label: 'New', value: 'new' },
      { label: 'Contacted', value: 'contacted' },
      { label: 'Qualified', value: 'qualified' },
      { label: 'Proposal', value: 'proposal' },
      { label: 'Negotiation', value: 'negotiation' },
      { label: 'Closed Won', value: 'closed_won' },
      { label: 'Closed Lost', value: 'closed_lost' },
    ]},
    
    // Inventory filters
    { field: 'make', label: 'Vehicle Make', type: 'text', operator: 'ilike' },
    { field: 'model', label: 'Vehicle Model', type: 'text', operator: 'ilike' },
    { field: 'year', label: 'Vehicle Year', type: 'number', operator: 'eq' },
    { field: 'condition', label: 'Condition', type: 'select', operator: 'eq', options: [
      { label: 'New', value: 'new' },
      { label: 'Used', value: 'used' },
      { label: 'Certified Pre-Owned', value: 'certified' },
    ]},
    { field: 'price', label: 'Price', type: 'number', operator: 'lte' },
    
    // Conversation filters
    { field: 'direction', label: 'Message Direction', type: 'select', operator: 'eq', options: [
      { label: 'Incoming', value: 'in' },
      { label: 'Outgoing', value: 'out' },
    ]},
    
    // Date filters
    { field: 'created_at', label: 'Created Date', type: 'date', operator: 'gte' },
  ];

  const handleAddFilter = () => {
    if (!newFilter.field || !newFilter.label) return;

    const filterTemplate = availableFilters.find(f => f.field === newFilter.field);
    if (!filterTemplate) return;

    addFilter({
      type: filterTemplate.type as SearchFilter['type'],
      field: filterTemplate.field,
      label: filterTemplate.label,
      value: newFilter.value,
      operator: filterTemplate.operator as SearchFilter['operator'],
      options: filterTemplate.options,
    });

    // Reset form
    setNewFilter({
      type: 'text',
      field: '',
      label: '',
      value: '',
      operator: 'eq',
    });
  };

  const handleFilterFieldChange = (field: string) => {
    const filterTemplate = availableFilters.find(f => f.field === field);
    if (filterTemplate) {
      setNewFilter({
        ...newFilter,
        field: filterTemplate.field,
        label: filterTemplate.label,
        type: filterTemplate.type as SearchFilter['type'],
        operator: filterTemplate.operator as SearchFilter['operator'],
        options: filterTemplate.options,
      });
    }
  };

  const renderValueInput = (filter: Partial<SearchFilter>) => {
    switch (filter.type) {
      case 'select':
        return (
          <Select value={String(filter.value)} onValueChange={(value) => setNewFilter({...newFilter, value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map(option => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={filter.value}
            onChange={(e) => setNewFilter({...newFilter, value: e.target.value})}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={filter.value}
            onChange={(e) => setNewFilter({...newFilter, value: e.target.value})}
            placeholder="Enter number"
          />
        );
      default:
        return (
          <Input
            type="text"
            value={filter.value}
            onChange={(e) => setNewFilter({...newFilter, value: e.target.value})}
            placeholder="Enter value"
          />
        );
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">Search Filters</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Active Filters</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 text-xs"
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-2">
              {activeFilters.map(filter => (
                <div key={filter.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{filter.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {filter.operator} "{String(filter.value)}"
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFilter(filter.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Add Filter</Label>
          
          <div className="space-y-2">
            <Select value={newFilter.field} onValueChange={handleFilterFieldChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select field to filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leads" disabled className="font-medium text-xs text-muted-foreground">
                  LEADS
                </SelectItem>
                {availableFilters.filter(f => ['first_name', 'last_name', 'email', 'source', 'status'].includes(f.field)).map(filter => (
                  <SelectItem key={filter.field} value={filter.field}>
                    {filter.label}
                  </SelectItem>
                ))}
                
                <SelectItem value="inventory" disabled className="font-medium text-xs text-muted-foreground mt-2">
                  INVENTORY
                </SelectItem>
                {availableFilters.filter(f => ['make', 'model', 'year', 'condition', 'price'].includes(f.field)).map(filter => (
                  <SelectItem key={filter.field} value={filter.field}>
                    {filter.label}
                  </SelectItem>
                ))}
                
                <SelectItem value="conversations" disabled className="font-medium text-xs text-muted-foreground mt-2">
                  MESSAGES
                </SelectItem>
                {availableFilters.filter(f => ['direction'].includes(f.field)).map(filter => (
                  <SelectItem key={filter.field} value={filter.field}>
                    {filter.label}
                  </SelectItem>
                ))}
                
                <SelectItem value="dates" disabled className="font-medium text-xs text-muted-foreground mt-2">
                  DATES
                </SelectItem>
                {availableFilters.filter(f => ['created_at'].includes(f.field)).map(filter => (
                  <SelectItem key={filter.field} value={filter.field}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {newFilter.field && renderValueInput(newFilter)}

            <Button
              onClick={handleAddFilter}
              disabled={!newFilter.field || !newFilter.value}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>
        </div>

        {/* Quick Filter Presets */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Filters</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addFilter({
                type: 'select',
                field: 'status',
                label: 'Lead Status',
                value: 'new',
                operator: 'eq',
              })}
              className="text-xs"
            >
              New Leads
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addFilter({
                type: 'select',
                field: 'condition',
                label: 'Condition',
                value: 'new',
                operator: 'eq',
              })}
              className="text-xs"
            >
              New Vehicles
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addFilter({
                type: 'date',
                field: 'created_at',
                label: 'Created Date',
                value: new Date().toISOString().split('T')[0],
                operator: 'gte',
              })}
              className="text-xs"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addFilter({
                type: 'select',
                field: 'direction',
                label: 'Message Direction',
                value: 'in',
                operator: 'eq',
              })}
              className="text-xs"
            >
              Incoming
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};