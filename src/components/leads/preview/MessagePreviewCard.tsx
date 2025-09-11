
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

interface MessagePreviewCardProps {
  generatedMessage: string;
}

const MessagePreviewCard: React.FC<MessagePreviewCardProps> = ({
  generatedMessage
}) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          AI Generated Message
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-3 rounded-lg border-l-4 border-primary">
          <div className="text-sm text-foreground">{generatedMessage}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MessagePreviewCard;
