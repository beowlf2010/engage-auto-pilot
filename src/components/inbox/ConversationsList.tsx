
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Car } from "lucide-react";

interface Conversation {
  leadId: string;
  leadName: string;
  leadPhone: string;
  vehicleInterest: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  status: string;
  salespersonId: string;
}

interface ConversationsListProps {
  conversations: Conversation[];
  selectedLead: string | null;
  onSelectConversation: (leadId: string) => void;
  canReply: (conv: Conversation) => boolean;
}

const ConversationsList = ({ 
  conversations, 
  selectedLead, 
  onSelectConversation, 
  canReply 
}: ConversationsListProps) => {
  return (
    <div className="w-80 flex flex-col">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Conversations</span>
            <Badge variant="secondary">{conversations.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.leadId}
                onClick={() => onSelectConversation(conv.leadId)}
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
  );
};

export default ConversationsList;
