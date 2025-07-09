// src/components/inbox/SmartInbox.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessagePreviewCard } from './MessagePreviewCard';
import { CountdownTimer } from './CountdownTimer';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Zap, 
  Clock, 
  Users, 
  MessageCircle,
  Mail,
  TrendingUp,
  AlertTriangle,
  Play,
  Pause,
  Settings,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SmartInboxProps {
  className?: string;
}

interface AIScheduledMessage {
  id: string;
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
  leadSource: string;
  aiOptIn: boolean;
  lastResponse?: Date;
  engagementScore: number;
}

interface InboxStats {
  totalAiActive: number;
  pendingSends: number;
  overdueSends: number;
  todayScheduled: number;
  responseRate: number;
  avgEngagementScore: number;
}

export const SmartInbox: React.FC<SmartInboxProps> = ({ className = "" }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [sortBy, setSortBy] = useState('nextSend');
  const [selectedTone, setSelectedTone] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  // TODO: Replace with actual data fetching from Supabase
  // TODO: Add real-time subscriptions for live updates
  // TODO: Integrate with existing lead management system
  // TODO: Add bulk actions for multiple leads

  const { data: aiMessages, isLoading, refetch } = useQuery({
    queryKey: ['ai-scheduled-messages', filterTab, sortBy],
    queryFn: async (): Promise<AIScheduledMessage[]> => {
      // Mock data - replace with actual Supabase query
      return [
        {
          id: '1',
          leadId: 'lead-1',
          leadName: 'John Smith',
          vehicleInterest: '2024 Silverado 1500',
          nextSendAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
          messagePreview: 'Hi John! Just wanted to follow up on that Silverado you were interested in. We have great incentives this month!',
          sequenceType: 'followup',
          sequenceDay: 3,
          totalDays: 84,
          messageType: 'sms',
          toneVariant: 'friendly',
          isAiActive: true,
          leadSource: 'Website',
          aiOptIn: true,
          engagementScore: 75
        },
        {
          id: '2', 
          leadId: 'lead-2',
          leadName: 'Sarah Johnson',
          vehicleInterest: '2024 Traverse',
          nextSendAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes - urgent
          messagePreview: 'Sarah, URGENT: Traverse you inquired about has 2 buyers interested. Need to move FAST!',
          sequenceType: 'new_lead',
          sequenceDay: 1,
          totalDays: 84,
          messageType: 'sms',
          toneVariant: 'urgent',
          isAiActive: true,
          leadSource: 'AutoTrader',
          aiOptIn: true,
          lastResponse: new Date(Date.now() - 2 * 60 * 60 * 1000),
          engagementScore: 90
        },
        {
          id: '3',
          leadId: 'lead-3', 
          leadName: 'Mike Rodriguez',
          vehicleInterest: '2024 Colorado',
          nextSendAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour overdue
          messagePreview: 'Hi Mike! That Colorado can be yours for less than your rent! 0% APR = lower payments.',
          sequenceType: 'new_lead',
          sequenceDay: 0,
          totalDays: 84,
          messageType: 'email',
          toneVariant: 'budget',
          isAiActive: false, // Paused
          leadSource: 'Cars.com',
          aiOptIn: true,
          engagementScore: 45
        }
      ];
    },
    refetchInterval: autoRefresh ? 30000 : false // Refresh every 30 seconds if enabled
  });

  const { data: inboxStats } = useQuery({
    queryKey: ['inbox-stats'],
    queryFn: async (): Promise<InboxStats> => {
      // Mock data - replace with actual Supabase aggregation query
      return {
        totalAiActive: 156,
        pendingSends: 23,
        overdueSends: 3,
        todayScheduled: 45,
        responseRate: 28.5,
        avgEngagementScore: 67
      };
    },
    refetchInterval: autoRefresh ? 60000 : false
  });

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    if (!aiMessages) return [];

    let filtered = aiMessages.filter(msg => {
      // Text search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!msg.leadName.toLowerCase().includes(searchLower) &&
            !msg.vehicleInterest.toLowerCase().includes(searchLower) &&
            !msg.messagePreview.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Tab filter
      if (filterTab === 'urgent') {
        const minutesUntilSend = (msg.nextSendAt.getTime() - Date.now()) / (1000 * 60);
        return minutesUntilSend <= 60 || msg.nextSendAt < new Date();
      }
      if (filterTab === 'today') {
        const today = new Date();
        return msg.nextSendAt.toDateString() === today.toDateString();
      }
      if (filterTab === 'overdue') {
        return msg.nextSendAt < new Date();
      }
      if (filterTab === 'paused') {
        return !msg.isAiActive;
      }

      // Tone filter
      if (selectedTone !== 'all' && msg.toneVariant !== selectedTone) {
        return false;
      }

      // Type filter  
      if (selectedType !== 'all' && msg.messageType !== selectedType) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nextSend':
          return a.nextSendAt.getTime() - b.nextSendAt.getTime();
        case 'leadName':
          return a.leadName.localeCompare(b.leadName);
        case 'engagement':
          return b.engagementScore - a.engagementScore;
        case 'sequenceDay':
          return a.sequenceDay - b.sequenceDay;
        default:
          return 0;
      }
    });

    return filtered;
  }, [aiMessages, searchTerm, filterTab, selectedTone, selectedType, sortBy]);

  // Action handlers
  const handleSendNow = async (leadId: string) => {
    // TODO: Integrate with actual messaging service
    console.log('Sending message now for lead:', leadId);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
    refetch();
  };

  const handlePauseAi = async (leadId: string) => {
    // TODO: Update lead AI status in Supabase
    console.log('Pausing AI for lead:', leadId);
    await new Promise(resolve => setTimeout(resolve, 500));
    refetch();
  };

  const handleResumeAi = async (leadId: string) => {
    // TODO: Update lead AI status in Supabase  
    console.log('Resuming AI for lead:', leadId);
    await new Promise(resolve => setTimeout(resolve, 500));
    refetch();
  };

  const handleEditMessage = async (leadId: string, newMessage: string) => {
    // TODO: Update message content in Supabase
    console.log('Editing message for lead:', leadId, newMessage);
    await new Promise(resolve => setTimeout(resolve, 1000));
    refetch();
  };

  const handleRegenerateMessage = async (leadId: string) => {
    // TODO: Call AI service to regenerate message
    console.log('Regenerating message for lead:', leadId);
    await new Promise(resolve => setTimeout(resolve, 1500));
    refetch();
  };

  const handleBulkAction = async (action: string, leadIds: string[]) => {
    // TODO: Implement bulk actions
    console.log('Bulk action:', action, leadIds);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">AI Active</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inboxStats?.totalAiActive || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <CardTitle className="text-sm">Pending</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inboxStats?.pendingSends || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <CardTitle className="text-sm">Overdue</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inboxStats?.overdueSends || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              <CardTitle className="text-sm">Today</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inboxStats?.todayScheduled || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <CardTitle className="text-sm">Response Rate</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inboxStats?.responseRate || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <CardTitle className="text-sm">Avg Engagement</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inboxStats?.avgEngagementScore || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Smart AI Message Queue
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search leads, vehicles, or message content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nextSend">Next Send</SelectItem>
                  <SelectItem value="leadName">Lead Name</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="sequenceDay">Sequence Day</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedTone} onValueChange={setSelectedTone}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tones</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="budget">Budget</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Tabs */}
          <Tabs value={filterTab} onValueChange={setFilterTab}>
            <TabsList className="grid grid-cols-5 w-full lg:w-auto">
              <TabsTrigger value="all">All ({aiMessages?.length || 0})</TabsTrigger>
              <TabsTrigger value="urgent">Urgent</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="paused">Paused</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Message List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No messages found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search or filters' : 'All leads are up to date!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredMessages.map((message) => (
              <MessagePreviewCard
                key={message.id}
                leadId={message.leadId}
                leadName={message.leadName}
                vehicleInterest={message.vehicleInterest}
                nextSendAt={message.nextSendAt}
                messagePreview={message.messagePreview}
                sequenceType={message.sequenceType}
                sequenceDay={message.sequenceDay}
                totalDays={message.totalDays}
                messageType={message.messageType}
                toneVariant={message.toneVariant}
                isAiActive={message.isAiActive}
                onSendNow={handleSendNow}
                onPauseAi={handlePauseAi}
                onResumeAi={handleResumeAi}
                onEditMessage={handleEditMessage}
                onRegenerateMessage={handleRegenerateMessage}
              />
            ))}
          </div>
        )}
      </div>

      {/* TODO: Add bulk actions toolbar */}
      {/* TODO: Add message analytics dashboard */}
      {/* TODO: Add sequence performance metrics */}
      {/* TODO: Add A/B testing results display */}
      {/* TODO: Add export functionality */}
    </div>
  );
};