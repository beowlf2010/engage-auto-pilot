
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  ai_stage: string;
  next_ai_send_at?: string;
  last_reply_at?: string;
  ai_opt_in: boolean;
}

interface Message {
  id: string;
  body: string;
  direction: string;
  sent_at: string;
}

const Countdown = ({ dt }: { dt?: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!dt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(dt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Due now');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [dt]);

  if (!dt) return <span className="text-slate-400">—</span>;

  const now = new Date().getTime();
  const target = new Date(dt).getTime();
  const diff = target - now;

  const colorClass = diff < 3600000 ? "bg-red-100 text-red-600" 
                   : diff < 14400000 ? "bg-amber-100 text-amber-600"
                   : "bg-slate-100 text-slate-600";

  return (
    <Badge className={`${colorClass} text-xs font-bold`}>
      {timeLeft}
    </Badge>
  );
};

const StreamlinedInbox = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [activeTab, setActiveTab] = useState('scheduled');
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchLeads = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        ai_stage,
        next_ai_send_at,
        last_reply_at,
        ai_opt_in,
        phone_numbers (
          number,
          is_primary
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return;
    }

    // Transform the data to match our Lead interface
    const transformedLeads: Lead[] = (data || []).map(lead => ({
      id: lead.id,
      first_name: lead.first_name,
      last_name: lead.last_name,
      phone: lead.phone_numbers?.find((p: any) => p.is_primary)?.number || 
             lead.phone_numbers?.[0]?.number || '',
      ai_stage: lead.ai_stage || 'new',
      next_ai_send_at: lead.next_ai_send_at,
      last_reply_at: lead.last_reply_at,
      ai_opt_in: lead.ai_opt_in || false
    }));

    setLeads(transformedLeads);
  };

  const fetchMessages = async (leadId: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true })
      .limit(30);

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!selectedLead || !replyText.trim()) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          lead_id: selectedLead.id,
          body: replyText,
          direction: 'out',
          sent_at: new Date().toISOString()
        });

      if (error) throw error;

      setReplyText('');
      fetchMessages(selectedLead.id);
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const approveAI = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_stage: 'approved' })
        .eq('id', leadId);

      if (error) throw error;

      fetchLeads();
      toast({
        title: "AI Approved",
        description: "Next AI message has been approved."
      });
    } catch (error) {
      console.error('Error approving AI:', error);
      toast({
        title: "Error",
        description: "Failed to approve AI message",
        variant: "destructive"
      });
    }
  };

  const toggleAI = async (leadId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_opt_in: enabled })
        .eq('id', leadId);

      if (error) throw error;

      fetchLeads();
      toast({
        title: enabled ? "AI Enabled" : "AI Paused",
        description: `AI messaging has been ${enabled ? 'enabled' : 'paused'} for this lead.`
      });
    } catch (error) {
      console.error('Error toggling AI:', error);
      toast({
        title: "Error",
        description: "Failed to update AI settings",
        variant: "destructive"
      });
    }
  };

  const openThread = (lead: Lead) => {
    setSelectedLead(lead);
    fetchMessages(lead.id);
  };

  const getFilteredLeads = (tab: string) => {
    switch (tab) {
      case 'replied':
        return leads.filter(lead => lead.last_reply_at);
      case 'scheduled':
        return leads.filter(lead => lead.ai_opt_in && !lead.last_reply_at);
      case 'paused':
        return leads.filter(lead => !lead.ai_opt_in);
      default:
        return leads;
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [profile]);

  return (
    <div className="bg-slate-50 p-4 space-y-4 rounded-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Smart Inbox 2.0</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="replied">Replied</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
        </TabsList>

        {(['replied', 'scheduled', 'paused'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-2">
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-200">
                {getFilteredLeads(tab).map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => openThread(lead)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {lead.first_name} {lead.last_name}
                        </div>
                        <div className="text-sm text-slate-500">{lead.phone}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{lead.ai_stage}</Badge>
                        <Countdown dt={lead.next_ai_send_at} />
                      </div>
                    </div>
                  </div>
                ))}
                {getFilteredLeads(tab).length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    No leads in this category
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedLead?.first_name} {selectedLead?.last_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg max-w-xs ${
                    message.direction === 'out'
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <div className="text-sm">{message.body}</div>
                  <div className={`text-xs mt-1 ${
                    message.direction === 'out' ? 'text-blue-100' : 'text-slate-500'
                  }`}>
                    {new Date(message.sent_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type reply…"
                rows={3}
              />
              
              <div className="flex justify-between">
                <div className="space-x-2">
                  <Button
                    onClick={() => selectedLead && approveAI(selectedLead.id)}
                    variant="outline"
                    size="sm"
                  >
                    Approve Next AI
                  </Button>
                  <Button
                    onClick={() => selectedLead && toggleAI(selectedLead.id, !selectedLead.ai_opt_in)}
                    variant="outline"
                    size="sm"
                  >
                    {selectedLead?.ai_opt_in ? 'Pause AI' : 'Enable AI'}
                  </Button>
                </div>
                <Button onClick={sendMessage} disabled={!replyText.trim()}>
                  Send
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StreamlinedInbox;
