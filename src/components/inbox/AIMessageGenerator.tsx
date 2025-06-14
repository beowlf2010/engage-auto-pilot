
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, RefreshCw, X, Sparkles } from 'lucide-react';
import { generateEnhancedAIMessage } from '@/services/enhancedAIMessageService';
import { useToast } from '@/hooks/use-toast';

interface AIMessageGeneratorProps {
  leadId: string;
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

const AIMessageGenerator = ({ leadId, onSendMessage, onClose }: AIMessageGeneratorProps) => {
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const handleGenerateMessage = async () => {
    try {
      setIsGenerating(true);
      const message = await generateEnhancedAIMessage(leadId);
      
      if (message) {
        setGeneratedMessage(message);
        setIsEditing(true);
        toast({
          title: "AI Message Generated",
          description: "Review and edit the message before sending",
        });
      } else {
        toast({
          title: "Unable to Generate",
          description: "AI message generation was blocked by quality controls",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating AI message:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate AI message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = () => {
    if (generatedMessage.trim()) {
      onSendMessage(generatedMessage.trim());
      onClose();
    }
  };

  const handleRegenerate = () => {
    setGeneratedMessage('');
    setIsEditing(false);
    handleGenerateMessage();
  };

  return (
    <Card className="border-2 border-purple-200 bg-purple-50 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600 p-1.5 rounded">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold text-purple-800">AI Message Generator</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-purple-600 hover:text-purple-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!isEditing ? (
          <div className="text-center py-6">
            <div className="bg-purple-100 p-3 rounded-full w-fit mx-auto mb-4">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-purple-700 mb-4">
              Generate an intelligent, contextual response for this conversation
            </p>
            <Button
              onClick={handleGenerateMessage}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Generate AI Message
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-purple-800 mb-2 block">
                Generated Message (you can edit):
              </label>
              <Textarea
                value={generatedMessage}
                onChange={(e) => setGeneratedMessage(e.target.value)}
                className="min-h-[100px] border-purple-200 focus:border-purple-500"
                placeholder="AI generated message will appear here..."
              />
              <div className="text-xs text-purple-600 mt-1">
                {generatedMessage.length}/160 characters
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSendMessage}
                disabled={!generatedMessage.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button
                onClick={handleRegenerate}
                variant="outline"
                disabled={isGenerating}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIMessageGenerator;
