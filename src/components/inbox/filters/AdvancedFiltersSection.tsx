
import React from 'react';
import { InboxFilters } from '@/hooks/useInboxFilters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface AdvancedFiltersSectionProps {
  filters: InboxFilters;
  onFiltersChange: (filters: Partial<InboxFilters>) => void;
}

const AdvancedFiltersSection: React.FC<AdvancedFiltersSectionProps> = ({
  filters,
  onFiltersChange
}) => {
  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'engaged', label: 'Engaged' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'appointment_set', label: 'Appointment Set' },
    { value: 'sold', label: 'Sold' },
    { value: 'lost', label: 'Lost' }
  ];

  const priorityOptions = [
    { value: 'unread', label: 'Unread Messages' },
    { value: 'high', label: 'High Priority' },
    { value: 'responded', label: 'Recently Responded' }
  ];

  const assignedOptions = [
    { value: 'assigned', label: 'Assigned' },
    { value: 'unassigned', label: 'Unassigned' }
  ];

  const messageDirectionOptions = [
    { value: 'inbound', label: 'Inbound Messages' },
    { value: 'outbound', label: 'Outbound Messages' },
    { value: 'needs_response', label: 'Needs Response' }
  ];

  const handleStatusChange = (value: string, checked: boolean) => {
    const newStatus = checked 
      ? [...filters.status, value]
      : filters.status.filter(s => s !== value);
    onFiltersChange({ status: newStatus });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Advanced Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Lead Status</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {statusOptions.map(({ value, label }) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${value}`}
                  checked={filters.status.includes(value)}
                  onCheckedChange={(checked) => handleStatusChange(value, checked as boolean)}
                />
                <Label htmlFor={`status-${value}`} className="text-sm cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* AI Opt-in Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">AI Automation</Label>
          <Select
            value={filters.aiOptIn === null ? 'all' : filters.aiOptIn ? 'enabled' : 'disabled'}
            onValueChange={(value) => 
              onFiltersChange({ 
                aiOptIn: value === 'all' ? null : value === 'enabled' 
              })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conversations</SelectItem>
              <SelectItem value="enabled">AI Enabled</SelectItem>
              <SelectItem value="disabled">AI Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Priority</Label>
          <Select
            value={filters.priority || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ priority: value === 'all' ? null : value })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority Levels</SelectItem>
              {priorityOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assignment Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Assignment</Label>
          <Select
            value={filters.assigned || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ assigned: value === 'all' ? null : value })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conversations</SelectItem>
              {assignedOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message Direction Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Message Direction</Label>
          <Select
            value={filters.messageDirection || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ messageDirection: value === 'all' ? null : value })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Messages</SelectItem>
              {messageDirectionOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedFiltersSection;
