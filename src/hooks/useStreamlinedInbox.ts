
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

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

export const useStreamlinedInbox = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
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

  const sendMessage = async (messageText: string) => {
    if (!selectedLead || !messageText.trim()) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          lead_id: selectedLead.id,
          body: messageText,
          direction: 'out',
          sent_at: new Date().toISOString()
        });

      if (error) throw error;

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

  const approveAI = async () => {
    if (!selectedLead) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_stage: 'approved' })
        .eq('id', selectedLead.id);

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

  const toggleAI = async () => {
    if (!selectedLead) return;

    const enabled = !selectedLead.ai_opt_in;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_opt_in: enabled })
        .eq('id', selectedLead.id);

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

  const closeThread = () => {
    setSelectedLead(null);
  };

  useEffect(() => {
    fetchLeads();
  }, [profile]);

  return {
    leads,
    selectedLead,
    messages,
    sendMessage,
    approveAI,
    toggleAI,
    openThread,
    closeThread
  };
};
