
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, User, Car, MessageSquare, Zap } from "lucide-react";
import { generateIntelligentAIMessage } from "@/services/intelligentAIMessageService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";

interface AIPreviewPopoutProps {
  lead: Lead;
  onAIOptInChange: (leadId: string, value: boolean) => void;
  onRefresh?: () => void;
  children: React.ReactNode;
}

const AIPreviewPopout: React.FC<AIPreviewPopoutProps> = ({
  lead,
  onAIOptInChange,
  onRefresh,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string>('');
  const [isOptingIn, setIsOptingIn] = useState(false);
  const [isStartingNow, setIsStartingNow] = useState(false);

  const generatePreview = async () => {
    if (previewMessage) return; // Already generated
    
    setIsGenerating(true);
    try {
      const message = await generateIntelligentAIMessage({
        leadId: lead.id,
        context: {
          vehicleInterest: lead.vehicleInterest,
          urgency_factor: 'low'
        }
      });

      if (message) {
        setPreviewMessage(message);
      } else {
        setPreviewMessage(`Hi ${lead.firstName}! I'm Finn with Jason Pilger Chevrolet. I noticed you were interested in ${lead.vehicleInterest || 'finding the right vehicle'}. I'd love to help you explore your options and answer any questions you might have. What brought you to look at vehicles today?`);
      }
    } catch (error) {
      console.error('Error generating AI preview:', error);
      setPreviewMessage(`Hi ${lead.firstName}! I'm Finn with Jason Pilger Chevrolet. I noticed you were interested in ${lead.vehicleInterest || 'finding the right vehicle'}. I'd love to help you explore your options and answer any questions you might have. What brought you to look at vehicles today?`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptIn = async () => {
    setIsOptingIn(true);
    try {
      await onAIOptInChange(lead.id, true);
      setIsOpen(false);
      toast({
        title: "AI Enabled",
        description: `Finn AI is now enabled for ${lead.firstName} ${lead.lastName}. Messages will be sent according to the AI schedule.`
      });
      onRefresh?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable AI. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsOptingIn(false);
    }
  };

  const handleStartNow = async () => {
    setIsStartingNow(true);
    try {
      // First enable AI
      await onAIOptInChange(lead.id, true);
      
      // Then send the preview message immediately
      const { error } = await supabase
        .from('conversations')
        .insert({
          lead_id: lead.id,
          body: previewMessage,
          direction: 'out',
          ai_generated: true,
          sent_at: new Date().toISOString()
        });

      if (error) throw error;

      setIsOpen(false);
      toast({
        title: "AI Started",
        description: `Finn AI is now active for ${lead.firstName} ${lead.lastName} and the first message has been sent!`
      });
      onRefresh?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start AI. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStartingNow(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !lead.aiOptIn) {
      generatePreview();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="w-5 h-5 text-blue-600" />
              Finn AI Preview
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {lead.firstName} {lead.lastName}
              </div>
              <div className="flex items-center gap-1">
                <Car className="w-4 h-4" />
                {lead.vehicleInterest || 'Vehicle interest not specified'}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Preview Message */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MessageSquare className="w-4 h-4" />
                First Message Preview
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                {isGenerating ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Generating preview...</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {previewMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {!isGenerating && previewMessage && (
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleStartNow}
                  disabled={isStartingNow || isOptingIn}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isStartingNow ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Starting Finn AI...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Start Now & Send Message
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleOptIn}
                  disabled={isOptingIn || isStartingNow}
                  variant="outline"
                  className="w-full"
                >
                  {isOptingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Enabling AI...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      Just Opt In (No Message Yet)
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Info */}
            <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
              <strong>Opt In:</strong> Enables Finn AI according to schedule<br />
              <strong>Start Now:</strong> Enables AI and sends this message immediately
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default AIPreviewPopout;
