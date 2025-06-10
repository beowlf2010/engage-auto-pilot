
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Car, Brain, Send, User, MessageSquare } from "lucide-react";
import MessageBubble from "./MessageBubble";

interface Conversation {
  leadId: string;
  leadName: string;
  leadPhone: string;
  vehicleInterest: string;
  status: string;
  salespersonId: string;
}

interface Message {
  id: string;
  leadId: string;
  direction: 'in' | 'out';
  body: string;
  sentAt: string;
  aiGenerated?: boolean;
  smsStatus?: string;
  smsError?: string;
}

interface ChatViewProps {
  selectedConversation: Conversation | undefined;
  messages: Message[];
  canReply: (conv: Conversation) => boolean;
  onSendMessage: (message: string) => void;
  onToggleMemory: () => void;
}

const ChatView = ({ 
  selectedConversation, 
  messages, 
  canReply, 
  onSendMessage, 
  onToggleMemory 
}: ChatViewProps) => {
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation && canReply(selectedConversation)) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  if (!selectedConversation) {
    return (
      <Card className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
          <p>Choose a lead from the left to start messaging</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex-1 flex flex-col">
      {/* Chat Header */}
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback className="bg-blue-100 text-blue-800">
                {selectedConversation.leadName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-slate-800">
                {selectedConversation.leadName}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <span className="flex items-center space-x-1">
                  <Phone className="w-3 h-3" />
                  <span>{selectedConversation.leadPhone}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Car className="w-3 h-3" />
                  <span>{selectedConversation.vehicleInterest}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={selectedConversation.status === 'engaged' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
              {selectedConversation.status}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onToggleMemory}
            >
              <Brain className="w-4 h-4 mr-1" />
              Finn's Memory
            </Button>
            <Button variant="outline" size="sm">
              Toggle Finn AI
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </CardContent>

      {/* Message Input */}
      <div className="border-t border-slate-200 p-4">
        {canReply(selectedConversation) ? (
          <div className="flex space-x-2">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500">
            <User className="w-6 h-6 mx-auto mb-2" />
            <p>You can only view this conversation</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ChatView;
