
import { Bot } from "lucide-react";
import FinnAvatar from "../FinnAvatar";
import SMSStatusIcon from "./SMSStatusIcon";

interface Message {
  id: string;
  direction: 'in' | 'out';
  body: string;
  sentAt: string;
  aiGenerated?: boolean;
  smsStatus?: string;
  smsError?: string;
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  return (
    <div className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
      <div className="flex items-start space-x-2 max-w-[70%]">
        {message.direction === 'out' && message.aiGenerated && (
          <FinnAvatar size="sm" />
        )}
        <div className={`${
          message.direction === 'out' 
            ? 'bg-blue-500 text-white' 
            : 'bg-slate-100 text-slate-800'
        } rounded-lg p-3`}>
          <p className="text-sm whitespace-pre-line">{message.body}</p>
          <div className={`flex items-center justify-between mt-2 text-xs ${
            message.direction === 'out' ? 'text-blue-100' : 'text-slate-500'
          }`}>
            <span>{new Date(message.sentAt).toLocaleTimeString()}</span>
            <div className="flex items-center space-x-2">
              {message.aiGenerated && (
                <div className="flex items-center space-x-1">
                  <Bot className="w-3 h-3" />
                  <span>Finn</span>
                </div>
              )}
              {message.direction === 'out' && message.smsStatus && (
                <div className="flex items-center space-x-1">
                  <SMSStatusIcon status={message.smsStatus} error={message.smsError} />
                  <span className="text-xs">SMS</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
