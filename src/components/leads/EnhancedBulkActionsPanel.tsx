
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MessageSquare, 
  UserCheck, 
  UserX, 
  Trash2, 
  X,
  Mail,
  Bot,
  MessageCircle,
  Shield,
  Zap
} from "lucide-react";
import BulkEmailAction from "./BulkEmailAction";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  status: string;
  vehicle_interest?: string;
  ai_contact_enabled?: boolean;
  ai_replies_enabled?: boolean;
  ai_opt_in?: boolean;
}

interface EnhancedBulkActionsPanelProps {
  selectedLeads: Lead[];
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: string) => void;
  onBulkDelete: () => void;
  onBulkMessage: () => void;
  onRefresh: () => void;
}

const EnhancedBulkActionsPanel = ({
  selectedLeads,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkDelete,
  onBulkMessage,
  onRefresh,
}: EnhancedBulkActionsPanelProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedLeads.length === 0) return null;

  // Calculate AI status distribution
  const aiStats = selectedLeads.reduce((acc, lead) => {
    if (lead.ai_contact_enabled) acc.contactEnabled++;
    if (lead.ai_replies_enabled) acc.repliesEnabled++;
    if (lead.ai_contact_enabled && lead.ai_replies_enabled) acc.bothEnabled++;
    if (!lead.ai_contact_enabled && !lead.ai_replies_enabled) acc.noneEnabled++;
    return acc;
  }, { contactEnabled: 0, repliesEnabled: 0, bothEnabled: 0, noneEnabled: 0 });

  const handleBulkAIContactEnable = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_contact_enabled: true,
          ai_stage: 'ready_for_contact',
          next_ai_send_at: new Date().toISOString()
        })
        .in('id', selectedLeads.map(lead => lead.id));

      if (error) throw error;

      toast({
        title: "AI Contact Enabled",
        description: `Enabled AI contact for ${selectedLeads.length} leads. They're ready for proactive messaging.`,
      });

      onRefresh();
      onClearSelection();
    } catch (error) {
      console.error('Error enabling AI contact:', error);
      toast({
        title: "Error",
        description: "Failed to enable AI contact",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAIRepliesEnable = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_replies_enabled: true })
        .in('id', selectedLeads.map(lead => lead.id));

      if (error) throw error;

      toast({
        title: "AI Replies Enabled",
        description: `Enabled AI auto-replies for ${selectedLeads.length} leads. AI will respond to incoming messages.`,
      });

      onRefresh();
      onClearSelection();
    } catch (error) {
      console.error('Error enabling AI replies:', error);
      toast({
        title: "Error",
        description: "Failed to enable AI replies",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAIDisable = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_contact_enabled: false,
          ai_replies_enabled: false,
          ai_opt_in: false,
          ai_sequence_paused: true,
          ai_pause_reason: 'bulk_disabled'
        })
        .in('id', selectedLeads.map(lead => lead.id));

      if (error) throw error;

      toast({
        title: "AI Disabled",
        description: `Disabled all AI automation for ${selectedLeads.length} leads.`,
      });

      onRefresh();
      onClearSelection();
    } catch (error) {
      console.error('Error disabling AI:', error);
      toast({
        title: "Error",
        description: "Failed to disable AI",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg">Bulk Actions</CardTitle>
            <Badge variant="secondary">
              {selectedLeads.length} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* AI Status Overview */}
          <div className="flex items-center space-x-2 text-sm">
            <div className="flex items-center space-x-1">
              <Bot className="w-4 h-4 text-blue-500" />
              <span>{aiStats.contactEnabled} Contact</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4 text-green-500" />
              <span>{aiStats.repliesEnabled} Replies</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-4 h-4 text-purple-500" />
              <span>{aiStats.bothEnabled} Both</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="w-4 h-4 text-gray-500" />
              <span>{aiStats.noneEnabled} None</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* AI Control Actions */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-blue-700">AI Automation Controls</h4>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBulkAIContactEnable}
                disabled={isProcessing}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Bot className="w-4 h-4 mr-2" />
                Enable AI Contact
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBulkAIRepliesEnable}
                disabled={isProcessing}
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Enable AI Replies
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBulkAIDisable}
                disabled={isProcessing}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                <Shield className="w-4 h-4 mr-2" />
                Disable All AI
              </Button>
            </div>
          </div>

          <Separator />
          
          {/* Standard Actions */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-700">Standard Actions</h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onBulkMessage}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Send SMS
              </Button>
              
              <BulkEmailAction
                selectedLeads={selectedLeads}
                onComplete={onClearSelection}
              />
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onBulkStatusUpdate("qualified")}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Mark Qualified
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onBulkStatusUpdate("unqualified")}
              >
                <UserX className="w-4 h-4 mr-2" />
                Mark Unqualified
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={onBulkDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedBulkActionsPanel;
