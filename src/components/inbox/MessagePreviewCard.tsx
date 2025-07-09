// src/components/inbox/MessagePreviewCard.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Clock, 
  Edit3, 
  Send, 
  Pause, 
  Play, 
  MessageCircle, 
  Mail,
  Calendar,
  User,
  Car,
  Zap
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface MessagePreviewCardProps {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  nextSendAt: Date;
  messagePreview: string;
  sequenceType: 'new_lead' | 'followup' | 'service' | 'post_sale';
  sequenceDay: number;
  totalDays: number;
  messageType: 'sms' | 'email';
  toneVariant: 'friendly' | 'urgent' | 'budget';
  isAiActive: boolean;
  canEdit?: boolean;
  onSendNow?: (leadId: string) => Promise<void>;
  onPauseAi?: (leadId: string) => Promise<void>;
  onResumeAi?: (leadId: string) => Promise<void>;
  onEditMessage?: (leadId: string, newMessage: string) => Promise<void>;
  onRegenerateMessage?: (leadId: string) => Promise<void>;
  className?: string;
}

export const MessagePreviewCard: React.FC<MessagePreviewCardProps> = ({
  leadId,
  leadName,
  vehicleInterest,
  nextSendAt,
  messagePreview,
  sequenceType,
  sequenceDay,
  totalDays,
  messageType,
  toneVariant,
  isAiActive,
  canEdit = true,
  onSendNow,
  onPauseAi,
  onResumeAi,
  onEditMessage,
  onRegenerateMessage,
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(messagePreview);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // TODO: Integrate with existing lead data fetching
  // TODO: Add real-time updates when message is sent
  // TODO: Connect to actual AI messaging service

  const getSequenceTypeDisplay = (type: string) => {
    const types = {
      new_lead: 'New Lead',
      followup: 'Follow-up',
      service: 'Service',
      post_sale: 'Post-Sale'
    };
    return types[type as keyof typeof types] || type;
  };

  const getToneColor = (tone: string) => {
    const colors = {
      friendly: 'bg-green-100 text-green-800 border-green-200',
      urgent: 'bg-red-100 text-red-800 border-red-200', 
      budget: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[tone as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  const getMessageTypeIcon = (type: string) => {
    return type === 'sms' ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />;
  };

  const handleSendNow = async () => {
    if (!onSendNow) return;
    
    setIsLoading(true);
    try {
      await onSendNow(leadId);
      toast({
        title: "Message Sent",
        description: `AI message sent to ${leadName}`,
      });
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseResume = async () => {
    if (!onPauseAi || !onResumeAi) return;
    
    setIsLoading(true);
    try {
      if (isAiActive) {
        await onPauseAi(leadId);
        toast({
          title: "AI Paused",
          description: `AI messaging paused for ${leadName}`,
        });
      } else {
        await onResumeAi(leadId);
        toast({
          title: "AI Resumed", 
          description: `AI messaging resumed for ${leadName}`,
        });
      }
    } catch (error) {
      toast({
        title: "Action Failed",
        description: "Failed to update AI status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!onEditMessage) return;
    
    setIsLoading(true);
    try {
      await onEditMessage(leadId, editedMessage);
      setIsEditing(false);
      toast({
        title: "Message Updated",
        description: "AI message has been customized",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!onRegenerateMessage) return;
    
    setIsLoading(true);
    try {
      await onRegenerateMessage(leadId);
      toast({
        title: "Message Regenerated",
        description: "New AI message generated",
      });
    } catch (error) {
      toast({
        title: "Regeneration Failed", 
        description: "Failed to regenerate message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isOverdue = new Date() > nextSendAt;
  const timeUntilSend = formatDistanceToNow(nextSendAt, { addSuffix: true });

  return (
    <Card className={`relative transition-all duration-200 hover:shadow-md ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              {leadName}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Car className="w-3 h-3" />
              {vehicleInterest}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isAiActive && (
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-primary animate-pulse" />
                <span className="text-xs text-primary font-medium">AI Active</span>
              </div>
            )}
            <Badge variant="outline" className={getToneColor(toneVariant)}>
              {toneVariant}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {getMessageTypeIcon(messageType)}
              <span className="uppercase">{messageType}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Day {sequenceDay} of {totalDays}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {getSequenceTypeDisplay(sequenceType)}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Clock className={`w-3 h-3 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
            <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
              {isOverdue ? 'Overdue' : timeUntilSend}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Message Preview */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Next Message Preview
          </div>
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="min-h-[100px] resize-none"
                placeholder="Edit your message..."
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {editedMessage.length} characters
                  {messageType === 'sms' && editedMessage.length > 160 && (
                    <span className="text-amber-600 ml-1">
                      (Multiple SMS segments)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedMessage(messagePreview);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={isLoading}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-sm leading-relaxed">{messagePreview}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  {messagePreview.length} characters
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Sequence Progress</span>
            <span className="font-medium">{Math.round((sequenceDay / totalDays) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(sequenceDay / totalDays) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleSendNow}
            disabled={isLoading || !isAiActive}
            className="flex-1"
          >
            <Send className="w-3 h-3 mr-1" />
            Send Now
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handlePauseResume}
            disabled={isLoading}
          >
            {isAiActive ? (
              <>
                <Pause className="w-3 h-3 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                Resume
              </>
            )}
          </Button>

          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerate}
              disabled={isLoading}
            >
              <Zap className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* TODO: Add sequence timeline component */}
        {/* TODO: Add message analytics (open rates, responses) */}
        {/* TODO: Add A/B test variant selector */}
        {/* TODO: Add lead engagement score display */}
      </CardContent>
    </Card>
  );
};