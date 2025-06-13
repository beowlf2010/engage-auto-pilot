
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Clock, MessageSquare, User, Car, Play, Pause, Eye, Filter, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import MessagePreviewModal from './MessagePreviewModal';
import { sendMessage } from '@/services/messagesService';
import { useAuth } from '@/components/auth/AuthProvider';

interface QueuedMessage {
  id: string;
  firstName: string;
  lastName: string;
  vehicleInterest: string;
  phoneNumber: string;
  aiStage: string;
  nextSendAt: string;
  messagesSent: number;
  lastResponse?: string;
  engagementScore: number;
}

const EnhancedAIQueueTab = () => {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<QueuedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'engagement' | 'stage'>('time');
  const { profile } = useAuth();

  useEffect(() => {
    fetchQueuedMessages();
    const interval = setInterval(fetchQueuedMessages, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterAndSortMessages();
  }, [queuedMessages, stageFilter, searchQuery, sortBy]);

  const fetchQueuedMessages = async () => {
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          vehicle_interest,
          ai_stage,
          next_ai_send_at,
          ai_messages_sent,
          phone_numbers (number, is_primary),
          conversations (body, direction, sent_at)
        `)
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .not('next_ai_send_at', 'is', null)
        .order('next_ai_send_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const processedMessages: QueuedMessage[] = leads?.map(lead => {
        const lastIncoming = lead.conversations
          ?.filter(c => c.direction === 'in')
          ?.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

        // Calculate engagement score based on response history
        const totalOutgoing = lead.conversations?.filter(c => c.direction === 'out').length || 0;
        const totalIncoming = lead.conversations?.filter(c => c.direction === 'in').length || 0;
        const engagementScore = totalOutgoing > 0 ? Math.round((totalIncoming / totalOutgoing) * 100) : 0;

        return {
          id: lead.id,
          firstName: lead.first_name,
          lastName: lead.last_name,
          vehicleInterest: lead.vehicle_interest,
          phoneNumber: lead.phone_numbers?.find(p => p.is_primary)?.number || 'N/A',
          aiStage: lead.ai_stage || 'initial',
          nextSendAt: lead.next_ai_send_at,
          messagesSent: lead.ai_messages_sent || 0,
          lastResponse: lastIncoming?.body,
          engagementScore
        };
      }) || [];

      setQueuedMessages(processedMessages);
    } catch (error) {
      console.error('Error fetching queued messages:', error);
      toast({
        title: "Error",
        description: "Failed to load message queue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortMessages = () => {
    let filtered = queuedMessages;

    // Apply stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter(msg => msg.aiStage === stageFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.firstName.toLowerCase().includes(query) ||
        msg.lastName.toLowerCase().includes(query) ||
        msg.vehicleInterest.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'engagement':
          return b.engagementScore - a.engagementScore;
        case 'stage':
          return a.aiStage.localeCompare(b.aiStage);
        case 'time':
        default:
          return new Date(a.nextSendAt).getTime() - new Date(b.nextSendAt).getTime();
      }
    });

    setFilteredMessages(filtered);
  };

  const handlePreviewMessage = (leadId: string) => {
    setSelectedLead(leadId);
    setPreviewModalOpen(true);
  };

  const handleApproveMessage = async (message: string) => {
    if (!selectedLead || !profile) return;

    try {
      await sendMessage(selectedLead, message, profile, true);
      
      // Update the lead's next send time
      const { scheduleEnhancedAIMessages } = await import('@/services/enhancedAIMessageService');
      await scheduleEnhancedAIMessages(selectedLead);
      
      toast({
        title: "Message Sent",
        description: "AI message approved and sent successfully",
      });

      // Refresh the queue
      fetchQueuedMessages();
    } catch (error) {
      console.error('Error sending approved message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleSkipLead = async () => {
    if (!selectedLead) return;

    try {
      // Pause the AI sequence for this lead
      await supabase
        .from('leads')
        .update({
          ai_sequence_paused: true,
          ai_pause_reason: 'manual_skip'
        })
        .eq('id', selectedLead);

      toast({
        title: "Lead Skipped",
        description: "AI sequence paused for this lead",
      });

      fetchQueuedMessages();
    } catch (error) {
      console.error('Error skipping lead:', error);
      toast({
        title: "Error",
        description: "Failed to skip lead",
        variant: "destructive"
      });
    }
  };

  const formatTimeUntilDue = (nextSendAt: string) => {
    const now = new Date();
    const sendTime = new Date(nextSendAt);
    const diffMs = sendTime.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Due now';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const getEngagementBadgeVariant = (score: number) => {
    if (score >= 70) return 'default';
    if (score >= 40) return 'secondary';
    return 'destructive';
  };

  const uniqueStages = [...new Set(queuedMessages.map(msg => msg.aiStage))];

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading message queue...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Enhanced AI Message Queue</h2>
          <p className="text-sm text-muted-foreground">
            {filteredMessages.length} messages scheduled • Preview and approve before sending
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-48"
            />
          </div>
          
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {uniqueStages.map(stage => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: 'time' | 'engagement' | 'stage') => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Due Time</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="stage">AI Stage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Message Queue */}
      <div className="space-y-3">
        {filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Messages Scheduled</h3>
              <p className="text-muted-foreground">
                {stageFilter !== 'all' || searchQuery
                  ? 'No messages match your current filters'
                  : 'All AI sequences are up to date or paused'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMessages.map((message) => (
            <Card key={message.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {message.firstName} {message.lastName}
                        </span>
                      </div>
                      
                      <Badge variant="outline">{message.aiStage}</Badge>
                      
                      <Badge variant={getEngagementBadgeVariant(message.engagementScore)}>
                        {message.engagementScore}% engaged
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {message.vehicleInterest}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due {formatTimeUntilDue(message.nextSendAt)}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {message.messagesSent} sent
                      </div>
                    </div>

                    {message.lastResponse && (
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-medium">Last response: </span>
                        {message.lastResponse.length > 100
                          ? `${message.lastResponse.substring(0, 100)}...`
                          : message.lastResponse
                        }
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewMessage(message.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Message Preview Modal */}
      <MessagePreviewModal
        open={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setSelectedLead(null);
        }}
        leadId={selectedLead || ''}
        onApprove={handleApproveMessage}
        onReject={handleSkipLead}
      />
    </div>
  );
};

export default EnhancedAIQueueTab;
