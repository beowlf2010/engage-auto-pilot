
import React from 'react';
import { Button } from '@/components/ui/button';
import { Send, RefreshCcw, AlertTriangle } from 'lucide-react';

interface MessagePreviewActionsProps {
  message: string;
  loading: boolean;
  sending: boolean;
  regenerating: boolean;
  error: string;
  onSendNow: () => void;
  onRegenerate: () => void;
  onFlagIssue: () => void;
}

const MessagePreviewActions = ({
  message,
  loading,
  sending,
  regenerating,
  error,
  onSendNow,
  onRegenerate,
  onFlagIssue
}: MessagePreviewActionsProps) => {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={onSendNow}
        disabled={!message || loading || sending || error}
        className="flex-1"
      >
        <Send className="w-3 h-3 mr-1" />
        {sending ? 'Sending...' : 'Send Now'}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onRegenerate}
        disabled={loading || regenerating || sending}
      >
        <RefreshCcw className="w-3 h-3 mr-1" />
        Regenerate
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onFlagIssue}
        disabled={loading || regenerating || sending}
      >
        <AlertTriangle className="w-3 h-3 mr-1" />
        Flag Issue
      </Button>
    </div>
  );
};

export default MessagePreviewActions;
