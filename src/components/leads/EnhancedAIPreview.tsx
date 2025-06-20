
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, Clock, Send, X, Loader2 } from 'lucide-react';
import { useAIMessagePreview } from '@/hooks/useAIMessagePreview';

interface EnhancedAIPreviewProps {
  leadId: string;
  leadName: string;
  vehicleInterest?: string;
  isOpen: boolean;
  onClose: () => void;
  onAIEnabled: () => void;
  autoGenerate?: boolean;
}

const EnhancedAIPreview: React.FC<EnhancedAIPreviewProps> = ({
  leadId,
  leadName,
  vehicleInterest,
  isOpen,
  onClose,
  onAIEnabled,
  autoGenerate = false
}) => {
  const {
    isGenerating,
    generatedMessage,
    showPreview,
    isSending,
    generatePreview,
    sendNow,
    cancel
  } = useAIMessagePreview({ 
    leadId, 
    onMessageSent: () => {
      onAIEnabled();
      onClose();
    }
  });

  // Auto-generate message when modal opens if autoGenerate is true
  useEffect(() => {
    if (isOpen && autoGenerate && !isGenerating && !generatedMessage) {
      generatePreview();
    }
  }, [isOpen, autoGenerate, isGenerating, generatedMessage, generatePreview]);

  const handleSendMessage = async () => {
    await sendNow();
  };

  const handleCancel = () => {
    cancel();
    onClose();
  };

  // Calculate next message time (24 hours from now)
  const nextMessageTime = new Date();
  nextMessageTime.setHours(nextMessageTime.getHours() + 24);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            Enable AI for {leadName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isGenerating && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                <div className="text-sm text-gray-600">Generating personalized message...</div>
              </div>
            </div>
          )}

          {!isGenerating && generatedMessage && (
            <>
              {/* Message preview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    AI Generated Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                    <div className="text-sm">{generatedMessage}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Scheduling info */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900">
                        Next AI message scheduled for:
                      </div>
                      <div className="text-green-700">
                        {nextMessageTime.toLocaleDateString()} at{' '}
                        {nextMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleSendMessage}
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
                  onClick={handleCancel}
                  disabled={isSending}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          )}

          {!isGenerating && !generatedMessage && (
            <>
              {/* Introduction */}
              <div className="text-sm text-gray-600">
                Finn AI will send a personalized initial message to {leadName} 
                {vehicleInterest && ` about their interest in ${vehicleInterest}`}.
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={generatePreview}
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Generate Message
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedAIPreview;
