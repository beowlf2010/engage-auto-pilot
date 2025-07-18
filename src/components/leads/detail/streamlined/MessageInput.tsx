
import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isSending: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  onKeyPress,
  isSending
}) => {
  const handleSendClick = () => {
    console.log('🔍 [MESSAGE INPUT] Send button clicked');
    console.log('🔍 [MESSAGE INPUT] Message:', newMessage);
    console.log('🔍 [MESSAGE INPUT] isSending:', isSending);
    console.log('🔍 [MESSAGE INPUT] onSendMessage type:', typeof onSendMessage);
    
    if (!newMessage.trim()) {
      console.log('❌ [MESSAGE INPUT] Empty message, not sending');
      return;
    }
    
    if (isSending) {
      console.log('❌ [MESSAGE INPUT] Already sending, ignoring click');
      return;
    }
    
    console.log('✅ [MESSAGE INPUT] Calling onSendMessage...');
    try {
      onSendMessage();
    } catch (error) {
      console.error('❌ [MESSAGE INPUT] Error calling onSendMessage:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    console.log('🔍 [MESSAGE INPUT] Key pressed:', e.key, 'shiftKey:', e.shiftKey);
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('✅ [MESSAGE INPUT] Enter pressed, sending message');
      handleSendClick();
    } else {
      onKeyPress(e);
    }
  };

  return (
    <div className="border-t p-4">
      <div className="relative">
        <Textarea
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => {
            console.log('🔍 [MESSAGE INPUT] Message changed:', e.target.value);
            setNewMessage(e.target.value);
          }}
          onKeyPress={handleKeyPress}
          className="pr-14 min-h-[60px]"
          disabled={isSending}
        />
        <Button
          onClick={handleSendClick}
          disabled={!newMessage.trim() || isSending}
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
