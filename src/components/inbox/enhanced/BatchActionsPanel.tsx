import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  CheckSquare,
  MessageSquare,
  UserPlus,
  Archive,
  Bot,
  Star,
  Trash2,
  Eye,
  EyeOff,
  Tag,
  Calendar,
  X
} from 'lucide-react';

interface BatchActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchAction: (action: string, params?: any) => void;
  isAllSelected: boolean;
  isVisible: boolean;
}

export const BatchActionsPanel: React.FC<BatchActionsProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBatchAction,
  isAllSelected,
  isVisible
}) => {
  const [assignTo, setAssignTo] = useState<string>('');

  if (!isVisible) return null;

  const batchActions = [
    {
      id: 'mark_read',
      label: 'Mark as Read',
      icon: Eye,
      variant: 'outline' as const,
      description: 'Mark selected conversations as read'
    },
    {
      id: 'mark_unread',
      label: 'Mark as Unread',
      icon: EyeOff,
      variant: 'outline' as const,
      description: 'Mark selected conversations as unread'
    },
    {
      id: 'ai_enable',
      label: 'Enable AI',
      icon: Bot,
      variant: 'outline' as const,
      description: 'Enable AI responses for selected leads'
    },
    {
      id: 'ai_disable',
      label: 'Disable AI',
      icon: Bot,
      variant: 'outline' as const,
      description: 'Disable AI responses for selected leads'
    },
    {
      id: 'set_priority',
      label: 'Set Priority',
      icon: Star,
      variant: 'outline' as const,
      description: 'Mark selected conversations as high priority'
    },
    {
      id: 'schedule_followup',
      label: 'Schedule Follow-up',
      icon: Calendar,
      variant: 'outline' as const,
      description: 'Schedule follow-up for selected conversations'
    },
    {
      id: 'add_tags',
      label: 'Add Tags',
      icon: Tag,
      variant: 'outline' as const,
      description: 'Add tags to selected conversations'
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      variant: 'outline' as const,
      description: 'Archive selected conversations'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive' as const,
      description: 'Permanently delete selected conversations'
    }
  ];

  const handleAction = (actionId: string) => {
    if (actionId === 'assign' && assignTo) {
      onBatchAction(actionId, { assignTo });
      setAssignTo('');
    } else {
      onBatchAction(actionId);
    }
  };

  return (
    <Card className="border-t-0 rounded-t-none bg-muted/30 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={isAllSelected ? onClearSelection : onSelectAll}
              className="h-8"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>
            
            <Badge variant="secondary" className="font-medium">
              {selectedCount} of {totalCount} selected
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="mb-4" />

        {/* Quick Actions */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              {batchActions.slice(0, 4).map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant={action.variant}
                    size="sm"
                    onClick={() => handleAction(action.id)}
                    className="h-8"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Assignment */}
          <div>
            <h4 className="text-sm font-medium mb-2">Assignment</h4>
            <div className="flex gap-2">
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger className="flex-1 h-8">
                  <SelectValue placeholder="Select salesperson..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="john">John Smith</SelectItem>
                  <SelectItem value="sarah">Sarah Johnson</SelectItem>
                  <SelectItem value="mike">Mike Wilson</SelectItem>
                  <SelectItem value="unassign">Unassign</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('assign')}
                disabled={!assignTo}
                className="h-8"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Assign
              </Button>
            </div>
          </div>

          {/* Advanced Actions */}
          <div>
            <h4 className="text-sm font-medium mb-2">Advanced Actions</h4>
            <div className="flex flex-wrap gap-2">
              {batchActions.slice(4).map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant={action.variant}
                    size="sm"
                    onClick={() => handleAction(action.id)}
                    className="h-8"
                    title={action.description}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};