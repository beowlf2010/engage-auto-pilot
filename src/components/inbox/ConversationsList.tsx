
import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, MessageSquare, Clock, User, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import LeadScoreIndicator from './LeadScoreIndicator';
import EnhancedAIStatusDisplay from '../leads/EnhancedAIStatusDisplay';

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
  aiStage?: string;
  aiMessagesSent?: number;
  aiSequencePaused?: boolean;
  messageIntensity?: string;
  incomingCount?: number;
  outgoingCount?: number;
  lastMessageDate?: Date;
}

interface ConversationsListProps {
  conversations: Conversation[];
  selectedLead: string | null;
  onSelectConversation: (leadId: string) => void;
  canReply: (conversation: Conversation) => boolean;
}

const ConversationsList = ({
  conversations,
  selectedLead,
  onSelectConversation,
  canReply
}: ConversationsListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Mock AI scoring function - in real app this would come from AI service
  const getAIScore = (conversation: Conversation): number => {
    // Mock scoring based on conversation characteristics
    let score = 50;
    if (conversation.unreadCount > 0) score += 20;
    if (conversation.aiOptIn) score += 15;
    if (conversation.status === 'engaged') score += 10;
    if (conversation.vehicleInterest.toLowerCase().includes('luxury')) score += 5;
    return Math.min(score, 100);
  };

  const getTrend = (conversation: Conversation): 'up' | 'down' | 'stable' => {
    // Mock trend calculation
    if (conversation.unreadCount > 2) return 'up';
    if (conversation.unreadCount === 0) return 'down';
    return 'stable';
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.vehicleInterest.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort by latest activity - prioritize unread first, then by most recent message
  const sortedConversations = filteredConversations.sort((a, b) => {
    // Unread messages first (highest priority)
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    
    // Then by last message time (newest first) - this ensures latest activity is at top
    return (b.lastMessageDate?.getTime() || 0) - (a.lastMessageDate?.getTime() || 0);
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Conversations
          </h3>
          <Badge variant="outline">{conversations.length}</Badge>
        </div>
        
        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="engaged">Engaged</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
          {sortedConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedConversations.map((conversation) => {
                const isSelected = conversation.leadId === selectedLead;
                const aiScore = getAIScore(conversation);
                const trend = getTrend(conversation);
                
                return (
                  <div
                    key={conversation.leadId}
                    className={`p-3 border-b cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectConversation(conversation.leadId)}
                  >
                    <div className="space-y-2">
                      {/* Header with name and score */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">
                            {conversation.leadName}
                          </h4>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        
                        {conversation.aiOptIn && (
                          <LeadScoreIndicator 
                            score={aiScore} 
                            trend={trend}
                            showAI={true}
                            size="sm"
                          />
                        )}
                      </div>

                      {/* Vehicle interest and status */}
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs">
                          {conversation.vehicleInterest}
                        </Badge>
                        <Badge 
                          variant="secondary"
                          className={`text-xs ${
                            conversation.status === 'engaged' ? 'bg-green-100 text-green-800' :
                            conversation.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {conversation.status}
                        </Badge>
                      </div>

                      {/* Enhanced AI Status */}
                      {conversation.aiOptIn && (
                        <div className="flex items-center">
                          <EnhancedAIStatusDisplay
                            aiOptIn={conversation.aiOptIn}
                            messageIntensity={conversation.messageIntensity || 'gentle'}
                            aiMessagesSent={conversation.aiMessagesSent}
                            aiSequencePaused={conversation.aiSequencePaused}
                            incomingCount={conversation.incomingCount}
                            outgoingCount={conversation.outgoingCount}
                            size="sm"
                          />
                        </div>
                      )}

                      {/* Last message */}
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.lastMessage}
                      </p>

                      {/* Footer with time and assignment */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {conversation.lastMessageTime}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {conversation.salespersonName ? (
                            <>
                              <User className="w-3 h-3" />
                              <span className="truncate max-w-20">
                                {conversation.salespersonName}
                              </span>
                            </>
                          ) : (
                            <span className="text-orange-600">Unassigned</span>
                          )}
                        </div>
                      </div>

                      {/* AI Insights Preview */}
                      {conversation.aiOptIn && aiScore > 75 && (
                        <div className="bg-blue-50 p-2 rounded text-xs">
                          <div className="flex items-center gap-1 text-blue-700">
                            <MessageSquare className="w-3 h-3" />
                            <span className="font-medium">AI Insight:</span>
                          </div>
                          <p className="text-blue-600 mt-1">
                            High engagement lead - consider priority follow-up
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversationsList;
