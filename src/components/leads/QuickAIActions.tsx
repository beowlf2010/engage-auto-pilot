
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, BotOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuickAIActionsProps {
  leadId: string;
  leadName: string;
  aiOptIn: boolean;
  onUpdate: () => void;
}

const QuickAIActions: React.FC<QuickAIActionsProps> = ({
  leadId,
  leadName,
  aiOptIn,
  onUpdate
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleAI = async () => {
    setIsUpdating(true);
    try {
      const newOptIn = !aiOptIn;
      
      const updateData = newOptIn ? {
        ai_opt_in: true,
        ai_stage: 'ready_for_contact',
        next_ai_send_at: new Date().toISOString(),
        ai_sequence_paused: false,
        ai_pause_reason: null
      } : {
        ai_opt_in: false,
        ai_sequence_paused: true,
        ai_pause_reason: 'manually_disabled'
      };

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: newOptIn ? "AI messaging enabled" : "AI messaging disabled",
        description: `${leadName} will ${newOptIn ? 'now receive' : 'no longer receive'} AI-generated messages.`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating AI opt-in:', error);
      toast({
        title: "Error",
        description: "Failed to update AI messaging settings",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleAI}
      disabled={isUpdating}
      className={`h-6 px-2 ${aiOptIn 
        ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
      }`}
      title={aiOptIn ? 'Disable AI messaging' : 'Enable AI messaging'}
    >
      {aiOptIn ? (
        <Bot className="h-3 w-3" />
      ) : (
        <BotOff className="h-3 w-3" />
      )}
    </Button>
  );
};

export default QuickAIActions;
