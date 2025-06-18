
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Send, Sparkles, Calendar } from 'lucide-react';

interface ChatMessageInputProps {
  newMessage: string;
  isSending: boolean;
  canReply: boolean;
  onMessageChange: (message: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onToggleAI: () => void;
  onToggleTemplates: () => void;
  onScheduleAppointment?: () => void;
}

const ChatMessageInput = ({
  newMessage,
  isSending,
  canReply,
  onMessageChange,
  onSend,
  onKeyPress,
  onToggleAI,
  onToggleTemplates,
  onScheduleAppointment
}: ChatMessageInputProps) => {
  if (!canReply) {
    return (
      <div className="p-4 bg-slate-50 border-t">
        <p className="text-sm text-slate-600 text-center">
          You can only view this conversation. Contact your manager for lead assignment.
        </p>
      </div>
    );
  }

  return (
    <>
      <Separator />
      <div className="p-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              placeholder="Type your message... (Shift+Enter for new line)"
              value={newMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={onKeyPress}
              className="min-h-[60px] resize-none"
              maxLength={160}
              disabled={isSending}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-slate-500">
                {newMessage.length}/160 characters
              </div>
              <div className="flex items-center gap-2">
                {onScheduleAppointment && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onScheduleAppointment}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    disabled={isSending}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Schedule
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleAI}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  disabled={isSending}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  AI Generate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleTemplates}
                  disabled={isSending}
                >
                  Templates
                </Button>
                <Button
                  onClick={onSend}
                  disabled={!newMessage.trim() || isSending}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-1" />
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatMessageInput;
