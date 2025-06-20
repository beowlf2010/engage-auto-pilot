
import React from 'react';
import { Button } from '@/components/ui/button';
import { Send, X, Loader2, MessageSquare } from 'lucide-react';

interface AIPreviewActionsProps {
  generatedMessage: string | null;
  isGenerating: boolean;
  isSending: boolean;
  onSend?: () => void;
  onCancel: () => void;
  onGenerate?: () => void;
}

const AIPreviewActions: React.FC<AIPreviewActionsProps> = ({
  generatedMessage,
  isGenerating,
  isSending,
  onSend,
  onCancel,
  onGenerate
}) => {
  if (!isGenerating && generatedMessage) {
    return (
      <div className="flex gap-2">
        <Button 
          onClick={onSend}
          disabled={isSending}
          className="flex-1"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send & Enable AI
            </>
          )}
        </Button>
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isSending}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    );
  }

  if (!isGenerating && !generatedMessage && onGenerate) {
    return (
      <div className="flex gap-2">
        <Button 
          onClick={onGenerate}
          className="flex-1"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Generate Message
        </Button>
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return null;
};

export default AIPreviewActions;
