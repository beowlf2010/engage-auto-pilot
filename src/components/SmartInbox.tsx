import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import FinnAvatar from "./FinnAvatar";
import ConversationMemory from "./ConversationMemory";
import { useConversations } from "@/hooks/useConversations";
import { 
  Send, 
  Bot, 
  User, 
  Clock,
  Phone,
  Car,
  MessageSquare,
  Brain,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";

interface SmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const SmartInbox = ({ user }: SmartInboxProps) => {
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showMemory, setShowMemory] = useState(false);
  const { conversations, messages, loading, fetchMessages, sendMessage } = useConversations();

  // Filter conversations based on user role
  const filteredConversations = conversations.filter(conv => 
    user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id
  );

  const selectedConversation = filteredConversations.find(conv => conv.leadId === selectedLead);

  const canReply = (conv: any) => {
    return user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id;
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedConversation && canReply(selectedConversation)) {
      await sendMessage(selectedLead!, newMessage);
      setNewMessage("");
    }
  };

  const handleSelectConversation = (leadId: string) => {
    setSelectedLead(leadId);
    fetchMessages(leadId);
  };

  const getSMSStatusIcon = (status: string, error?: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return <AlertCircle className="w-3 h-3 text-gray-500" />;
    }
  };

  useEffect(() => {
    if (filteredConversations.length > 0 && !selectedLead) {
      const firstConv = filteredConversations[0];
      handleSelectConversation(firstConv.leadId);
    }
  }, [filteredConversations, selectedLead]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex space-x-6">
      {/* Conversations List */}
      <div className="w-80 flex flex-col">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Conversations</span>
              <Badge variant="secondary">{filteredConversations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.leadId}
                  onClick={() => handleSelectConversation(conv.leadId)}
                  className={`p-4 cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    selectedLead === conv.leadId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-slate-800">{conv.leadName}</h4>
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                        {!canReply(conv) && (
                          <Badge variant="secondary" className="text-xs">
                            View-only
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                        <Car className="w-3 h-3" />
                        <span>{conv.vehicleInterest}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 truncate">
                        {conv.lastMessage}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 ml-2">
                      {conv.lastMessageTime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
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
                    onClick={() => setShowMemory(!showMemory)}
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
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                >
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
                              {getSMSStatusIcon(message.smsStatus, message.smsError)}
                              <span className="text-xs">SMS</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a lead from the left to start messaging</p>
            </div>
          </Card>
        )}
      </div>

      {/* Finn's Memory Panel */}
      {showMemory && selectedLead && (
        <ConversationMemory leadId={parseInt(selectedLead)} />
      )}
    </div>
  );
};

export default SmartInbox;
