
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SchedulingInfoCardProps {
  leadId?: string;
}

const SchedulingInfoCard: React.FC<SchedulingInfoCardProps> = ({ leadId }) => {
  const [nextMessageTime, setNextMessageTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNextSendTime = async () => {
      if (!leadId) {
        // Fallback to 24 hours if no leadId provided
        const fallbackTime = new Date();
        fallbackTime.setTime(fallbackTime.getTime() + (24 * 60 * 60 * 1000));
        setNextMessageTime(fallbackTime);
        return;
      }

      setLoading(true);
      try {
        const { data: lead, error } = await supabase
          .from('leads')
          .select('next_ai_send_at, ai_stage')
          .eq('id', leadId)
          .single();

        if (error || !lead) {
          console.error('Error fetching lead schedule:', error);
          // Fallback to 24 hours
          const fallbackTime = new Date();
          fallbackTime.setTime(fallbackTime.getTime() + (24 * 60 * 60 * 1000));
          setNextMessageTime(fallbackTime);
          return;
        }

        if (lead.next_ai_send_at) {
          setNextMessageTime(new Date(lead.next_ai_send_at));
        } else {
          // Calculate next send time based on current stage
          const { generateSmartSendTime } = await import('@/services/aiMessageService');
          const nextTime = await generateSmartSendTime(7, 60); // Default 7 hours with jitter
          setNextMessageTime(nextTime);
        }
      } catch (error) {
        console.error('Error calculating next send time:', error);
        // Fallback to 24 hours
        const fallbackTime = new Date();
        fallbackTime.setTime(fallbackTime.getTime() + (24 * 60 * 60 * 1000));
        setNextMessageTime(fallbackTime);
      } finally {
        setLoading(false);
      }
    };

    fetchNextSendTime();
  }, [leadId]);

  if (loading || !nextMessageTime) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-primary animate-pulse" />
            <div>
              <div className="font-medium text-foreground">
                Calculating next AI message time...
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-primary" />
          <div>
            <div className="font-medium text-foreground">
              Next AI message scheduled for:
            </div>
            <div className="text-muted-foreground">
              {nextMessageTime.toLocaleDateString('en-US', { 
                month: 'numeric', 
                day: 'numeric', 
                year: 'numeric' 
              })} at {nextMessageTime.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchedulingInfoCard;
