import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, BotOff, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AIPreviewPopout from '@/components/leads/AIPreviewPopout';
import { Lead } from '@/types/lead';

interface Lead_Management {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  vehicle_interest: string;
  ai_opt_in: boolean;
}

interface AIOptInButtonProps {
  lead: Lead_Management;
  onAIOptInChange: () => void;
}

const AIOptInButton: React.FC<AIOptInButtonProps> = ({
  lead,
  onAIOptInChange
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Transform the management lead format to the expected Lead type
  const transformedLead: Lead = {
    id: lead.id,
    firstName: lead.first_name,
    lastName: lead.last_name,
    email: lead.email,
    phoneNumbers: lead.phone ? [{ 
      id: '1',
      number: lead.phone, 
      type: 'cell', 
      priority: 1, 
      status: 'active', 
      isPrimary: true 
    }] : [],
    primaryPhone: lead.phone || '',
    vehicleInterest: lead.vehicle_interest,
    source: '',
    status: 'new',
    salesperson: '',
    salespersonId: '',
    aiOptIn: lead.ai_opt_in,
    createdAt: new Date().toISOString(),
    lastMessage: '',
    lastMessageTime: '',
    unreadCount: 0,
    doNotCall: false,
    doNotEmail: false,
    doNotMail: false,
    contactStatus: 'no_contact',
    incomingCount: 0,
    outgoingCount: 0,
    unrepliedCount: 0,
    first_name: lead.first_name,
    last_name: lead.last_name,
    created_at: new Date().toISOString(),
    is_hidden: false
  };

  const handleAIOptInSuccess = async () => {
    setIsProcessing(true);
    try {
      onAIOptInChange();
    } finally {
      setIsProcessing(false);
    }
  };

  if (lead.ai_opt_in) {
    return (
      <Badge variant="secondary" className="text-xs">
        <Bot className="h-3 w-3 mr-1" />
        AI Active
      </Badge>
    );
  }

  if (isProcessing) {
    return (
      <Button size="sm" variant="outline" disabled className="flex-1">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Processing...
      </Button>
    );
  }

  return (
    <AIPreviewPopout
      lead={transformedLead}
      onAIOptInChange={handleAIOptInSuccess}
    >
      <Button size="sm" variant="outline" className="flex-1">
        <BotOff className="h-3 w-3 mr-1" />
        Enable AI
      </Button>
    </AIPreviewPopout>
  );
};

export default AIOptInButton;