
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { IssueType } from '../types/messagePreviewTypes';

interface IssueSelectorProps {
  showIssueSelector: boolean;
  selectedIssue: string;
  regenerating: boolean;
  issueTypes: IssueType[];
  onIssueChange: (value: string) => void;
  onRegenerateWithIssue: () => void;
  onCancel: () => void;
}

const IssueSelector = ({
  showIssueSelector,
  selectedIssue,
  regenerating,
  issueTypes,
  onIssueChange,
  onRegenerateWithIssue,
  onCancel
}: IssueSelectorProps) => {
  if (!showIssueSelector) return null;

  return (
    <div className="space-y-2 p-3 bg-yellow-50 rounded border">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="w-4 h-4 text-yellow-600" />
        What's the issue with this message?
      </div>
      <Select value={selectedIssue} onValueChange={onIssueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select issue type..." />
        </SelectTrigger>
        <SelectContent>
          {issueTypes.map((issue) => (
            <SelectItem key={issue.value} value={issue.value}>
              <div>
                <div className="font-medium">{issue.label}</div>
                <div className="text-xs text-muted-foreground">{issue.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onRegenerateWithIssue}
          disabled={!selectedIssue || regenerating}
        >
          {regenerating ? 'Regenerating...' : 'Regenerate with Context'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default IssueSelector;
