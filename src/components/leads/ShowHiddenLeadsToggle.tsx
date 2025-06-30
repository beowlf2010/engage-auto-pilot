
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';

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
  if (hiddenCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3">
      <div className="flex items-center space-x-2">
        <EyeOff className="h-4 w-4 text-amber-600" />
        <span className="text-sm text-amber-800">
          {hiddenCount} lead{hiddenCount > 1 ? 's' : ''} hidden
        </span>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onToggle(!showHidden)}
        className="border-amber-300 text-amber-700 hover:bg-amber-100"
      >
        {showHidden ? (
          <>
            <EyeOff className="h-4 w-4 mr-1" />
            Hide Hidden Leads
          </>
        ) : (
          <>
            <Eye className="h-4 w-4 mr-1" />
            Show Hidden Leads
          </>
        )}
        {hiddenCount > 0 && (
          <Badge variant="secondary" className="ml-2">
            {hiddenCount}
          </Badge>
        )}
      </Button>
    </div>
  );
};

export default ShowHiddenLeadsToggle;
