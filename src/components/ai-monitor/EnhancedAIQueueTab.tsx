
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, MessageSquare, User, Car, Pause, Eye, Filter, Search, CheckSquare, AlertTriangle, Zap, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import MessagePreviewModal from './MessagePreviewModal';
import MessagePreviewInline from './MessagePreviewInline';
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
  priority: 'low' | 'medium' | 'high';
  complianceFlags: string[];
  aiQualityScore: number;
  messageIntensity: string;
  isOverdue: boolean;
}

const EnhancedAIQueueTab = () => {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<QueuedMessage[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'engagement' | 'stage' | 'priority' | 'quality'>('time');
  const [batchOperation, setBatchOperation] = useState<'pause' | 'skip' | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    fetchQueuedMessages();
    const interval = setInterval(fetchQueuedMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterAndSortMessages();
  }, [queuedMessages, stageFilter, priorityFilter, complianceFilter, searchQuery, sortBy]);

  const fetchQueuedMessages = async () => {
    try {
      const now = new Date().toISOString();
      
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
          message_intensity,
          phone_numbers (number, is_primary),
          conversations (body, direction, sent_at),
          conversation_quality_scores (overall_score),
          compliance_violations (severity, status)
        `)
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .not('next_ai_send_at', 'is', null)
        .order('next_ai_send_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const processedMessages: QueuedMessage[] = leads?.map(lead => {
        const lastIncoming = lead.conversations
          ?.filter(c => c.direction === 'in')
          ?.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

        const totalOutgoing = lead.conversations?.filter(c => c.direction === 'out').length || 0;
        const totalIncoming = lead.conversations?.filter(c => c.direction === 'in').length || 0;
        const engagementScore = totalOutgoing > 0 ? Math.round((totalIncoming / totalOutgoing) * 100) : 0;

        // Calculate priority based on engagement and time
        const nextSendTime = new Date(lead.next_ai_send_at);
        const isOverdue = nextSendTime.getTime() < new Date(now).getTime();
        const hoursDiff = (nextSendTime.getTime() - new Date(now).getTime()) / (1000 * 60 * 60);
        
        let priority: 'low' | 'medium' | 'high' = 'medium';
        if (isOverdue) priority = 'high';
        else if (hoursDiff < 2 && engagementScore > 50) priority = 'high';
        else if (engagementScore > 70) priority = 'medium';
        else priority = 'low';

        // Get compliance flags
        const complianceFlags = lead.compliance_violations
          ?.filter(v => v.status === 'open')
          ?.map(v => v.severity) || [];

        // Get AI quality score
        const aiQualityScore = lead.conversation_quality_scores?.[0]?.overall_score || 0;

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
          engagementScore,
          priority,
          complianceFlags,
          aiQualityScore,
          messageIntensity: lead.message_intensity || 'gentle',
          isOverdue
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

    // Apply filters
    if (stageFilter !== 'all') {
      filtered = filtered.filter(msg => msg.aiStage === stageFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(msg => msg.priority === priorityFilter);
    }

    if (complianceFilter === 'flagged') {
      filtered = filtered.filter(msg => msg.complianceFlags.length > 0);
    } else if (complianceFilter === 'clean') {
      filtered = filtered.filter(msg => msg.complianceFlags.length === 0);
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
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'quality':
          return b.aiQualityScore - a.aiQualityScore;
        case 'time':
        default:
          return new Date(a.nextSendAt).getTime() - new Date(b.nextSendAt).getTime();
      }
    });

    setFilteredMessages(filtered);
  };

  const handleSelectMessage = (messageId: string, checked: boolean) => {
    const newSelected = new Set(selectedMessages);
    if (checked) {
      newSelected.add(messageId);
    } else {
      newSelected.delete(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMessages(new Set(filteredMessages.map(m => m.id)));
    } else {
      setSelectedMessages(new Set());
    }
  };

  const togglePreviewExpanded = (messageId: string) => {
    const newExpanded = new Set(expandedPreviews);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedPreviews(newExpanded);
  };

  const handleBatchOperation = async (operation: 'pause' | 'skip') => {
    if (selectedMessages.size === 0) return;

    setBatchOperation(operation);
    let successCount = 0;

    try {
      for (const messageId of selectedMessages) {
        try {
          switch (operation) {
            case 'pause':
              await supabase
                .from('leads')
                .update({
                  ai_sequence_paused: true,
                  ai_pause_reason: 'manual_batch_pause'
                })
                .eq('id', messageId);
              successCount++;
              break;
            
            case 'skip':
              // Schedule next message for tomorrow
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              await supabase
                .from('leads')
                .update({
                  next_ai_send_at: tomorrow.toISOString()
                })
                .eq('id', messageId);
              successCount++;
              break;
          }
        } catch (error) {
          console.error(`Error processing ${operation} for lead ${messageId}:`, error);
        }
      }

      toast({
        title: "Batch Operation Complete",
        description: `Successfully processed ${successCount}/${selectedMessages.size} messages`,
      });

      // Clear selections and refresh
      setSelectedMessages(new Set());
      fetchQueuedMessages();
    } catch (error) {
      console.error('Batch operation error:', error);
      toast({
        title: "Error",
        description: "Failed to complete batch operation",
        variant: "destructive"
      });
    } finally {
      setBatchOperation(null);
    }
  };

  const handlePreviewMessage = (leadId: string) => {
    setSelectedLead(leadId);
    setPreviewModalOpen(true);
  };

  const formatTimeUntilDue = (nextSendAt: string) => {
    const now = new Date();
    const sendTime = new Date(nextSendAt);
    const diffMs = sendTime.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Overdue';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getIntensityBadgeVariant = (intensity: string) => {
    switch (intensity) {
      case 'super_aggressive': return 'destructive';
      case 'aggressive': return 'secondary';
      case 'gentle': return 'outline';
      default: return 'outline';
    }
  };

  const uniqueStages = [...new Set(queuedMessages.map(msg => msg.aiStage))];
  const highPriorityCount = filteredMessages.filter(m => m.priority === 'high').length;
  const overdueCount = filteredMessages.filter(m => m.isOverdue).length;
  const complianceFlaggedCount = filteredMessages.filter(m => m.complianceFlags.length > 0).length;

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading AI queue monitor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Automation Status */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              AI Queue Monitor (Auto-Sending Every 15 Minutes)
            </h2>
            <p className="text-sm text-muted-foreground">
              {filteredMessages.length} messages in queue • Automation handles sending automatically
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {overdueCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {overdueCount} Processing Now
              </Badge>
            )}
            {highPriorityCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {highPriorityCount} High Priority
              </Badge>
            )}
            {complianceFlaggedCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {complianceFlaggedCount} Compliance Flags
              </Badge>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
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
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {uniqueStages.map(stage => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: 'time' | 'engagement' | 'stage' | 'priority' | 'quality') => setSortBy(value)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Next Send Time</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="stage">Stage</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Batch Operations */}
        {selectedMessages.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">{selectedMessages.size} selected</span>
            <Separator orientation="vertical" className="h-4" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchOperation('pause')}
              disabled={!!batchOperation}
            >
              <Pause className="w-3 h-3 mr-1" />
              Pause Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchOperation('skip')}
              disabled={!!batchOperation}
            >
              <Clock className="w-3 h-3 mr-1" />
              Skip to Tomorrow
            </Button>
          </div>
        )}
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Messages in Queue</h3>
              <p className="text-muted-foreground">
                All leads are up to date or automation is running smoothly. 
                New messages will appear here when leads are due for contact.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedMessages.size === filteredMessages.length}
                onCheckedChange={handleSelectAll}
              />
              <span>Select all ({filteredMessages.length})</span>
            </div>

            {filteredMessages.map((message) => (
              <Card key={message.id} className={`${message.isOverdue ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-blue-500'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedMessages.has(message.id)}
                      onCheckedChange={(checked) => handleSelectMessage(message.id, checked as boolean)}
                    />
                    
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">
                            {message.firstName} {message.lastName}
                          </span>
                          <Badge variant={getPriorityBadgeVariant(message.priority)}>
                            {message.priority}
                          </Badge>
                          <Badge variant={getIntensityBadgeVariant(message.messageIntensity)}>
                            {message.messageIntensity}
                          </Badge>
                          {message.complianceFlags.length > 0 && (
                            <Badge variant="secondary">Flagged</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {formatTimeUntilDue(message.nextSendAt)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePreviewExpanded(message.id)}
                          >
                            {expandedPreviews.has(message.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Info Row */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {message.vehicleInterest}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {message.messagesSent} sent
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Stage: {message.aiStage}
                        </div>
                      </div>

                      {/* Expanded Preview */}
                      {expandedPreviews.has(message.id) && (
                        <div className="mt-4">
                          <MessagePreviewInline
                            leadId={message.id}
                            leadName={`${message.firstName} ${message.lastName}`}
                            vehicleInterest={message.vehicleInterest}
                            aiStage={message.aiStage}
                            onMessageSent={fetchQueuedMessages}
                            onPreviewFull={() => handlePreviewMessage(message.id)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewModalOpen && selectedLead && (
        <MessagePreviewModal
          open={previewModalOpen}
          onOpenChange={setPreviewModalOpen}
          leadId={selectedLead}
          onMessageSent={fetchQueuedMessages}
        />
      )}
    </div>
  );
};

export default EnhancedAIQueueTab;
