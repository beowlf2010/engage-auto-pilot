
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, RefreshCw, X, Sparkles, AlertCircle } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateMessage = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      console.log('🚀 Starting AI message generation for lead:', leadId);
      
      const message = await generateEnhancedAIMessage(leadId);
      
      if (message) {
        setGeneratedMessage(message);
        setIsEditing(true);
        console.log('✅ Message generated and ready for editing');
      } else {
        setError("Failed to generate message. This could be due to:\n• Missing OpenAI API key\n• Quality control restrictions\n• Rate limiting\n• Lead data issues");
        console.log('❌ No message generated - check logs for details');
      }
    } catch (error) {
      console.error('💥 Error in handleGenerateMessage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Generation failed: ${errorMessage}`);
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = () => {
    if (generatedMessage.trim()) {
      console.log('📤 Sending AI generated message');
      onSendMessage(generatedMessage.trim());
      onClose();
    }
  };

  const handleRegenerate = () => {
    setGeneratedMessage('');
    setIsEditing(false);
    setError(null);
    handleGenerateMessage();
  };

  const handleReset = () => {
    setGeneratedMessage('');
    setIsEditing(false);
    setError(null);
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

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800 whitespace-pre-line">{error}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="mt-2 text-red-700 border-red-300 hover:bg-red-50"
            >
              Try Again
            </Button>
          </div>
        )}

        {!isEditing && !error ? (
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
        ) : isEditing ? (
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
        ) : null}
      </CardContent>
    </Card>
  );
};

export default AIMessageGenerator;
