import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Pause, 
  SkipForward,
  Download,
  PlayCircle,
  Hand,
  Edit2,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { projectFollowUpSequence, ProjectedSequence, ProjectedTouch } from '@/services/followUpSequenceProjector';
import { format, formatDistanceToNow, addHours } from 'date-fns';
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
  const [editMode, setEditMode] = useState(false);
  const [editedTouches, setEditedTouches] = useState<ProjectedTouch[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const { toast } = useToast();
  
  // Lead data fetched from Supabase
  const [leadData, setLeadData] = useState<{
    leadName: string;
    vehicleInterest?: string;
    currentStatus: string;
    aiOptIn: boolean;
    nextAiSendAt?: string;
  } | null>(null);

  // Fetch lead data when modal opens
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
        .select('first_name, last_name, vehicle_interest, status, ai_opt_in, next_ai_send_at')
        .eq('id', leadId)
        .single();

      if (error) throw error;

      setLeadData({
        leadName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown',
        vehicleInterest: data.vehicle_interest,
        currentStatus: data.status || 'new',
        aiOptIn: data.ai_opt_in || false,
        nextAiSendAt: data.next_ai_send_at
      });
    } catch (error) {
      console.error('Error fetching lead data:', error);
      toast({
        title: "Error",
        description: "Failed to load lead information",
        variant: "destructive"
      });
    }
  };

  const loadSequence = async (customOptions?: any) => {
    setLoading(true);
    try {
      const projected = await projectFollowUpSequence(leadId, customOptions);
      setSequence(projected);
      setEditedTouches(projected.touches);
      if (!customOptions) {
        setSelectedPreset(projected.cadencePattern);
      }
    } catch (error) {
      console.error('Error loading follow-up sequence:', error);
      toast({
        title: "Error",
        description: "Failed to load follow-up sequence",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = async (preset: string) => {
    setSelectedPreset(preset);
    setLoading(true);
    
    const presetCadences: Record<string, number[]> = {
      'aggressive_24h': [0, 8, 16, 32, 56, 120],  // 3 in first 24h, then spread out
      'web': [0, 72, 168, 336, 504, 720],
      'dealer_chat': [0, 24, 120, 240, 360],
      'bdc_transfer': [0, 24, 96, 168, 336],
      'phone': [0, 24, 120, 240, 480]
    };
    
    await loadSequence({
      customCadencePattern: preset,
      customCadence: presetCadences[preset]
    });
  };

  const handleEditTouch = (index: number, field: keyof ProjectedTouch, value: any) => {
    const updated = [...editedTouches];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate day based on scheduledFor if date changes
    if (field === 'scheduledFor' && sequence) {
      const firstTouchDate = new Date(sequence.touches[0].scheduledFor);
      const newDate = new Date(value);
      const hoursDiff = (newDate.getTime() - firstTouchDate.getTime()) / (1000 * 60 * 60);
      updated[index].day = Math.ceil(hoursDiff / 24);
    }
    
    setEditedTouches(updated);
  };

  const handleAddTouch = () => {
    if (!editedTouches.length) return;
    
    const lastTouch = editedTouches[editedTouches.length - 1];
    const newTouch: ProjectedTouch = {
      day: lastTouch.day + 3,
      scheduledFor: addHours(new Date(lastTouch.scheduledFor), 72),
      messageIntent: 'Follow-up',
      strategy: 'Custom touch',
      sourcePattern: 'custom',
      confidenceScore: 0.5,
      expectedOutcome: 'Continue engagement',
      automatable: true,
      engagementPrediction: 0.3
    };
    
    setEditedTouches([...editedTouches, newTouch]);
  };

  const handleRemoveTouch = (index: number) => {
    if (editedTouches.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "Sequence must have at least one touch",
        variant: "destructive"
      });
      return;
    }
    
    setEditedTouches(editedTouches.filter((_, i) => i !== index));
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      
      // Convert edited touches to custom cadence (hours from first touch)
      const firstTouchDate = new Date(editedTouches[0].scheduledFor);
      const customCadence = editedTouches.map(touch => {
        const touchDate = new Date(touch.scheduledFor);
        return Math.round((touchDate.getTime() - firstTouchDate.getTime()) / (1000 * 60 * 60));
      });
      
      await loadSequence({ 
        customCadence,
        customCadencePattern: 'custom'
      });
      
      setEditMode(false);
      toast({
        title: "Schedule updated",
        description: "Follow-up sequence has been saved"
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (sequence) {
      setEditedTouches(sequence.touches);
    }
    setEditMode(false);
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

  const getStatusBadge = (touch: ProjectedTouch) => {
    const now = new Date();
    if (touch.scheduledFor < now) return <Badge variant="default" className="bg-green-600">SENT</Badge>;
    if (touch.day <= 1) return <Badge variant="default">SCHEDULED</Badge>;
    return <Badge variant="secondary">PLANNED</Badge>;
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {(loading && !sequence) || !leadData ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sequence && leadData && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Follow-Up Plan: {leadData.leadName}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  {!editMode ? (
                    <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Schedule
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveChanges} disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
                <TabsTrigger value="predictions">Predictions</TabsTrigger>
                <TabsTrigger value="controls">Controls</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline">
                <div className="space-y-4 py-4">
                  {editMode && (
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                      <Label>Quick Presets</Label>
                      <Select value={selectedPreset} onValueChange={handlePresetChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a preset cadence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aggressive_24h">🔥 Aggressive - 3 touches in 24 hours</SelectItem>
                          <SelectItem value="web">🌐 Web Lead - Standard</SelectItem>
                          <SelectItem value="dealer_chat">💬 Dealer Chat - Direct</SelectItem>
                          <SelectItem value="bdc_transfer">📞 BDC Transfer - Warm</SelectItem>
                          <SelectItem value="phone">📱 Phone Inquiry - Balanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-xs text-muted-foreground">{leadData.currentStatus}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">AI Status</p>
                      <Badge variant={leadData.aiOptIn ? "default" : "secondary"}>
                        {leadData.aiOptIn ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Conversion Probability</p>
                      <div className="flex items-center gap-2">
                        <Progress value={sequence.conversionProbability * 100} className="w-20" />
                        <span className="text-sm font-semibold">
                          {Math.round(sequence.conversionProbability * 100)}%
                        </span>
                      </div>
                    </div>
                    {sequence.isCustomSchedule && (
                      <div>
                        <Badge variant="outline">Custom Schedule</Badge>
                      </div>
                    )}
                  </div>

                  {editMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddTouch}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Touch Point
                    </Button>
                  )}
                  
                  <div className="relative">
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-border" />
                    
                    {(editMode ? editedTouches : sequence.touches).map((touch, index) => {
                      return (
                        <div key={index} className="relative pl-16 pb-8">
                          <div className={`absolute left-6 top-2 w-5 h-5 rounded-full flex items-center justify-center ${
                            getStatusColor(touch)
                          }`}>
                            {getStatusIcon(touch)}
                          </div>
                          
                          <div className="border rounded-lg p-4 space-y-3 bg-card">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">Day {touch.day}</Badge>
                                  {editMode ? (
                                    <Input
                                      value={touch.messageIntent}
                                      onChange={(e) => handleEditTouch(index, 'messageIntent', e.target.value)}
                                      className="h-8 max-w-[200px]"
                                    />
                                  ) : (
                                    <h4 className="font-semibold">{touch.messageIntent}</h4>
                                  )}
                                  {getStatusBadge(touch)}
                                  {editMode && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveTouch(index)}
                                      className="ml-auto"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                                {editMode ? (
                                  <Input
                                    type="datetime-local"
                                    value={format(new Date(touch.scheduledFor), "yyyy-MM-dd'T'HH:mm")}
                                    onChange={(e) => handleEditTouch(index, 'scheduledFor', new Date(e.target.value))}
                                    className="h-8 max-w-[250px] text-sm"
                                  />
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(touch.scheduledFor), 'MMM d, yyyy • h:mm a')}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Confidence</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={touch.confidenceScore * 100} className="w-16" />
                                  <span className="text-sm font-semibold">
                                    {Math.round(touch.confidenceScore * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <Eye className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs font-medium">Strategy</p>
                                  {editMode ? (
                                    <Input
                                      value={touch.strategy}
                                      onChange={(e) => handleEditTouch(index, 'strategy', e.target.value)}
                                      className="h-8 text-sm mt-1"
                                    />
                                  ) : (
                                    <p className="text-sm text-muted-foreground">{touch.strategy}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs font-medium">Expected Outcome</p>
                                  {editMode ? (
                                    <Input
                                      value={touch.expectedOutcome}
                                      onChange={(e) => handleEditTouch(index, 'expectedOutcome', e.target.value)}
                                      className="h-8 text-sm mt-1"
                                    />
                                  ) : (
                                    <p className="text-sm text-muted-foreground">{touch.expectedOutcome}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">
                                  Engagement prediction: {Math.round(touch.engagementPrediction * 100)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="strategy" className="space-y-4 py-4">
                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="font-semibold">Why This Sequence?</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Lead Source:</strong> {sequence.source}</p>
                    <p><strong>Cadence Pattern:</strong> {sequence.cadencePattern}</p>
                    <p className="text-muted-foreground">
                      This cadence is optimized based on historical performance with similar leads from this source.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="predictions" className="space-y-4 py-4">
                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="font-semibold">Expected Outcomes</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Overall Conversion Probability:</strong> {Math.round(sequence.conversionProbability * 100)}%</p>
                    <p><strong>Total Duration:</strong> {sequence.totalDuration} days</p>
                    <p className="text-muted-foreground">
                      Based on analysis of similar leads with this source and engagement pattern.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="controls" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="w-full">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Sequence
                  </Button>
                  <Button variant="outline" className="w-full">
                    <SkipForward className="h-4 w-4 mr-2" />
                    Skip Next Touch
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Hand className="h-4 w-4 mr-2" />
                    Take Over Manually
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Plan
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
