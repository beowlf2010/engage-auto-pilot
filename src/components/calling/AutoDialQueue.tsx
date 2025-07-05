import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
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
      
      // Fetch leads that are ready for calling with their phone numbers
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          id, first_name, last_name, state, city, do_not_call,
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
        
        processedLeads.push({
          ...lead,
          priority_score: priorityScore,
          compliance_status: compliance.canCall ? 'allowed' : 'blocked',
          next_available_time: compliance.nextAvailableTime,
          lead_timezone: compliance.leadTimezone
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
              <div key={lead.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">
                      {lead.first_name} {lead.last_name}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{lead.city}, {lead.state}</span>
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

                {lead.compliance_status === 'blocked' && lead.next_available_time && (
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                    Next available: {formatNextAvailableTime(lead.next_available_time, lead.lead_timezone || 'America/New_York')}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
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