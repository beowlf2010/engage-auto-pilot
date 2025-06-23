
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Zap, Eye } from 'lucide-react';

interface AIResponseIndicatorProps {
  isGenerating?: boolean;
  onManualTrigger?: () => void;
  canTrigger?: boolean;
  hasPreview?: boolean;
  onViewPreview?: () => void;
}

const AIResponseIndicator: React.FC<AIResponseIndicatorProps> = ({
  isGenerating = false,
  onManualTrigger,
  canTrigger = false,
  hasPreview = false,
  onViewPreview
}) => {
  if (isGenerating) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Finn is thinking...
      </Badge>
    );
  }

  if (hasPreview && onViewPreview) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onViewPreview}
        className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
      >
        <Eye className="h-3 w-3 mr-1" />
        View Response
      </Button>
    );
  }

  if (canTrigger && onManualTrigger) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onManualTrigger}
        className="h-6 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
      >
        <Zap className="h-3 w-3 mr-1" />
        Ask Finn
      </Button>
    );
  }

  return (
    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
      <Brain className="h-3 w-3 mr-1" />
      Finn Active
    </Badge>
  );
};

export default AIResponseIndicator;
