
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Play, Pause, Zap, Heart, MessageSquare, Users, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

interface UnifiedAIControlsProps {
  leadId: string;
  leadName: string;
  aiOptIn: boolean;
  messageIntensity?: string;
  aiMessagesSent?: number;
  aiSequencePaused?: boolean;
  aiPauseReason?: string;
  pendingHumanResponse?: boolean;
  onUpdate: () => void;
}

const UnifiedAIControls: React.FC<UnifiedAIControlsProps> = ({
  leadId,
  leadName,
  aiOptIn,
  messageIntensity = 'gentle',
  aiMessagesSent = 0,
  aiSequencePaused,
  aiPauseReason,
  pendingHumanResponse,
  onUpdate
}) => {
  const [updating, setUpdating] = useState(false);

  const handleAIToggle = async (enabled: boolean) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: enabled,
          message_intensity: enabled ? 'aggressive' : 'gentle', // Start with aggressive for new opt-ins
          ai_sequence_paused: false
        })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: enabled ? "AI Messaging Enabled" : "AI Messaging Disabled",
        description: enabled 
          ? `${leadName} will receive ${enabled ? 'aggressive' : 'gentle'} AI messaging`
          : "AI messaging has been turned off",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AI settings",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleIntensityChange = async (intensity: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          message_intensity: intensity,
          ai_sequence_paused: false // Resume when changing intensity
        })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Message Intensity Updated",
        description: `${leadName} will now receive ${intensity} messaging`,
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update message intensity",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePauseResume = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_sequence_paused: !aiSequencePaused,
          ai_pause_reason: !aiSequencePaused ? 'Manually paused' : null,
          pending_human_response: false
        })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: aiSequencePaused ? "AI Resumed" : "AI Paused",
        description: aiSequencePaused 
          ? "AI messaging has been resumed"
          : "AI messaging has been paused",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AI status",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = () => {
    if (!aiOptIn) return 'bg-gray-100 text-gray-800';
    if (pendingHumanResponse) return 'bg-blue-100 text-blue-800';
    if (aiSequencePaused) return 'bg-yellow-100 text-yellow-800';
    if (messageIntensity === 'aggressive') return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusIcon = () => {
    if (!aiOptIn) return <Bot className="w-3 h-3 text-gray-500" />;
    if (pendingHumanResponse) return <Users className="w-3 h-3 text-blue-500" />;
    if (aiSequencePaused) return <Pause className="w-3 h-3 text-yellow-500" />;
    if (messageIntensity === 'aggressive') return <Zap className="w-3 h-3 text-red-500" />;
    return <Heart className="w-3 h-3 text-green-500" />;
  };

  const getStatusText = () => {
    if (!aiOptIn) return 'Disabled';
    if (pendingHumanResponse) return 'Waiting for Human';
    if (aiSequencePaused) return 'Paused';
    if (messageIntensity === 'aggressive') return 'Aggressive Mode';
    return 'Gentle Mode';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Bot className="w-4 h-4" />
            <span>Unified AI Messaging</span>
          </span>
          <Badge className={getStatusColor()}>
            <span className="flex items-center space-x-1">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </span>
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* AI Toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <div className="font-medium">AI Messaging</div>
            <div className="text-sm text-muted-foreground">
              Enable automated messaging sequences
            </div>
          </div>
          <Switch
            checked={aiOptIn}
            onCheckedChange={handleAIToggle}
            disabled={updating}
          />
        </div>

        {aiOptIn && (
          <>
            {/* Message Intensity Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Message Intensity</span>
                <Badge variant="outline">
                  {aiMessagesSent} sent
                </Badge>
              </div>
              
              <Select 
                value={messageIntensity} 
                onValueChange={handleIntensityChange}
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aggressive">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-red-500" />
                      <div>
                        <div className="font-medium">Aggressive</div>
                        <div className="text-xs text-muted-foreground">
                          Multiple messages per day, urgent tone
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="gentle">
                    <div className="flex items-center gap-2">
                      <Heart className="w-3 h-3 text-green-500" />
                      <div>
                        <div className="font-medium">Gentle</div>
                        <div className="text-xs text-muted-foreground">
                          Spaced out messages, friendly tone
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Intensity Description */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                {messageIntensity === 'aggressive' ? (
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-red-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-900">Aggressive Mode</div>
                      <div className="text-red-700">
                        Perfect for uncontacted leads. Sends 2-3 messages per day with urgent, compelling content to drive immediate action.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-900">Gentle Mode</div>
                      <div className="text-green-700">
                        Perfect for engaged leads. Sends 1 message every 1-2 days with helpful, nurturing content to maintain interest.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pending Human Response */}
            {pendingHumanResponse && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
                <div className="text-sm">
                  <span className="font-medium text-blue-900">Lead replied - waiting for your response</span>
                  <div className="text-blue-700">
                    AI is paused until you handle this conversation
                  </div>
                </div>
              </div>
            )}

            {/* Pause Information */}
            {aiSequencePaused && !pendingHumanResponse && aiPauseReason && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Pause className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Sequence Paused</span>
                </div>
                <p className="text-sm text-yellow-700">Reason: {aiPauseReason}</p>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={aiSequencePaused ? "default" : "outline"}
                onClick={handlePauseResume}
                disabled={updating}
                className="flex-1"
              >
                {aiSequencePaused ? (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Resume AI
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 mr-1" />
                    Pause AI
                  </>
                )}
              </Button>
            </div>

            {/* AI Statistics */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-gray-900">{aiMessagesSent}</div>
                <div className="text-xs text-gray-600">Messages Sent</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-gray-900">
                  {messageIntensity === 'aggressive' ? 'HIGH' : 'LOW'}
                </div>
                <div className="text-xs text-gray-600">Intensity</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UnifiedAIControls;
