
import React from 'react';
import { Button } from '@/components/ui/button';
import { Send, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    <div className="space-y-3">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">Failed to send AI reply:</div>
              <div className="text-sm">{error}</div>
              {error.includes('phone number') && (
                <div className="text-xs text-muted-foreground">
                  Make sure the lead has a valid phone number configured.
                </div>
              )}
              {error.includes('blocked') && (
                <div className="text-xs text-muted-foreground">
                  The message was blocked due to compliance rules or suppression list.
                </div>
              )}
              {error.includes('emergency') && (
                <div className="text-xs text-muted-foreground">
                  AI messaging system is currently disabled for safety.
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onSendNow}
          disabled={!message || loading || sending || !!error}
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
          {regenerating ? 'Regenerating...' : 'Regenerate'}
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

      {/* Status Messages */}
      {loading && !error && (
        <div className="text-sm text-muted-foreground flex items-center">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>
          Generating AI response...
        </div>
      )}
      
      {sending && (
        <div className="text-sm text-blue-600 flex items-center">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
          Sending message to lead...
        </div>
      )}
    </div>
  );
};

export default MessagePreviewActions;
