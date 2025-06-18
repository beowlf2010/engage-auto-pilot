
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import ChatMessages from "./ChatMessages";
import MessageInput from "./MessageInput";
import type { LeadDetailData } from "@/services/leadDetailService";

interface ChatContainerProps {
  lead: LeadDetailData;
  primaryPhone: string;
  messages: any[];
  messagesLoading: boolean;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  isSending: boolean;
  unreadCount?: number;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  lead,
  primaryPhone,
  messages,
  messagesLoading,
  newMessage,
  setNewMessage,
  onSendMessage,
  isSending,
  unreadCount = 0
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      {/* Chat Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {lead.firstName} {lead.lastName}
            </h1>
            <p className="text-sm text-gray-500">{primaryPhone}</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading messages...</span>
          </div>
        ) : (
          <ChatMessages messages={messages} />
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={onSendMessage}
        onKeyPress={handleKeyPress}
        isSending={isSending}
      />
    </Card>
  );
};

export default ChatContainer;
