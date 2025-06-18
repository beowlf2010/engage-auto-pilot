
import React from "react";

interface ChatMessagesProps {
  messages: any[];
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  return (
    <div className="space-y-4">
      {messages.map((message: any, index: number) => (
        <div
          key={message.id || index}
          className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.direction === 'out'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            <div className="text-sm">{message.body}</div>
            <div className="text-xs opacity-75 mt-1">
              {new Date(message.createdAt || message.created_at).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatMessages;
