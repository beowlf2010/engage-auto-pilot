
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bug, Eye, EyeOff } from 'lucide-react';

interface MessageDebugPanelProps {
  messages: any[];
  visible: boolean;
  onToggle: () => void;
}

const MessageDebugPanel: React.FC<MessageDebugPanelProps> = ({
  messages,
  visible,
  onToggle
}) => {
  if (!visible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50"
      >
        <Bug className="h-4 w-4 mr-1" />
        Debug
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 max-h-96 z-50 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Debug Panel</CardTitle>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          <EyeOff className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0 overflow-y-auto max-h-64">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Messages:</span>
            <Badge variant="outline">{messages.length}</Badge>
          </div>
          
          {messages.slice(0, 5).map((message, index) => (
            <div key={message.id || index} className="text-xs p-2 bg-muted rounded">
              <div className="flex items-center justify-between mb-1">
                <Badge variant={message.direction === 'out' ? 'default' : 'secondary'}>
                  {message.direction}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(message.sent_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="truncate">{message.body}</p>
            </div>
          ))}
          
          {messages.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              ... and {messages.length - 5} more
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MessageDebugPanel;
