
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  ai_opt_in?: boolean;
}

interface BulkAIOptInActionProps {
  selectedLeads: Lead[];
  onComplete: () => void;
}

const BulkAIOptInAction: React.FC<BulkAIOptInActionProps> = ({
  selectedLeads,
  onComplete
}) => {
  const [isEnabling, setIsEnabling] = useState(false);

  const handleBulkAIOptIn = async () => {
    if (selectedLeads.length === 0) return;

    setIsEnabling(true);
    try {
      const leadIds = selectedLeads.map(lead => lead.id);
      
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: true,
          ai_stage: 'ready_for_contact',
          next_ai_send_at: new Date().toISOString(),
          ai_sequence_paused: false,
          ai_pause_reason: null
        })
        .in('id', leadIds);

      if (error) throw error;

      toast({
        title: "AI messaging enabled",
        description: `Successfully enabled AI messaging for ${selectedLeads.length} leads.`,
      });

      // Trigger data refresh by calling onComplete
      console.log('🔄 [BULK AI OPT-IN] Triggering data refresh after bulk opt-in');
      onComplete();
      
    } catch (error) {
      console.error('Error enabling AI opt-in:', error);
      toast({
        title: "Error",
        description: "Failed to enable AI messaging for selected leads",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  // Count how many leads don't have AI enabled
  const leadsWithoutAI = selectedLeads.filter(lead => !lead.ai_opt_in).length;

  if (leadsWithoutAI === 0) {
    return null;
  }

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleBulkAIOptIn}
      disabled={isEnabling}
      className="border-blue-200 text-blue-700 hover:bg-blue-50"
    >
      <Bot className="w-4 h-4 mr-2" />
      {isEnabling ? 'Enabling AI...' : `Enable AI (${leadsWithoutAI})`}
    </Button>
  );
};

export default BulkAIOptInAction;
