
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Send, Edit3, X, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { consolidatedSendMessage } from '@/services/consolidatedMessagesService';
import { toast } from '@/hooks/use-toast';

interface AIResponsePreviewProps {
  leadId: string;
  preview: {
    message: string;
    confidence: number;
    reasoning: string;
    leadName: string;
    context: any;
  };
  profileId: string;
  onSent?: () => void;
  onDismiss?: () => void;
  onFeedback?: (feedback: 'positive' | 'negative', notes?: string) => void;
}

const AIResponsePreview: React.FC<AIResponsePreviewProps> = ({
  leadId,
  preview,
  profileId,
  onSent,
  onDismiss,
  onFeedback
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(preview.message);
  const [isSending, setIsSending] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleSend = async (messageToSend: string = editedMessage) => {
    setIsSending(true);
    try {
      const result = await consolidatedSendMessage({
        leadId,
        messageBody: messageToSend,
        profileId,
        isAIGenerated: true
      });

      if (result.success) {
        toast({
          title: "Message Sent",
          description: `AI response sent to ${preview.leadName}`,
        });
        onSent?.();
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send AI response:', error);
      toast({
        title: "Error",
        description: "Failed to send AI response",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    // Could capture this as learning data
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    // This would trigger a new AI generation
    setTimeout(() => {
      setIsRegenerating(false);
      toast({
        title: "Response Regenerated",
        description: "New AI response generated",
      });
    }, 2000);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-blue-600" />
            <span>Finn's Response for {preview.leadName}</span>
            <Badge className={getConfidenceColor(preview.confidence)}>
              {Math.round(preview.confidence * 100)}% confidence
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Message Preview/Editor */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600">Proposed Response:</div>
          {isEditing ? (
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              className="min-h-[80px] bg-white"
              placeholder="Edit the AI response..."
            />
          ) : (
            <div className="bg-white p-3 rounded border text-sm">
              {editedMessage}
            </div>
          )}
        </div>

        {/* AI Reasoning */}
        <div className="text-xs text-gray-600">
          <span className="font-medium">AI Reasoning:</span> {preview.reasoning}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSaveEdit} size="sm">
                Save Changes
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={() => handleSend()} 
                size="sm"
                disabled={isSending}
                className="flex items-center gap-1"
              >
                <Send className="h-3 w-3" />
                {isSending ? 'Sending...' : 'Send'}
              </Button>
              
              <Button 
                onClick={handleEdit} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1"
              >
                <Edit3 className="h-3 w-3" />
                Edit
              </Button>
              
              <Button 
                onClick={handleRegenerate} 
                variant="outline" 
                size="sm"
                disabled={isRegenerating}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                {isRegenerating ? 'Generating...' : 'Regenerate'}
              </Button>
            </>
          )}
        </div>

        {/* Feedback Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <div className="text-xs text-gray-600">Response quality:</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFeedback?.('positive')}
            className="h-6 px-2 text-green-600 hover:text-green-700"
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFeedback?.('negative')}
            className="h-6 px-2 text-red-600 hover:text-red-700"
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIResponsePreview;
