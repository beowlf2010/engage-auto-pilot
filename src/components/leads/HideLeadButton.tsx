
import React from 'react';
import { Button } from '@/components/ui/button';
import { EyeOff, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface HideLeadButtonProps {
  leadId: string;
  isHidden: boolean;
  onToggleHidden: (leadId: string, hidden: boolean) => void;
}

const HideLeadButton: React.FC<HideLeadButtonProps> = ({
  leadId,
  isHidden,
  onToggleHidden
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const handleToggleHidden = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ is_hidden: !isHidden })
        .eq('id', leadId);

      if (error) throw error;

      onToggleHidden(leadId, !isHidden);
      
      toast({
        title: "Success",
        description: isHidden ? "Lead is now visible" : "Lead has been hidden",
      });
    } catch (error) {
      console.error('Error toggling lead visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update lead visibility",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleHidden}
      disabled={loading}
      title={isHidden ? "Show lead" : "Hide lead"}
    >
      {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </Button>
  );
};

export default HideLeadButton;
