import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MessageSquare, 
  Phone, 
  Clock, 
  CheckCheck, 
  Bot, 
  AlertTriangle,
  Car,
  Sparkles,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface EnhancedConversationCardProps {
  conversation: ConversationListItem;
  isSelected: boolean;
  isSelectable?: boolean;
  isChecked?: boolean;
  onSelect: (leadId: string) => void;
  onCheck?: (leadId: string, checked: boolean) => void;
  onMarkAsRead?: (leadId: string) => Promise<void>;
  isMarkingAsRead?: boolean;
  aiInsights?: {
    confidence?: number;
    urgencyLevel?: 'low' | 'medium' | 'high';
    buyingSignals?: string[];
    nextBestAction?: string;
  };
  showAIInsights?: boolean;
}

export const EnhancedConversationCard: React.FC<EnhancedConversationCardProps> = ({
  conversation,
  isSelected,
  isSelectable = false,
  isChecked = false,
  onSelect,
  onCheck,
  onMarkAsRead,
  isMarkingAsRead = false,
  aiInsights,
  showAIInsights = true
}) => {
  const [showFullMessage, setShowFullMessage] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUrgencyColor = () => {
    const hoursSince = conversation.lastMessageDate ? 
      (Date.now() - conversation.lastMessageDate.getTime()) / (1000 * 60 * 60) : 0;
    
    if (conversation.unreadCount > 3 || hoursSince > 24) return 'border-l-red-500';
    if (conversation.unreadCount > 1 || hoursSince > 4) return 'border-l-orange-500';
    if (conversation.unreadCount > 0) return 'border-l-yellow-500';
    return 'border-l-transparent';
  };

  const getAIConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatTime = (date?: Date | string) => {
    if (!date) return 'Unknown';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLInputElement) return; // Don't trigger on checkbox
    onSelect(conversation.leadId);
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkAsRead) {
      await onMarkAsRead(conversation.leadId);
    }
  };

  const handleCheckChange = (checked: boolean) => {
    if (onCheck) {
      onCheck(conversation.leadId, checked);
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${
        isSelected 
          ? 'ring-2 ring-primary bg-primary/5 shadow-md' 
          : 'hover:bg-muted/50'
      } ${getUrgencyColor()}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          {isSelectable && (
            <Checkbox
              checked={isChecked}
              onCheckedChange={handleCheckChange}
              className="mt-1"
            />
          )}

          {/* Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white font-medium">
              {getInitials(conversation.leadName)}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {conversation.leadName || 'Unknown Customer'}
                  </h3>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                  {aiInsights?.urgencyLevel === 'high' && (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  )}
                </div>
                
                {/* Contact Info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Phone className="h-3 w-3" />
                  <span>{conversation.leadPhone}</span>
                  <Clock className="h-3 w-3 ml-2" />
                  <span>{formatTime(conversation.lastMessageDate)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-2">
                {conversation.unreadCount > 0 && onMarkAsRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAsRead}
                    disabled={isMarkingAsRead}
                    className="h-6 px-2 text-xs opacity-70 hover:opacity-100"
                  >
                    {isMarkingAsRead ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-primary" />
                    ) : (
                      <>
                        <CheckCheck className="h-3 w-3 mr-1" />
                        Read
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Vehicle Interest */}
            {conversation.vehicleInterest && (
              <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 rounded-md px-2 py-1 mb-2 w-fit">
                <Car className="h-3 w-3" />
                <span>{conversation.vehicleInterest}</span>
              </div>
            )}

            {/* AI Insights */}
            {showAIInsights && aiInsights && (
              <div className="flex items-center gap-2 mb-2">
                {aiInsights.confidence && (
                  <div className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
                    getAIConfidenceColor(aiInsights.confidence)
                  }`}>
                    <Bot className="h-3 w-3" />
                    <span>{Math.round(aiInsights.confidence * 100)}% confidence</span>
                  </div>
                )}
                
                {aiInsights.buyingSignals && aiInsights.buyingSignals.length > 0 && (
                  <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-md flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>Buying signals detected</span>
                  </div>
                )}

                {conversation.aiOptIn && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <Bot className="h-3 w-3 mr-1" />
                    AI Active
                  </Badge>
                )}
              </div>
            )}

            {/* Message Preview */}
            <div className="mb-2">
              <p className={`text-sm text-foreground/80 ${
                showFullMessage ? '' : 'line-clamp-2'
              }`}>
                {conversation.lastMessage || 'No messages yet'}
              </p>
              
              {conversation.lastMessage && conversation.lastMessage.length > 100 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullMessage(!showFullMessage);
                  }}
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showFullMessage ? (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Show more
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* AI Next Best Action */}
            {showAIInsights && aiInsights?.nextBestAction && (
              <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>AI suggests: {aiInsights.nextBestAction}</span>
              </div>
            )}

            {/* Status Badges */}
            <div className="flex items-center gap-2 mt-2">
              {conversation.status && (
                <Badge variant="outline" className="text-xs capitalize">
                  {conversation.status}
                </Badge>
              )}
              
              {conversation.lastMessageDirection === 'in' && conversation.unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Needs Response
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};