
import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ShowHiddenLeadsToggleProps {
  showHidden: boolean;
  onToggle: (show: boolean) => void;
  hiddenCount: number;
}

const ShowHiddenLeadsToggle: React.FC<ShowHiddenLeadsToggleProps> = ({
  showHidden,
  onToggle,
  hiddenCount
}) => {
  if (hiddenCount === 0 && !showHidden) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={showHidden ? "default" : "outline"}
        size="sm"
        onClick={() => onToggle(!showHidden)}
        className="flex items-center gap-2"
      >
        {showHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {showHidden ? "Hide Hidden Leads" : "Show Hidden Leads"}
      </Button>
      {hiddenCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {hiddenCount} hidden
        </Badge>
      )}
    </div>
  );
};

export default ShowHiddenLeadsToggle;
