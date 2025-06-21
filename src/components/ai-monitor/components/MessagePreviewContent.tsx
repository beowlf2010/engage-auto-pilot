
import React from 'react';
import { getDisplayMessage } from '../utils/messagePreviewUtils';

interface MessagePreviewContentProps {
  loading: boolean;
  isInitialContact: boolean;
  error: string;
  message: string;
}

const MessagePreviewContent = ({ loading, isInitialContact, error, message }: MessagePreviewContentProps) => {
  if (loading) {
    return (
      <div className="text-sm text-muted-foreground italic">
        {isInitialContact ? 'Generating warm introduction from Finn at Jason Pilger Chevrolet...' : 'Generating follow-up message...'}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          Error: {error}
        </div>
        <div className="bg-muted p-3 rounded text-sm">
          <strong>Fallback Message:</strong><br />
          {getDisplayMessage(message)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted p-3 rounded text-sm">
      {getDisplayMessage(message)}
    </div>
  );
};

export default MessagePreviewContent;
