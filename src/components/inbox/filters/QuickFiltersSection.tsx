
import React from 'react';
import { InboxFilters } from '@/hooks/useInboxFilters';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickFiltersSectionProps {
  filters: InboxFilters;
  onFiltersChange: (filters: Partial<InboxFilters>) => void;
}

const QuickFiltersSection: React.FC<QuickFiltersSectionProps> = ({
  filters,
  onFiltersChange
}) => {
  const quickFilters = [
    { key: 'unreadOnly', label: 'Unread Only', description: 'Show only conversations with unread messages' },
    { key: 'assignedToMe', label: 'Assigned to Me', description: 'Show only conversations assigned to you' },
    { key: 'unassigned', label: 'Unassigned', description: 'Show only unassigned conversations' },
    { key: 'lostLeads', label: 'Lost Leads', description: 'Show only lost lead conversations' },
    { key: 'aiPaused', label: 'AI Paused', description: 'Show only conversations with paused AI' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {quickFilters.map(({ key, label, description }) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={key}
                checked={filters[key as keyof InboxFilters] as boolean}
                onCheckedChange={(checked) => 
                  onFiltersChange({ [key]: checked })
                }
              />
              <Label
                htmlFor={key}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                title={description}
              >
                {label}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickFiltersSection;
