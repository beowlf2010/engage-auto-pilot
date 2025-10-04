import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Zap,
  Globe,
  MessageSquare,
  Phone
} from 'lucide-react';
import { projectFollowUpSequence, ProjectedSequence, ProjectedTouch } from '@/services/followUpSequenceProjector';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LeadFollowUpModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
}

export function LeadFollowUpModal({
  open,
  onClose,
  leadId
}: LeadFollowUpModalProps) {
  const [sequence, setSequence] = useState<ProjectedSequence | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [leadData, setLeadData] = useState<{
    leadName: string;
    vehicleInterest?: string;
    currentStatus: string;
    aiOptIn: boolean;
  } | null>(null);

  useEffect(() => {
    if (open && leadId) {
      fetchLeadData();
      loadSequence();
    }
  }, [open, leadId]);

  const fetchLeadData = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('first_name, last_name, vehicle_interest, status, ai_opt_in')
        .eq('id', leadId)
        .single();

      if (error) throw error;

      setLeadData({
        leadName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown',
        vehicleInterest: data.vehicle_interest,
        currentStatus: data.status || 'new',
        aiOptIn: data.ai_opt_in || false
      });
    } catch (error) {
      console.error('Error fetching lead data:', error);
    }
  };

  const loadSequence = async (customPattern?: string) => {
    setLoading(true);
    try {
      const options = customPattern ? { customCadencePattern: customPattern } : undefined;
      const projected = await projectFollowUpSequence(leadId, options);
      setSequence(projected);
    } catch (error) {
      console.error('Error loading sequence:', error);
      toast({
        title: "Error",
        description: "Failed to load follow-up plan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = async (preset: string) => {
    try {
      setLoading(true);
      
      // Reload sequence with new preset pattern
      await loadSequence(preset);
      
      toast({
        title: "Schedule Preview Updated",
        description: `Viewing ${getPresetLabel(preset)} sequence`,
      });
    } catch (error) {
      console.error('Error updating preset:', error);
      toast({
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPresetLabel = (preset: string) => {
    const labels: Record<string, string> = {
      'aggressive_24h': 'Aggressive (24h)',
      'web': 'Web Lead',
      'dealer_chat': 'Dealer Chat',
      'bdc_transfer': 'BDC Transfer'
    };
    return labels[preset] || preset;
  };

  const getPresetIcon = (preset: string) => {
    const icons: Record<string, React.ReactNode> = {
      'aggressive_24h': <Zap className="h-4 w-4" />,
      'web': <Globe className="h-4 w-4" />,
      'dealer_chat': <MessageSquare className="h-4 w-4" />,
      'bdc_transfer': <Phone className="h-4 w-4" />
    };
    return icons[preset] || <Calendar className="h-4 w-4" />;
  };

  const getStatusColor = (touch: ProjectedTouch) => {
    const now = new Date();
    if (touch.scheduledFor < now) return 'bg-green-500';
    if (touch.day <= 1) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getStatusIcon = (touch: ProjectedTouch) => {
    const now = new Date();
    if (touch.scheduledFor < now) return <CheckCircle2 className="h-3 w-3 text-white" />;
    if (touch.day <= 1) return <Calendar className="h-3 w-3 text-white" />;
    return <Clock className="h-3 w-3 text-white" />;
  };

  const presets = [
    { value: 'aggressive_24h', label: 'Aggressive (24h)', icon: Zap },
    { value: 'web', label: 'Web Lead', icon: Globe },
    { value: 'dealer_chat', label: 'Dealer Chat', icon: MessageSquare },
    { value: 'bdc_transfer', label: 'BDC Transfer', icon: Phone }
  ];

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {loading && !sequence ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sequence && leadData ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                AI Follow-Up Plan: {leadData.leadName}
              </DialogTitle>
            </DialogHeader>

            {/* Lead Status */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">AI Enabled</p>
                    <Badge variant={leadData.aiOptIn ? 'default' : 'secondary'} className="mt-1">
                      {leadData.aiOptIn ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Pattern</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {sequence.cadencePattern.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Conversion Probability</p>
                    <p className="font-semibold mt-1">{Math.round(sequence.conversionProbability * 100)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions - Preset Buttons */}
            <div>
              <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => {
                  const Icon = preset.icon;
                  const isActive = sequence.cadencePattern === preset.value;
                  return (
                    <Button
                      key={preset.value}
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => handlePresetChange(preset.value)}
                      disabled={loading || isActive}
                      className="justify-start"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {preset.label}
                      {isActive && <Badge variant="secondary" className="ml-auto">Active</Badge>}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Timeline - Read Only */}
            <div>
              <h3 className="text-sm font-medium mb-3">Planned Timeline</h3>
              <div className="space-y-3">
                {sequence.touches.map((touch, index) => {
                  const now = new Date();
                  const isPast = touch.scheduledFor < now;
                  const isToday = touch.day <= 1;

                  return (
                    <div
                      key={index}
                      className={`relative border rounded-lg p-4 transition-colors ${
                        isPast ? 'bg-green-50 border-green-200' : 
                        isToday ? 'bg-blue-50 border-blue-200' : 
                        'bg-card'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status Indicator */}
                        <div className={`mt-1 rounded-full ${getStatusColor(touch)} p-1.5`}>
                          {getStatusIcon(touch)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">Day {touch.day}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(touch.scheduledFor, 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                            <Badge variant={isPast ? 'default' : isToday ? 'secondary' : 'outline'}>
                              {isPast ? 'Sent' : isToday ? 'Today' : 'Scheduled'}
                            </Badge>
                          </div>

                          <div className="text-sm space-y-1">
                            <p><strong>Strategy:</strong> {touch.strategy}</p>
                            <p className="text-muted-foreground">{touch.expectedOutcome}</p>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Confidence: {Math.round(touch.confidenceScore * 100)}%</span>
                            <span>•</span>
                            <span>Engagement: {Math.round(touch.engagementPrediction * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
