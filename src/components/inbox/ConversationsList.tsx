
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Car, Plus, Brain, User } from "lucide-react";

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
  salespersonName?: string;
  aiOptIn?: boolean;
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
    <div className="h-full flex flex-col">
      <div className="bg-white border-b-2 border-slate-300 rounded-t-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-3 text-lg">
            <div className="bg-blue-600 p-1.5 rounded-md">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">Conversations</span>
            <Badge variant="secondary" className="bg-slate-200 text-slate-700 font-bold px-2">
              {conversations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {conversations.map((conv, index) => (
            <div
              key={conv.leadId}
              onClick={() => onSelectConversation(conv.leadId)}
              className={`p-4 cursor-pointer transition-all duration-200 border-b border-slate-200 hover:bg-blue-50 hover:shadow-md ${
                selectedLead === conv.leadId 
                  ? 'bg-blue-100 border-l-4 border-l-blue-600 shadow-inner' 
                  : index % 2 === 0 
                    ? 'bg-white' 
                    : 'bg-slate-25'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-bold text-slate-900 text-base truncate">{conv.leadName}</h4>
                    {conv.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs font-bold shadow-sm px-2 py-1">
                        {conv.unreadCount} new
                      </Badge>
                    )}
                    {conv.aiOptIn && (
                      <Badge variant="outline" className="text-xs flex items-center space-x-1 bg-purple-100 text-purple-800 border-purple-300 font-semibold px-2 py-1">
                        <Brain className="w-3 h-3" />
                        <span>Finn</span>
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-slate-600 mb-2 font-medium">
                    <div className="bg-slate-100 p-1 rounded">
                      <Car className="w-3 h-3" />
                    </div>
                    <span className="truncate">{conv.vehicleInterest}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    {!conv.salespersonId ? (
                      <Badge variant="outline" className="text-xs flex items-center space-x-1 bg-orange-50 text-orange-700 border-orange-300 font-semibold">
                        <Plus className="w-3 h-3" />
                        <span>Unassigned</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs flex items-center space-x-1 bg-green-100 text-green-800 border-green-300 font-semibold">
                        <User className="w-3 h-3" />
                        <span>{conv.salespersonName || 'Assigned'}</span>
                      </Badge>
                    )}
                    
                    {!canReply(conv) && (
                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-300 font-medium">
                        View-only
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-700 font-medium truncate bg-slate-50 p-2 rounded border">
                    {conv.lastMessage}
                  </p>
                </div>
                
                <div className="text-xs text-slate-500 ml-3 font-medium bg-slate-100 px-2 py-1 rounded whitespace-nowrap">
                  {conv.lastMessageTime}
                </div>
              </div>
            </div>
          ))}
          
          {conversations.length === 0 && (
            <div className="flex items-center justify-center h-32 text-slate-500">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="font-medium">No conversations found</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsList;
