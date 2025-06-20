
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, Mail } from "lucide-react";
import { useFinnEmailAutomation } from "@/hooks/useFinnEmailAutomation";
import { enableAIForLead, pauseAIForLead } from '@/services/aiAutomationService';
import { toast } from "@/hooks/use-toast";

interface QuickControlsCardProps {
  leadId: string;
  aiOptIn: boolean;
  onAIOptInChange: (enabled: boolean) => Promise<void>;
}

const QuickControlsCard: React.FC<QuickControlsCardProps> = ({
  leadId,
  aiOptIn,
  onAIOptInChange
}) => {
  const { automation, toggleAutomation, loading } = useFinnEmailAutomation(leadId);

  const handleAIToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Use centralized enableAIForLead for consistent super aggressive setup
        const success = await enableAIForLead(leadId);
        if (!success) {
          throw new Error('Failed to enable AI for lead');
        }
        
        toast({
          title: "AI Messaging Enabled",
          description: "Super aggressive first-day messaging sequence activated",
        });
      } else {
        const success = await pauseAIForLead(leadId, 'Manual disable');
        if (!success) {
          throw new Error('Failed to disable AI for lead');
        }
        
        toast({
          title: "AI Messaging Disabled",
          description: "AI messaging has been turned off",
        });
      }
      
      // Call the parent callback for UI refresh
      await onAIOptInChange(enabled);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AI settings",
        variant: "destructive"
      });
    }
  };

  const handleEmailToggle = async (enabled: boolean) => {
    try {
      const result = await toggleAutomation(enabled);
      if (result.success) {
        toast({
          title: enabled ? "Email automation enabled" : "Email automation disabled",
          description: enabled 
            ? "Finn will now send automated email sequences"
            : "Finn will no longer send automated emails"
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update email automation",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update email automation",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between space-x-6">
          {/* AI Automation Control */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">AI Messages</span>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={aiOptIn}
                onCheckedChange={handleAIToggle}
              />
              <Badge variant={aiOptIn ? "default" : "secondary"} className="text-xs">
                {aiOptIn ? "ON" : "OFF"}
              </Badge>
            </div>
          </div>

          {/* Email Automation Control */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Email Automation</span>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={automation.enabled}
                onCheckedChange={handleEmailToggle}
                disabled={loading}
              />
              <Badge variant={automation.enabled ? "default" : "secondary"} className="text-xs">
                {automation.enabled ? "ON" : "OFF"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickControlsCard;
