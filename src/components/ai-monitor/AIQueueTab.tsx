
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, Play, Pause, Calendar, Users } from 'lucide-react';

interface QueuedLead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  ai_stage: string;
  next_ai_send_at: string;
  ai_messages_sent: number;
  ai_opt_in: boolean;
}

const AIQueueTab = () => {
  const [queuedLeads, setQueuedLeads] = useState<QueuedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchQueuedLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          ai_stage,
          next_ai_send_at,
          ai_messages_sent,
          ai_opt_in,
          phone_numbers (
            number,
            is_primary
          )
        `)
        .eq('ai_opt_in', true)
        .not('next_ai_send_at', 'is', null)
        .order('next_ai_send_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const transformed: QueuedLead[] = (data || []).map(lead => ({
        id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        phone: lead.phone_numbers?.find((p: any) => p.is_primary)?.number || 
               lead.phone_numbers?.[0]?.number || '',
        ai_stage: lead.ai_stage || 'new',
        next_ai_send_at: lead.next_ai_send_at,
        ai_messages_sent: lead.ai_messages_sent || 0,
        ai_opt_in: lead.ai_opt_in
      }));

      setQueuedLeads(transformed);
    } catch (error) {
      console.error('Error fetching queued leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI queue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilSend = (sendAt: string) => {
    const now = new Date().getTime();
    const target = new Date(sendAt).getTime();
    const diff = target - now;

    if (diff <= 0) return { text: 'Due now', color: 'bg-red-100 text-red-600' };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let text = '';
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      text = `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      text = `${hours}h ${minutes}m`;
    } else {
      text = `${minutes}m`;
    }

    const color = diff < 3600000 ? 'bg-red-100 text-red-600' 
                : diff < 14400000 ? 'bg-amber-100 text-amber-600'
                : 'bg-green-100 text-green-600';

    return { text, color };
  };

  const approveMessage = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_stage: 'approved' })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Message Approved",
        description: "AI message has been approved for sending"
      });
      
      fetchQueuedLeads();
    } catch (error) {
      console.error('Error approving message:', error);
      toast({
        title: "Error",
        description: "Failed to approve message",
        variant: "destructive"
      });
    }
  };

  const pauseAI = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: false,
          next_ai_send_at: null 
        })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "AI Paused",
        description: "AI messaging has been paused for this lead"
      });
      
      fetchQueuedLeads();
    } catch (error) {
      console.error('Error pausing AI:', error);
      toast({
        title: "Error",
        description: "Failed to pause AI",
        variant: "destructive"
      });
    }
  };

  const bulkApprove = async () => {
    if (selectedLeads.length === 0) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_stage: 'approved' })
        .in('id', selectedLeads);

      if (error) throw error;

      toast({
        title: "Bulk Approval Complete",
        description: `Approved ${selectedLeads.length} messages`
      });
      
      setSelectedLeads([]);
      fetchQueuedLeads();
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast({
        title: "Error",
        description: "Failed to bulk approve messages",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchQueuedLeads();
    const interval = setInterval(fetchQueuedLeads, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Loading AI queue...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-slate-500" />
            <span className="text-lg font-semibold">{queuedLeads.length} Messages Queued</span>
          </div>
          {selectedLeads.length > 0 && (
            <Badge variant="secondary">
              {selectedLeads.length} selected
            </Badge>
          )}
        </div>
        
        {selectedLeads.length > 0 && (
          <div className="space-x-2">
            <Button onClick={bulkApprove} size="sm">
              <Play className="h-4 w-4 mr-2" />
              Approve Selected ({selectedLeads.length})
            </Button>
            <Button 
              onClick={() => setSelectedLeads([])} 
              variant="outline" 
              size="sm"
            >
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {queuedLeads.map((lead) => {
          const timing = getTimeUntilSend(lead.next_ai_send_at);
          const isSelected = selectedLeads.includes(lead.id);
          
          return (
            <div 
              key={lead.id} 
              className={`border rounded-lg p-4 hover:bg-slate-50 transition-colors ${
                isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLeads([...selectedLeads, lead.id]);
                      } else {
                        setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                      }
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  
                  <div>
                    <div className="font-medium text-slate-900">
                      {lead.first_name} {lead.last_name}
                    </div>
                    <div className="text-sm text-slate-500">{lead.phone}</div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{lead.ai_stage}</Badge>
                    <Badge className={timing.color}>
                      {timing.text}
                    </Badge>
                    <div className="text-sm text-slate-500">
                      Message #{lead.ai_messages_sent + 1}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => approveMessage(lead.id)}
                    size="sm"
                    variant="outline"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => pauseAI(lead.id)}
                    size="sm"
                    variant="outline"
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {queuedLeads.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Messages Queued</h3>
            <p className="text-slate-500">All AI messages are up to date or no leads have AI enabled.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIQueueTab;
