import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  Mail, 
  Car, 
  Bot, 
  Calendar, 
  MessageSquare,
  Check, 
  X, 
  EyeOff, 
  Star,
  AlertTriangle,
  Clock,
  Settings,
  UserCheck,
  UserX,
  Heart,
  Pause,
  Play
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { markLeadAsLost, markLeadAsSold } from '@/services/leadStatusService';
import { useLeadsOperations } from '@/hooks/leads/useLeadsOperations';
import MarkLostConfirmDialog from '../leads/MarkLostConfirmDialog';

interface LeadData {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  vehicleInterest: string;
  source: string;
  status: string;
  aiOptIn: boolean;
  aiStage: string;
  messageIntensity: string;
  aiSequencePaused: boolean;
  nextAiSendAt?: string;
  messagesSent: number;
  lastReply?: string;
  engagementScore: number;
  leadScore: number;
  createdAt: string;
  updatedAt: string;
}

interface LeadProcessingModalProps {
  leadId: string;
  trigger: React.ReactNode;
  onLeadUpdated?: () => void;
}

const LeadProcessingModal: React.FC<LeadProcessingModalProps> = ({
  leadId,
  trigger,
  onLeadUpdated
}) => {
  const [open, setOpen] = useState(false);
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMarkLostDialog, setShowMarkLostDialog] = useState(false);
  
  // Form states
  const [aiOptIn, setAiOptIn] = useState(false);
  const [messageIntensity, setMessageIntensity] = useState('gentle');
  const [aiSequencePaused, setAiSequencePaused] = useState(false);
  const [leadScore, setLeadScore] = useState(0);
  const [notes, setNotes] = useState('');
  const [followUpDays, setFollowUpDays] = useState('1');

  const { updateAiOptIn } = useLeadsOperations();

  useEffect(() => {
    if (open && leadId) {
      fetchLeadData();
    }
  }, [open, leadId]);

  const fetchLeadData = async () => {
    setLoading(true);
    try {
      const { data: lead, error } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          email,
          vehicle_interest,
          source,
          status,
          ai_opt_in,
          ai_stage,
          message_intensity,
          ai_sequence_paused,
          next_ai_send_at,
          ai_messages_sent,
          lead_score,
          created_at,
          updated_at,
          phone_numbers (number, is_primary),
          conversations (body, direction, sent_at)
        `)
        .eq('id', leadId)
        .single();

      if (error) throw error;

      const primaryPhone = lead.phone_numbers?.find(p => p.is_primary)?.number || '';
      const lastIncoming = lead.conversations
        ?.filter(c => c.direction === 'in')
        ?.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

      const totalOutgoing = lead.conversations?.filter(c => c.direction === 'out').length || 0;
      const totalIncoming = lead.conversations?.filter(c => c.direction === 'in').length || 0;
      const engagementScore = totalOutgoing > 0 ? Math.round((totalIncoming / totalOutgoing) * 100) : 0;

      const leadDataFormatted: LeadData = {
        id: lead.id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        phoneNumber: primaryPhone,
        email: lead.email,
        vehicleInterest: lead.vehicle_interest,
        source: lead.source,
        status: lead.status,
        aiOptIn: lead.ai_opt_in || false,
        aiStage: lead.ai_stage || 'initial',
        messageIntensity: lead.message_intensity || 'gentle',
        aiSequencePaused: lead.ai_sequence_paused || false,
        nextAiSendAt: lead.next_ai_send_at,
        messagesSent: lead.ai_messages_sent || 0,
        lastReply: lastIncoming?.body,
        engagementScore,
        leadScore: lead.lead_score || 0,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at
      };

      setLeadData(leadDataFormatted);
      
      // Set form states
      setAiOptIn(leadDataFormatted.aiOptIn);
      setMessageIntensity(leadDataFormatted.messageIntensity);
      setAiSequencePaused(leadDataFormatted.aiSequencePaused);
      setLeadScore(leadDataFormatted.leadScore);

    } catch (error) {
      console.error('Error fetching lead data:', error);
      toast({
        title: "Error",
        description: "Failed to load lead data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!leadData) return;
    
    setSaving(true);
    try {
      // Update lead data
      const nextSendAt = aiSequencePaused ? null : new Date(Date.now() + parseInt(followUpDays) * 24 * 60 * 60 * 1000).toISOString();
      
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          ai_opt_in: aiOptIn,
          message_intensity: messageIntensity,
          ai_sequence_paused: aiSequencePaused,
          lead_score: leadScore,
          next_ai_send_at: nextSendAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadData.id);

      if (leadError) throw leadError;

      // Add note if provided
      if (notes.trim()) {
        const { data: userData } = await supabase.auth.getUser();
        const { error: noteError } = await supabase
          .from('lead_notes')
          .insert({
            lead_id: leadData.id,
            content: notes.trim(),
            created_by: userData.user?.id || ''
          });

        if (noteError) {
          console.error('Error saving note:', noteError);
        }
      }

      toast({
        title: "Lead Updated",
        description: "Lead processing settings have been saved successfully.",
      });

      setOpen(false);
      if (onLeadUpdated) onLeadUpdated();

    } catch (error) {
      console.error('Error saving lead updates:', error);
      toast({
        title: "Error",
        description: "Failed to save lead updates",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsSold = async () => {
    if (!leadData) return;
    
    setSaving(true);
    try {
      const result = await markLeadAsSold(leadData.id);
      
      if (result.success) {
        toast({
          title: "Lead Marked as Sold",
          description: `${leadData.firstName} ${leadData.lastName} has been marked as sold. Congratulations!`,
        });
        
        setOpen(false);
        if (onLeadUpdated) onLeadUpdated();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark lead as sold",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsLost = async () => {
    if (!leadData) return;
    
    setSaving(true);
    try {
      const result = await markLeadAsLost(leadData.id);
      
      if (result.success) {
        toast({
          title: "Lead Marked as Lost",
          description: `${leadData.firstName} ${leadData.lastName} has been marked as lost and removed from automation.`,
        });
        
        setOpen(false);
        if (onLeadUpdated) onLeadUpdated();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark lead as lost",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
      setShowMarkLostDialog(false);
    }
  };

  const handleHideLead = async () => {
    if (!leadData) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          is_hidden: true,
          ai_opt_in: false,
          ai_sequence_paused: true,
          ai_pause_reason: 'lead_hidden',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadData.id);

      if (error) throw error;

      toast({
        title: "Lead Hidden",
        description: `${leadData.firstName} ${leadData.lastName} has been hidden from view.`,
      });

      setOpen(false);
      if (onLeadUpdated) onLeadUpdated();

    } catch (error) {
      console.error('Error hiding lead:', error);
      toast({
        title: "Error",
        description: "Failed to hide lead",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'closed': return 'secondary';
      case 'lost': return 'destructive';
      case 'active': return 'default';
      default: return 'outline';
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Lead Processing
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading lead data...</p>
              </div>
            </div>
          ) : leadData ? (
            <div className="space-y-6">
              {/* Lead Info Header */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {leadData.firstName} {leadData.lastName}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {leadData.vehicleInterest}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusBadgeVariant(leadData.status)}>
                        {leadData.status}
                      </Badge>
                      <Badge variant="outline">
                        Score: {leadData.leadScore}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{leadData.phoneNumber || 'No phone'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{leadData.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span>{leadData.messagesSent} messages sent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <span>{leadData.engagementScore}% engagement</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Lead Status Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      onClick={handleMarkAsSold}
                      disabled={saving || leadData.status === 'closed'}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {saving ? 'Processing...' : 'Mark as Sold'}
                    </Button>
                    
                    <Button 
                      variant="destructive"
                      onClick={() => setShowMarkLostDialog(true)}
                      disabled={saving || leadData.status === 'lost'}
                      className="w-full"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      {saving ? 'Processing...' : 'Mark as Lost'}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={handleHideLead}
                      disabled={saving}
                      className="w-full"
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      {saving ? 'Processing...' : 'Hide Lead'}
                    </Button>
                  </CardContent>
                </Card>

                {/* AI Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      AI Automation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ai-optin">AI Messaging</Label>
                      <Switch
                        id="ai-optin"
                        checked={aiOptIn}
                        onCheckedChange={setAiOptIn}
                        disabled={leadData.status === 'lost' || leadData.status === 'closed'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Message Intensity</Label>
                      <Select value={messageIntensity} onValueChange={setMessageIntensity}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gentle">Gentle</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="ai-paused">Pause AI Sequence</Label>
                      <Switch
                        id="ai-paused"
                        checked={aiSequencePaused}
                        onCheckedChange={setAiSequencePaused}
                      />
                    </div>

                    {!aiSequencePaused && (
                      <div className="space-y-2">
                        <Label>Next Follow-up (days)</Label>
                        <Input
                          type="number"
                          value={followUpDays}
                          onChange={(e) => setFollowUpDays(e.target.value)}
                          min="1"
                          max="30"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Lead Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Lead Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Lead Score</Label>
                      <Input
                        type="number"
                        value={leadScore}
                        onChange={(e) => setLeadScore(parseInt(e.target.value) || 0)}
                        min="0"
                        max="100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`tel:${leadData.phoneNumber}`, '_self')}
                        disabled={!leadData.phoneNumber}
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        Call
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`mailto:${leadData.email}`, '_self')}
                        disabled={!leadData.email}
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Processing Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Add notes about this lead processing..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-8">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Failed to load lead data</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MarkLostConfirmDialog
        open={showMarkLostDialog}
        onOpenChange={setShowMarkLostDialog}
        onConfirm={handleMarkAsLost}
        leadCount={1}
        leadName={leadData ? `${leadData.firstName} ${leadData.lastName}` : ''}
      />
    </>
  );
};

export default LeadProcessingModal;