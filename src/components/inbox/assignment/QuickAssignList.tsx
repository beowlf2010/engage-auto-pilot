import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QuickAssignListProps {
  conversations: any[];
  salespeople: Array<{
    id: string;
    name: string;
  }>;
  onQuickAssign: (leadId: string, salespersonId: string) => void;
  maxItems?: number;
}

export const QuickAssignList: React.FC<QuickAssignListProps> = ({
  conversations,
  salespeople,
  onQuickAssign,
  maxItems = 3
}) => (
  <div className="space-y-2">
    <h4 className="text-xs font-medium text-slate-600 mb-2">Quick Assign</h4>
    {conversations.slice(0, maxItems).map(conversation => (
      <div key={conversation.leadId} className="flex items-center justify-between p-2 bg-white rounded border">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{conversation.leadName}</p>
          <p className="text-xs text-slate-500 truncate">{conversation.vehicleInterest}</p>
        </div>
        <Select onValueChange={(value) => onQuickAssign(conversation.leadId, value)}>
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="Assign" />
          </SelectTrigger>
          <SelectContent>
            {salespeople.map(person => (
              <SelectItem key={person.id} value={person.id}>
                {person.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ))}
    
    {conversations.length > maxItems && (
      <p className="text-xs text-slate-500 text-center py-2">
        +{conversations.length - maxItems} more unassigned leads
      </p>
    )}
  </div>
);