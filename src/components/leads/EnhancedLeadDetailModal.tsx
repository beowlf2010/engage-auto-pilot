import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from '@tanstack/react-query';
import { getLeadDetail } from '@/services/leadDetailService';
import type { Lead } from '@/types/lead';
import StreamlinedLeadDetail from './detail/StreamlinedLeadDetail';
import { Loader2 } from 'lucide-react';

interface EnhancedLeadDetailModalProps {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
}

const EnhancedLeadDetailModal: React.FC<EnhancedLeadDetailModalProps> = ({
  leadId,
  open,
  onClose
}) => {
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<any>(null);

  // Fetch lead data
  const { data: leadData, isLoading, error, refetch } = useQuery({
    queryKey: ['lead-detail-modal', leadId],
    queryFn: () => leadId ? getLeadDetail(leadId) : Promise.reject('No lead ID'),
    enabled: !!leadId && open,
  });

  // Transform to Lead type for StreamlinedLeadDetail
  const transformedLead: Lead | null = leadData ? {
    id: leadData.id,
    firstName: leadData.firstName,
    lastName: leadData.lastName,
    middleName: leadData.middleName || '',
    phoneNumbers: leadData.phoneNumbers.map(pn => ({
      ...pn,
      priority: 1,
      type: (pn.type as 'cell' | 'day' | 'eve') || 'cell',
      status: (pn.status as 'active' | 'failed' | 'opted_out') || 'active',
    })),
    primaryPhone: leadData.phoneNumbers.find(p => p.isPrimary)?.number || leadData.phoneNumbers[0]?.number || '',
    email: leadData.email || '',
    emailAlt: leadData.emailAlt || '',
    address: leadData.address || '',
    city: leadData.city || '',
    state: leadData.state || '',
    postalCode: leadData.postalCode || '',
    vehicleInterest: leadData.vehicleInterest || '',
    source: leadData.source,
    status: leadData.status as Lead['status'],
    salesperson: leadData.salespersonName || 'Unassigned',
    salespersonId: leadData.salespersonId || '',
    aiOptIn: leadData.aiOptIn,
    aiContactEnabled: false,
    aiRepliesEnabled: false,
    aiStage: leadData.aiStage,
    nextAiSendAt: leadData.nextAiSendAt,
    createdAt: leadData.createdAt,
    lastMessage: undefined,
    lastMessageTime: undefined,
    lastMessageDirection: null,
    unreadCount: 0,
    doNotCall: leadData.doNotCall,
    doNotEmail: leadData.doNotEmail,
    doNotMail: leadData.doNotMail,
    vehicleYear: leadData.vehicleYear,
    vehicleMake: leadData.vehicleMake || '',
    vehicleModel: leadData.vehicleModel || '',
    vehicleVIN: leadData.vehicleVin || '',
    contactStatus: 'no_contact',
    incomingCount: leadData.conversations.filter(c => c.direction === 'in').length,
    outgoingCount: leadData.conversations.filter(c => c.direction === 'out').length,
    unrepliedCount: 0,
    messageCount: leadData.conversations.length,
    aiMessagesSent: leadData.aiMessagesSent,
    aiLastMessageStage: leadData.aiStage,
    aiSequencePaused: leadData.aiSequencePaused,
    aiPauseReason: leadData.aiPauseReason,
    aiResumeAt: undefined,
    leadStatusTypeName: undefined,
    leadTypeName: undefined,
    leadSourceName: undefined,
    messageIntensity: (leadData.messageIntensity as 'gentle' | 'standard' | 'aggressive') || 'gentle',
    aiStrategyBucket: undefined,
    aiAggressionLevel: 3,
    aiStrategyLastUpdated: undefined,
    first_name: leadData.firstName,
    last_name: leadData.lastName,
    created_at: leadData.createdAt,
  } : null;

  const messageThreadLead = leadData ? {
    id: leadData.id,
    name: `${leadData.firstName} ${leadData.lastName}`.trim(),
    phoneNumber: leadData.phoneNumbers.find(p => p.isPrimary)?.number || leadData.phoneNumbers[0]?.number || ''
  } : null;

  const phoneNumbers = leadData?.phoneNumbers || [];
  const primaryPhone = leadData?.phoneNumbers?.find(p => p.isPrimary)?.number || leadData?.phoneNumbers?.[0]?.number || '';

  const handlePhoneSelect = (phone: any) => {
    setSelectedPhone(phone);
  };

  const handleStatusChanged = () => {
    refetch();
  };

  if (!open || !leadId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">
            {isLoading ? 'Loading Lead Details...' : transformedLead ? `${transformedLead.firstName} ${transformedLead.lastName}` : 'Lead Details'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and manage lead details, messages, and AI settings
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-auto h-full px-6 pb-6">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading lead details...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-destructive font-medium mb-2">Error loading lead</p>
                <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && transformedLead && messageThreadLead && leadData && (
            <StreamlinedLeadDetail
              lead={leadData}
              transformedLead={transformedLead}
              messageThreadLead={messageThreadLead}
              phoneNumbers={phoneNumbers}
              primaryPhone={primaryPhone}
              showMessageComposer={showMessageComposer}
              setShowMessageComposer={setShowMessageComposer}
              onPhoneSelect={handlePhoneSelect}
              onStatusChanged={handleStatusChanged}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedLeadDetailModal;
