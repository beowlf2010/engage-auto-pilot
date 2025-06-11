
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Car, Brain, Send, User, MessageSquare, Plus, Loader2 } from "lucide-react";
import MessageBubble from "./MessageBubble";
import { toggleFinnAI } from "@/services/finnAIService";

interface Conversation {
  leadId: string;
  leadName: string;
  leadPhone: string;
  vehicleInterest: string;
  status: string;
  salespersonId: string;
  salespersonName?: string;
  aiOptIn?: boolean;
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
  const [sending, setSending] = useState(false);
  const [togglingAI, setTogglingAI] = useState(false);
  const [localAiOptIn, setLocalAiOptIn] = useState(selectedConversation?.aiOptIn || false);

  // Update local state when conversation changes
  useState(() => {
    setLocalAiOptIn(selectedConversation?.aiOptIn || false);
  }, [selectedConversation?.aiOptIn]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedConversation && canReply(selectedConversation)) {
      setSending(true);
      try {
        await onSendMessage(newMessage);
        setNewMessage("");
      } finally {
        setSending(false);
      }
    }
  };

  const handleFinnAIToggle = async () => {
    if (!selectedConversation || !canReply(selectedConversation)) return;
    
    setTogglingAI(true);
    
    const result = await toggleFinnAI(selectedConversation.leadId, localAiOptIn);
    
    if (result.success) {
      setLocalAiOptIn(result.newState);
    }
    
    setTogglingAI(false);
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

  const userCanReply = canReply(selectedConversation);
  const isUnassigned = !selectedConversation.salespersonId;

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
              {selectedConversation.salespersonName && (
                <div className="text-xs text-slate-500 mt-1">
                  Assigned to: {selectedConversation.salespersonName}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={selectedConversation.status === 'engaged' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
              {selectedConversation.status}
            </Badge>
            {isUnassigned && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Plus className="w-3 h-3" />
                <span>Unassigned</span>
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={onToggleMemory}
            >
              <Brain className="w-4 h-4 mr-1" />
              Finn's Memory
            </Button>
            <Button 
              variant={localAiOptIn ? "destructive" : "outline"} 
              size="sm"
              onClick={handleFinnAIToggle}
              disabled={!userCanReply || togglingAI}
            >
              {togglingAI ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-1" />
                  {localAiOptIn ? "Disable" : "Enable"} Finn
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation by sending a message below</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </CardContent>

      <div className="border-t border-slate-200 p-4">
        {userCanReply ? (
          <div className="space-y-2">
            {isUnassigned && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>This lead will be assigned to you when you send the first message.</span>
                </div>
              </div>
            )}
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
                disabled={sending}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-6"
              >
                {sending ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500">
            <User className="w-6 h-6 mx-auto mb-2" />
            <p>You can only view this conversation</p>
            <p className="text-sm mt-1">This lead is assigned to {selectedConversation.salespersonName || 'another salesperson'}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ChatView;
