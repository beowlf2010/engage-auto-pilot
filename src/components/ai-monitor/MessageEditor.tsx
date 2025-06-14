
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Clock } from 'lucide-react';

interface MessageEditorProps {
  generatedMessage: string;
  editedMessage: string;
  setEditedMessage: (message: string) => void;
  generating: boolean;
  qualityScore: number;
}

const MessageEditor = ({ 
  generatedMessage, 
  editedMessage, 
  setEditedMessage, 
  generating, 
  qualityScore 
}: MessageEditorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          Generated Message
          <div className="flex items-center gap-2">
            <Badge variant={qualityScore >= 80 ? 'default' : qualityScore >= 60 ? 'secondary' : 'destructive'}>
              Quality: {qualityScore}%
            </Badge>
            <Badge variant="outline">
              {(editedMessage || generatedMessage).length}/160
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {generating ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            Generating message...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded">
              <p className="text-sm font-medium mb-1">Original Generated:</p>
              <p>{generatedMessage}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Edit Message (Optional):
              </label>
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="min-h-[100px]"
                placeholder="Edit the message if needed..."
              />
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Keep under 160 characters for SMS</p>
              <p>• Include lead's name for personalization</p>
              <p>• Add clear call-to-action</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MessageEditor;
