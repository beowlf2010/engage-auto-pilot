
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, CheckCircle, Clock, XCircle } from 'lucide-react';

interface RecentMessage {
  id: string;
  lead_name: string;
  lead_phone: string;
  body: string;
  sent_at: string;
  sms_status: string;
  ai_stage: string;
  has_response: boolean;
  response_time?: string;
}

const RecentActivityTab = () => {
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('24h');

  const fetchRecentActivity = async () => {
    try {
      const hoursBack = timeFilter === '24h' ? 24 : timeFilter === '48h' ? 48 : 168;
      const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000)).toISOString();

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          body,
          sent_at,
          sms_status,
          leads (
            id,
            first_name,
            last_name,
            ai_stage,
            phone_numbers (
              number,
              is_primary
            )
          )
        `)
        .eq('ai_generated', true)
        .eq('direction', 'out')
        .gte('sent_at', cutoffTime)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Check for responses to each message
      const messagesWithResponses = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: responseData } = await supabase
            .from('conversations')
            .select('sent_at')
            .eq('lead_id', msg.leads.id)
            .eq('direction', 'in')
            .gt('sent_at', msg.sent_at)
            .order('sent_at', { ascending: true })
            .limit(1);

          const hasResponse = responseData && responseData.length > 0;
          const responseTime = hasResponse 
            ? new Date(responseData[0].sent_at).getTime() - new Date(msg.sent_at).getTime()
            : null;

          return {
            id: msg.id,
            lead_name: `${msg.leads.first_name} ${msg.leads.last_name}`,
            lead_phone: msg.leads.phone_numbers?.find((p: any) => p.is_primary)?.number || 
                       msg.leads.phone_numbers?.[0]?.number || '',
            body: msg.body,
            sent_at: msg.sent_at,
            sms_status: msg.sms_status || 'unknown',
            ai_stage: msg.leads.ai_stage || 'unknown',
            has_response: hasResponse,
            response_time: responseTime ? formatResponseTime(responseTime) : undefined
          };
        })
      );

      setRecentMessages(messagesWithResponses);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatResponseTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusIcon = (status: string, hasResponse: boolean) => {
    if (hasResponse) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    switch (status) {
      case 'sent':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string, hasResponse: boolean) => {
    if (hasResponse) {
      return <Badge className="bg-green-100 text-green-600">Responded</Badge>;
    }

    switch (status) {
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-600">Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-600">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-600">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  useEffect(() => {
    fetchRecentActivity();
  }, [timeFilter]);

  if (loading) {
    return <div className="p-6 text-center">Loading recent activity...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-slate-500" />
          <span className="text-lg font-semibold">Recent AI Messages</span>
        </div>
        
        <div className="flex space-x-2">
          {['24h', '48h', '7d'].map((filter) => (
            <Button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              variant={timeFilter === filter ? 'default' : 'outline'}
              size="sm"
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {recentMessages.map((message) => (
          <div key={message.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(message.sms_status, message.has_response)}
                    <span className="font-medium text-slate-900">{message.lead_name}</span>
                  </div>
                  <span className="text-sm text-slate-500">{message.lead_phone}</span>
                  <Badge variant="outline">{message.ai_stage}</Badge>
                </div>
                
                <div className="text-sm text-slate-700 mb-3 line-clamp-2">
                  {message.body}
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <span>{new Date(message.sent_at).toLocaleString()}</span>
                  {message.response_time && (
                    <span className="text-green-600 font-medium">
                      Responded in {message.response_time}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="ml-4">
                {getStatusBadge(message.sms_status, message.has_response)}
              </div>
            </div>
          </div>
        ))}

        {recentMessages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Recent AI Messages</h3>
            <p className="text-slate-500">No AI messages have been sent in the selected time period.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivityTab;
