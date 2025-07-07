import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Clock, AlertCircle, CheckCircle, XCircle, Car, MessageSquare, Calendar, FileText, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { checkCallCompliance, formatNextAvailableTime, getLeadTimezoneInfo } from '@/services/timeZoneComplianceService';
import { calculateLeadPriority } from '@/services/leadTemperaturePrioritization';
import { recordCallOutcome } from '@/services/callOutcomeService';
import { toast } from '@/hooks/use-toast';

interface QueueLead {
  id: string;
  first_name: string;
  last_name: string;
  state?: string;
  city?: string;
  vehicle_interest?: string;
  source?: string;
  status?: string;
  created_at?: string;
  last_reply_at?: string;
  phone_numbers?: Array<{
    id: string;
    number: string;
    type: string;
    is_primary: boolean;
  }>;
  priority_score?: number;
  compliance_status?: 'allowed' | 'blocked' | 'scheduled';
  next_available_time?: Date;
  lead_timezone?: string;
  recent_calls?: Array<{
    id: string;
    outcome: string;
    duration_seconds: number;
    created_at: string;
    notes: string;
  }>;
  recent_messages?: Array<{
    id: string;
    body: string;
    direction: string;
    sent_at: string;
  }>;
  appointments?: Array<{
    id: string;
    scheduled_at: string;
    status: string;
    title: string;
  }>;
}

const AutoDialQueue = () => {
  const [queueLeads, setQueueLeads] = useState<QueueLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingLeadId, setProcessingLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetchQueueLeads();
  }, []);

  const fetchQueueLeads = async () => {
    try {
      setLoading(true);
      
      // Fetch leads with comprehensive information
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          id, first_name, last_name, state, city, do_not_call,
          vehicle_interest, source, status, created_at, last_reply_at,
          phone_numbers (
            id, number, type, is_primary
          )
        `)
        .eq('do_not_call', false)
        .not('phone_numbers', 'is', null)
        .limit(20)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process each lead for compliance and priority
      const leadIds = leads?.map(lead => lead.id) || [];
      const prioritizedLeads = leadIds.length > 0 ? await calculateLeadPriority(leadIds) : [];
      const processedLeads: QueueLead[] = [];
      
      for (const lead of leads || []) {
        // Check compliance
        const compliance = await checkCallCompliance(lead.id);
        
        // Find priority score from the prioritized leads
        const priorityLead = prioritizedLeads.find(p => p.id === lead.id);
        const priorityScore = priorityLead?.priority_score || 0;
        
        // Fetch recent call history
        const { data: recentCalls } = await supabase
          .from('call_history')
          .select('id, outcome, duration_seconds, created_at, notes')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(3);

        // Fetch recent messages
        const { data: recentMessages } = await supabase
          .from('conversations')
          .select('id, body, direction, sent_at')
          .eq('lead_id', lead.id)
          .order('sent_at', { ascending: false })
          .limit(3);

        // Fetch appointments
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id, scheduled_at, status, title')
          .eq('lead_id', lead.id)
          .order('scheduled_at', { ascending: false })
          .limit(3);
        
        processedLeads.push({
          ...lead,
          priority_score: priorityScore,
          compliance_status: compliance.canCall ? 'allowed' : 'blocked',
          next_available_time: compliance.nextAvailableTime,
          lead_timezone: compliance.leadTimezone,
          recent_calls: recentCalls || [],
          recent_messages: recentMessages || [],
          appointments: appointments || []
        });
      }

      // Sort by priority score (descending)
      processedLeads.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
      
      setQueueLeads(processedLeads);
    } catch (error) {
      console.error('Error fetching queue leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch calling queue',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCallLead = async (lead: QueueLead, phoneNumber: string, phoneType: string) => {
    setProcessingLeadId(lead.id);
    
    try {
      // Simulate call initiation (replace with actual Twilio integration)
      console.log(`Initiating call to ${phoneNumber} for lead ${lead.id}`);
      
      // For now, we'll simulate a call outcome
      const outcome = await recordCallOutcome({
        call_id: `call_${Date.now()}`,
        lead_id: lead.id,
        outcome: 'answered', // This would come from actual call result
        duration: 120,
        notes: `Called ${phoneType} number`
      });

      if (outcome.success) {
        toast({
          title: 'Call Initiated',
          description: `Calling ${lead.first_name} ${lead.last_name}`,
        });
        
        // Refresh the queue
        fetchQueueLeads();
      } else {
        throw new Error(outcome.error);
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast({
        title: 'Call Failed',
        description: 'Failed to initiate call',
        variant: 'destructive'
      });
    } finally {
      setProcessingLeadId(null);
    }
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'allowed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'blocked':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPhoneNumbers = (lead: QueueLead) => {
    return lead.phone_numbers || [];
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const LeadHistoryModal = ({ lead }: { lead: QueueLead }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lead.first_name} {lead.last_name} - Complete History
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="calls">Call History</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Vehicle of Interest
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{lead.vehicle_interest || 'Not specified'}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs space-y-1">
                    <p><strong>Source:</strong> {lead.source || 'Unknown'}</p>
                    <p><strong>Status:</strong> {lead.status || 'Unknown'}</p>
                    <p><strong>Created:</strong> {lead.created_at ? formatDate(lead.created_at) : 'Unknown'}</p>
                    <p><strong>Last Reply:</strong> {lead.last_reply_at ? formatDate(lead.last_reply_at) : 'Never'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{lead.recent_calls?.length || 0}</div>
                    <div className="text-xs text-gray-500">Recent Calls</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{lead.recent_messages?.length || 0}</div>
                    <div className="text-xs text-gray-500">Recent Messages</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{lead.appointments?.length || 0}</div>
                    <div className="text-xs text-gray-500">Appointments</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="calls" className="space-y-2">
            {lead.recent_calls && lead.recent_calls.length > 0 ? (
              lead.recent_calls.map((call) => (
                <Card key={call.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant={call.outcome === 'answered' ? 'default' : 'secondary'}>
                          {call.outcome}
                        </Badge>
                        <p className="text-sm mt-1">{formatDate(call.created_at)}</p>
                        {call.duration_seconds > 0 && (
                          <p className="text-xs text-gray-500">Duration: {formatDuration(call.duration_seconds)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {call.notes && (
                          <p className="text-xs text-gray-600 max-w-xs">{call.notes}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No call history</div>
            )}
          </TabsContent>
          
          <TabsContent value="messages" className="space-y-2">
            {lead.recent_messages && lead.recent_messages.length > 0 ? (
              lead.recent_messages.map((message) => (
                <Card key={message.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Badge variant={message.direction === 'in' ? 'default' : 'outline'}>
                          {message.direction === 'in' ? 'Incoming' : 'Outgoing'}
                        </Badge>
                        <p className="text-sm mt-2">{message.body}</p>
                      </div>
                      <div className="text-xs text-gray-500 ml-2">
                        {formatDate(message.sent_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No message history</div>
            )}
          </TabsContent>
          
          <TabsContent value="appointments" className="space-y-2">
            {lead.appointments && lead.appointments.length > 0 ? (
              lead.appointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{appointment.title}</h4>
                        <p className="text-sm text-gray-600">{formatDate(appointment.scheduled_at)}</p>
                      </div>
                      <Badge variant={appointment.status === 'scheduled' ? 'default' : 'secondary'}>
                        {appointment.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No appointments</div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Auto Dial Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Auto Dial Queue ({queueLeads.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {queueLeads.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No leads in calling queue
          </div>
        ) : (
          queueLeads.map((lead) => {
            const phoneNumbers = getPhoneNumbers(lead);
            const timezoneInfo = getLeadTimezoneInfo(lead.state, lead.city);
            
            return (
              <div key={lead.id} className="border rounded-lg p-4 space-y-4">
                {/* Header with name and priority */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">
                      {lead.first_name} {lead.last_name}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{lead.city}, {lead.state}</span>
                      <span>•</span>
                      <span>{lead.source || 'Unknown Source'}</span>
                      {timezoneInfo.isDifferentFromLocal && (
                        <Badge variant="outline" className="text-xs">
                          {timezoneInfo.localTime}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      Priority: {Math.round(lead.priority_score || 0)}
                    </Badge>
                    {getComplianceIcon(lead.compliance_status || 'unknown')}
                  </div>
                </div>

                {/* Vehicle of Interest */}
                {lead.vehicle_interest && (
                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                    <div className="flex items-center gap-2 mb-1">
                      <Car className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Vehicle of Interest</span>
                    </div>
                    <p className="text-sm text-blue-700">{truncateText(lead.vehicle_interest, 80)}</p>
                  </div>
                )}

                {/* Quick History Summary */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Phone className="w-3 h-3" />
                    <span>{lead.recent_calls?.length || 0} calls</span>
                    {lead.recent_calls && lead.recent_calls.length > 0 && (
                      <span className="text-gray-500">
                        (Last: {lead.recent_calls[0]?.outcome})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <MessageSquare className="w-3 h-3" />
                    <span>{lead.recent_messages?.length || 0} messages</span>
                    {lead.last_reply_at && (
                      <span className="text-gray-500">
                        (Last: {formatDate(lead.last_reply_at).split(',')[0]})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>{lead.appointments?.length || 0} appts</span>
                  </div>
                </div>

                {/* Recent Messages Preview */}
                {lead.recent_messages && lead.recent_messages.length > 0 && (
                  <div className="bg-gray-50 p-2 rounded border">
                    <div className="text-xs font-medium text-gray-700 mb-1">Recent Message:</div>
                    <div className="text-xs text-gray-600">
                      <Badge variant={lead.recent_messages[0].direction === 'in' ? 'default' : 'outline'} className="text-xs mr-1">
                        {lead.recent_messages[0].direction === 'in' ? 'In' : 'Out'}
                      </Badge>
                      {truncateText(lead.recent_messages[0].body, 60)}
                    </div>
                  </div>
                )}

                {/* Compliance Warning */}
                {lead.compliance_status === 'blocked' && lead.next_available_time && (
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                    Next available: {formatNextAvailableTime(lead.next_available_time, lead.lead_timezone || 'America/New_York')}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <LeadHistoryModal lead={lead} />
                  
                  {phoneNumbers.map((phone, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={lead.compliance_status === 'allowed' ? 'default' : 'secondary'}
                      disabled={lead.compliance_status !== 'allowed' || processingLeadId === lead.id}
                      onClick={() => handleCallLead(lead, phone.number, phone.type)}
                      className="flex items-center gap-2"
                    >
                      <Phone className="w-3 h-3" />
                      {phone.type.toUpperCase()}: {phone.number}
                      {phone.is_primary && <Badge variant="outline" className="text-xs ml-1">Primary</Badge>}
                      {processingLeadId === lead.id && (
                        <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })
        )}
        
        <Button onClick={fetchQueueLeads} variant="outline" className="w-full">
          Refresh Queue
        </Button>
      </CardContent>
    </Card>
  );
};

export default AutoDialQueue;