import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  Upload,
  Mail,
  Phone,
  Tag,
  Edit,
  Trash2,
  Archive,
  BarChart3,
  RefreshCw,
  Filter,
  Star,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Settings
} from 'lucide-react';
import { InventoryItem } from '@/services/inventory/types';

interface QuickActionsToolbarProps {
  selectedVehicles: InventoryItem[];
  totalVehicles: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkAction: (action: string, data?: any) => void;
  onQuickFilter: (filter: any) => void;
}

const QuickActionsToolbar = ({
  selectedVehicles,
  totalVehicles,
  onSelectAll,
  onClearSelection,
  onBulkAction,
  onQuickFilter
}: QuickActionsToolbarProps) => {
  const [bulkPriceAdjustment, setBulkPriceAdjustment] = useState('');
  const [bulkStatusChange, setBulkStatusChange] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);

  const hasSelection = selectedVehicles.length > 0;
  const isAllSelected = selectedVehicles.length === totalVehicles;

  const quickFilters = [
    { label: 'Available', icon: Star, filter: { status: 'available' } },
    { label: 'Under $30K', icon: DollarSign, filter: { priceMax: 30000 } },
    { label: 'New Vehicles', icon: Tag, filter: { inventoryType: 'new' } },
    { label: 'Over 60 Days', icon: Clock, filter: { sortBy: 'age', ageMin: 60 } },
    { label: 'High Interest', icon: BarChart3, filter: { sortBy: 'leads_count', sortOrder: 'desc' } },
    { label: 'No Leads', icon: Mail, filter: { leads_count: 0 } }
  ];

  const exportOptions = [
    { label: 'Export to Excel', action: 'export_excel' },
    { label: 'Export to PDF', action: 'export_pdf' },
    { label: 'Export Vehicle List', action: 'export_list' },
    { label: 'Export for Marketing', action: 'export_marketing' }
  ];

  const bulkActions = [
    { 
      label: 'Update Pricing', 
      action: 'bulk_price_update',
      icon: DollarSign,
      description: 'Adjust prices for selected vehicles'
    },
    { 
      label: 'Change Status', 
      action: 'bulk_status_change',
      icon: Tag,
      description: 'Update status for multiple vehicles'
    },
    { 
      label: 'Add to Marketing', 
      action: 'bulk_marketing',
      icon: Mail,
      description: 'Add vehicles to marketing campaigns'
    },
    { 
      label: 'Generate Reports', 
      action: 'bulk_report',
      icon: BarChart3,
      description: 'Create reports for selected vehicles'
    },
    { 
      label: 'Archive Vehicles', 
      action: 'bulk_archive',
      icon: Archive,
      description: 'Archive selected vehicles'
    }
  ];

  return (
    <div className="bg-white border-b shadow-sm sticky top-0 z-10">
      <div className="flex items-center justify-between p-4">
        {/* Left Section: Selection Info & Quick Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={isAllSelected ? onClearSelection : onSelectAll}
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>
            
            {hasSelection && (
              <>
                <Badge variant="secondary">
                  {selectedVehicles.length} of {totalVehicles} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                >
                  Clear
                </Button>
              </>
            )}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Quick:</span>
            {quickFilters.map((filter) => (
              <Button
                key={filter.label}
                variant="outline"
                size="sm"
                onClick={() => onQuickFilter(filter.filter)}
                className="flex items-center gap-1"
              >
                <filter.icon className="h-3 w-3" />
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2">
          {/* Export Actions */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Export Options</h4>
                {exportOptions.map((option) => (
                  <Button
                    key={option.action}
                    variant="ghost"
                    size="sm"
                    onClick={() => onBulkAction(option.action)}
                    className="w-full justify-start"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Bulk Actions (shown when vehicles are selected) */}
          {hasSelection && (
            <Popover open={showBulkActions} onOpenChange={setShowBulkActions}>
              <PopoverTrigger asChild>
                <Button size="sm" className="ml-2">
                  <Edit className="h-4 w-4 mr-2" />
                  Bulk Actions ({selectedVehicles.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-3">Bulk Actions</h4>
                    <div className="grid gap-2">
                      {bulkActions.map((action) => (
                        <Button
                          key={action.action}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onBulkAction(action.action);
                            setShowBulkActions(false);
                          }}
                          className="justify-start"
                        >
                          <action.icon className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div className="font-medium">{action.label}</div>
                            <div className="text-xs text-muted-foreground">{action.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Quick Bulk Price Update */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quick Price Adjustment</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Amount or %"
                        value={bulkPriceAdjustment}
                        onChange={(e) => setBulkPriceAdjustment(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          onBulkAction('quick_price_update', { adjustment: bulkPriceAdjustment });
                          setBulkPriceAdjustment('');
                          setShowBulkActions(false);
                        }}
                        disabled={!bulkPriceAdjustment}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>

                  {/* Quick Status Change */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quick Status Change</label>
                    <div className="flex gap-2">
                      <Select value={bulkStatusChange} onValueChange={setBulkStatusChange}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="service">In Service</SelectItem>
                          <SelectItem value="wholesale">Wholesale</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => {
                          onBulkAction('quick_status_change', { status: bulkStatusChange });
                          setBulkStatusChange('');
                          setShowBulkActions(false);
                        }}
                        disabled={!bulkStatusChange}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={() => onBulkAction('refresh')}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Settings */}
          <Button variant="outline" size="sm" onClick={() => onBulkAction('settings')}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsToolbar;