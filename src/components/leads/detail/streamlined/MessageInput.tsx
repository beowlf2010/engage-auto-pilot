
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
  return (
    <div className="border-t p-4">
      <div className="relative">
        <Textarea
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={onKeyPress}
          className="pr-14 min-h-[60px]"
          disabled={isSending}
        />
        <Button
          onClick={onSendMessage}
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
