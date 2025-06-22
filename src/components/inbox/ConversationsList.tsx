
import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, MessageSquare, Clock, User, Phone, AlertTriangle, CheckCircle } from 'lucide-react';
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
  lastMessageDirection?: 'in' | 'out';
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
  showUrgencyIndicator?: boolean;
  showTimestamps?: boolean;
}

const ConversationsList = ({
  conversations,
  selectedLead,
  onSelectConversation,
  canReply,
  showUrgencyIndicator = false,
  showTimestamps = false
}: ConversationsListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Get urgency level for unread messages
  const getUrgencyLevel = (conversation: Conversation): 'high' | 'medium' | 'low' => {
    const hoursSinceLastMessage = conversation.lastMessageDate ? 
      (Date.now() - conversation.lastMessageDate.getTime()) / (1000 * 60 * 60) : 0;
    
    if (conversation.unreadCount > 3 || hoursSinceLastMessage > 24) return 'high';
    if (conversation.unreadCount > 1 || hoursSinceLastMessage > 4) return 'medium';
    return 'low';
  };

  const getUrgencyColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-orange-500 bg-orange-50';
      case 'low': return 'border-l-yellow-500 bg-yellow-50';
      default: return '';
    }
  };

  // Mock AI scoring function
  const getAIScore = (conversation: Conversation): number => {
    let score = 50;
    if (conversation.unreadCount > 0) score += 20;
    if (conversation.aiOptIn) score += 15;
    if (conversation.status === 'engaged') score += 10;
    if (conversation.vehicleInterest.toLowerCase().includes('luxury')) score += 5;
    return Math.min(score, 100);
  };

  const getTrend = (conversation: Conversation): 'up' | 'down' | 'stable' => {
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Conversations
          </h3>
          <Badge variant="outline">{filteredConversations.length}</Badge>
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
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => {
                const isSelected = conversation.leadId === selectedLead;
                const aiScore = getAIScore(conversation);
                const trend = getTrend(conversation);
                const urgencyLevel = getUrgencyLevel(conversation);
                
                return (
                  <div
                    key={conversation.leadId}
                    className={`p-3 border-b cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    } ${
                      showUrgencyIndicator && conversation.unreadCount > 0 
                        ? `border-l-4 ${getUrgencyColor(urgencyLevel)}` 
                        : ''
                    }`}
                    onClick={() => onSelectConversation(conversation.leadId)}
                  >
                    <div className="space-y-2">
                      {/* Header with name, urgency, and score */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">
                            {conversation.leadName}
                          </h4>
                          
                          {/* Urgency indicator */}
                          {showUrgencyIndicator && conversation.unreadCount > 0 && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className={`w-3 h-3 ${
                                urgencyLevel === 'high' ? 'text-red-500' :
                                urgencyLevel === 'medium' ? 'text-orange-500' :
                                'text-yellow-500'
                              }`} />
                              <span className={`text-xs font-medium ${
                                urgencyLevel === 'high' ? 'text-red-600' :
                                urgencyLevel === 'medium' ? 'text-orange-600' :
                                'text-yellow-600'
                              }`}>
                                {urgencyLevel.toUpperCase()}
                              </span>
                            </div>
                          )}
                          
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
                        
                        {/* Message direction indicator */}
                        {conversation.lastMessageDirection && (
                          <Badge variant={conversation.lastMessageDirection === 'in' ? 'default' : 'secondary'} className="text-xs">
                            {conversation.lastMessageDirection === 'in' ? '📩 Customer' : '📤 Sales'}
                          </Badge>
                        )}
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
                          {showTimestamps ? (
                            <span>{conversation.lastMessageDate?.toLocaleString() || conversation.lastMessageTime}</span>
                          ) : (
                            <span>{conversation.lastMessageTime}</span>
                          )}
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

                      {/* Quick action for unread messages */}
                      {showUrgencyIndicator && conversation.unreadCount > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button size="sm" variant="outline" className="text-xs h-6">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Mark as Read
                          </Button>
                          <Button size="sm" variant="default" className="text-xs h-6">
                            Quick Reply
                          </Button>
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
