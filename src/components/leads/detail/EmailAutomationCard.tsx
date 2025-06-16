
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Mail, Bot, Clock, Pause, Play } from 'lucide-react';
import { finnEmailService } from '@/services/finnEmailService';
import { toast } from '@/hooks/use-toast';

interface EmailAutomationCardProps {
  leadId: string;
}

const EmailAutomationCard: React.FC<EmailAutomationCardProps> = ({ leadId }) => {
  const [automation, setAutomation] = useState({
    enabled: false,
    currentStage: null,
    paused: false,
    nextEmailAt: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAutomationStatus();
  }, [leadId]);

  const loadAutomationStatus = async () => {
    const status = await finnEmailService.getEmailAutomationStatus(leadId);
    setAutomation(status);
  };

  const handleToggleAutomation = async (enabled: boolean) => {
    setLoading(true);
    try {
      const result = await finnEmailService.toggleEmailAutomation(leadId, enabled);
      
      if (result.success) {
        setAutomation(prev => ({ ...prev, enabled }));
        toast({
          title: enabled ? "Email automation enabled" : "Email automation disabled",
          description: enabled 
            ? "Finn will now send automated email sequences for this lead"
            : "Finn will no longer send automated emails for this lead"
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
    } finally {
      setLoading(false);
    }
  };

  const formatNextEmailTime = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bot className="w-5 h-5" />
          <span>Finn Email Automation</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4" />
            <span className="text-sm font-medium">Email Sequences</span>
          </div>
          <Switch
            checked={automation.enabled}
            onCheckedChange={handleToggleAutomation}
            disabled={loading}
          />
        </div>

        {automation.enabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Stage:</span>
              <Badge variant="outline">
                {automation.currentStage?.replace('_', ' ').toUpperCase() || 'STARTING'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <div className="flex items-center space-x-1">
                {automation.paused ? (
                  <Pause className="w-3 h-3 text-yellow-500" />
                ) : (
                  <Play className="w-3 h-3 text-green-500" />
                )}
                <span className="text-sm">
                  {automation.paused ? 'Paused' : 'Active'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Next Email:</span>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs">
                  {formatNextEmailTime(automation.nextEmailAt)}
                </span>
              </div>
            </div>
          </div>
        )}

        {!automation.enabled && (
          <div className="text-sm text-muted-foreground">
            Enable to start automated email sequences coordinated with SMS campaigns
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailAutomationCard;
