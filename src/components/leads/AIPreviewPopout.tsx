
import React, { useState } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { Lead } from '@/types/lead';
import { toast } from '@/hooks/use-toast';

interface AIPreviewPopoutProps {
  lead: Lead;
  onAIOptInChange: (leadId: string, value: boolean) => void;
  children: React.ReactNode;
}

const AIPreviewPopout: React.FC<AIPreviewPopoutProps> = ({
  lead,
  onAIOptInChange,
  children
}) => {
  const [isOptingIn, setIsOptingIn] = useState(false);

  const handleOptIn = async () => {
    setIsOptingIn(true);
    try {
      await onAIOptInChange(lead.id, true);
      
      // Show success toast
      toast({
        title: "AI Messaging Enabled ✓",
        description: `${lead.firstName} ${lead.lastName} is now opted into AI messaging sequences.`,
        duration: 4000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable AI messaging. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsOptingIn(false);
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="top">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bot className="w-4 h-4 text-blue-600" />
              AI Messaging for {lead.firstName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-sm">Current Status</div>
                <div className="text-xs text-gray-600">Manual messaging only</div>
              </div>
              <Badge variant="outline" className="bg-gray-100 text-gray-600">
                Manual
              </Badge>
            </div>

            {/* Benefits Preview */}
            <div className="space-y-3">
              <div className="text-sm font-medium">Enable AI to automatically:</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <MessageSquare className="w-3 h-3 text-blue-500" />
                  <span>Send personalized follow-up messages</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span>Nurture leads through proven sequences</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-3 h-3 text-purple-500" />
                  <span>Schedule optimal message timing</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-orange-500" />
                  <span>Track message performance & replies</span>
                </div>
              </div>
            </div>

            {/* Opt-in Action */}
            <div className="pt-2 border-t">
              <Button 
                onClick={handleOptIn}
                disabled={isOptingIn}
                className="w-full"
                size="sm"
              >
                <Bot className="w-3 h-3 mr-1" />
                {isOptingIn ? 'Enabling AI...' : 'Enable AI Messaging'}
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              AI will start with a welcome sequence and adapt based on responses
            </div>
          </CardContent>
        </Card>
      </HoverCardContent>
    </HoverCard>
  );
};

export default AIPreviewPopout;
