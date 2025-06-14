
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  ai_stage: string;
  next_ai_send_at?: string;
  last_reply_at?: string;
  ai_opt_in: boolean;
}

interface Message {
  id: string;
  body: string;
  direction: string;
  sent_at: string;
}

interface MessageThreadProps {
  lead: Lead | null;
  messages: Message[];
  onClose: () => void;
  onSendMessage: (message: string) => void;
  onApproveAI: () => void;
  onToggleAI: () => void;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  lead,
  messages,
  onClose,
  onSendMessage,
  onApproveAI,
  onToggleAI
}) => {
  const [replyText, setReplyText] = useState('');

  const handleSend = () => {
    if (!replyText.trim()) return;
    onSendMessage(replyText);
    setReplyText('');
  };

  return (
    <div className="space-y-4">
      {lead && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Messages with {lead.first_name} {lead.last_name}
            </h3>
            <div className="text-sm text-gray-600">
              Phone: {lead.phone}
            </div>
          </div>

          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2 p-4 bg-gray-50 rounded-lg">
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg max-w-xs ${
                      message.direction === 'out'
                        ? 'bg-blue-500 text-white ml-auto'
                        : 'bg-white text-slate-900 border'
                    }`}
                  >
                    <div className="text-sm">{message.body}</div>
                    <div className={`text-xs mt-1 ${
                      message.direction === 'out' ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      {new Date(message.sent_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start a conversation!
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your message..."
                rows={3}
                className="w-full"
              />
              
              <div className="flex justify-between items-center">
                <div className="space-x-2">
                  <Button
                    onClick={onApproveAI}
                    variant="outline"
                    size="sm"
                  >
                    Approve Next AI
                  </Button>
                  <Button
                    onClick={onToggleAI}
                    variant="outline"
                    size="sm"
                  >
                    {lead?.ai_opt_in ? 'Pause AI' : 'Enable AI'}
                  </Button>
                </div>
                <Button 
                  onClick={handleSend} 
                  disabled={!replyText.trim()}
                  className="px-6"
                >
                  Send Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageThread;
