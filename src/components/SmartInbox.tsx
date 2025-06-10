
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, 
  Bot, 
  User, 
  Clock,
  Phone,
  Car,
  MessageSquare
} from "lucide-react";

interface SmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const SmartInbox = ({ user }: SmartInboxProps) => {
  const [selectedLead, setSelectedLead] = useState(1);
  const [newMessage, setNewMessage] = useState("");

  // Mock conversations data
  const conversations = [
    {
      leadId: 1,
      leadName: "Sarah Johnson",
      leadPhone: "+1-555-0123",
      vehicleInterest: "Tesla Model 3",
      unreadCount: 2,
      lastMessage: "What are the financing options?",
      lastMessageTime: "2:30 PM",
      status: "engaged",
      salespersonId: "1"
    },
    {
      leadId: 2,
      leadName: "Mike Chen", 
      leadPhone: "+1-555-0124",
      vehicleInterest: "BMW X5",
      unreadCount: 0,
      lastMessage: "Thanks for the information!",
      lastMessageTime: "11:45 AM",
      status: "engaged",
      salespersonId: "2"
    },
    {
      leadId: 3,
      leadName: "Emma Wilson",
      leadPhone: "+1-555-0125", 
      vehicleInterest: "Audi A4",
      unreadCount: 1,
      lastMessage: "When can I schedule a test drive?",
      lastMessageTime: "Yesterday",
      status: "new",
      salespersonId: "1"
    }
  ];

  const messages = [
    {
      id: 1,
      leadId: 1,
      direction: "in",
      body: "Hi! I'm interested in the Tesla Model 3. Can you tell me more about it?",
      sentAt: "2024-06-10 09:30:00",
      aiGenerated: false
    },
    {
      id: 2,
      leadId: 1,
      direction: "out", 
      body: "Hello Sarah! This is Finn, your Internet Sales Specialist. I'd be happy to help you with the Tesla Model 3. It's an excellent choice with amazing features like autopilot, supercharging network access, and incredible efficiency. Would you like to schedule a test drive?\n\n- Finn, Internet Sales Specialist",
      sentAt: "2024-06-10 09:35:00",
      aiGenerated: true
    },
    {
      id: 3,
      leadId: 1,
      direction: "in",
      body: "That sounds great! What are the financing options?",
      sentAt: "2024-06-10 14:20:00",
      aiGenerated: false
    },
    {
      id: 4,
      leadId: 1,
      direction: "in",
      body: "Also, do you have any current promotions?",
      sentAt: "2024-06-10 14:22:00",
      aiGenerated: false
    }
  ];

  // Filter conversations based on user role
  const filteredConversations = conversations.filter(conv => 
    user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id
  );

  const selectedConversation = filteredConversations.find(conv => conv.leadId === selectedLead);
  const conversationMessages = messages.filter(msg => msg.leadId === selectedLead);

  const canReply = (conv: any) => {
    return user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id;
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation && canReply(selectedConversation)) {
      // In real app, this would send via API
      console.log("Sending message:", newMessage);
      setNewMessage("");
    }
  };

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
                  onClick={() => setSelectedLead(conv.leadId)}
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
                  <Button variant="outline" size="sm">
                    Toggle Finn AI
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${
                    message.direction === 'out' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-100 text-slate-800'
                  } rounded-lg p-3`}>
                    <p className="text-sm whitespace-pre-line">{message.body}</p>
                    <div className={`flex items-center justify-between mt-2 text-xs ${
                      message.direction === 'out' ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      <span>{new Date(message.sentAt).toLocaleTimeString()}</span>
                      {message.aiGenerated && (
                        <div className="flex items-center space-x-1">
                          <Bot className="w-3 h-3" />
                          <span>Finn</span>
                        </div>
                      )}
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
    </div>
  );
};

export default SmartInbox;
