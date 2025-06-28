
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot, BotOff } from 'lucide-react';
import { Lead } from '@/types/lead';
import AIPreviewPopout from './AIPreviewPopout';

interface QuickAIActionsProps {
  leadId: string;
  leadName: string;
  aiOptIn: boolean;
  onUpdate: () => void;
  lead?: Lead; // Optional lead object for full preview
}

const QuickAIActions: React.FC<QuickAIActionsProps> = ({
  leadId,
  leadName,
  aiOptIn,
  onUpdate,
  lead
}) => {
  // For leads that already have AI enabled, show simple indicator
  if (aiOptIn) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
        title="AI messaging enabled"
        disabled
      >
        <Bot className="h-3 w-3" />
      </Button>
    );
  }

  // For leads without AI, show the preview popout button
  return (
    <AIPreviewPopout
      lead={lead || {
        id: leadId,
        firstName: leadName.split(' ')[0] || '',
        lastName: leadName.split(' ').slice(1).join(' ') || '',
        vehicleInterest: '',
        // Add other required Lead properties with defaults
        primaryPhone: '',
        email: '',
        source: '',
        status: 'new',
        salesperson: '',
        salespersonId: '',
        aiOptIn: false,
        createdAt: '',
        unreadCount: 0,
        doNotCall: false,
        doNotEmail: false,
        doNotMail: false,
        contactStatus: 'no_contact',
        incomingCount: 0,
        outgoingCount: 0,
        unrepliedCount: 0,
        phoneNumbers: [],
        first_name: leadName.split(' ')[0] || '',
        last_name: leadName.split(' ').slice(1).join(' ') || '',
        created_at: '',
        is_hidden: false
      } as Lead}
      onAIOptInChange={(leadId, enabled) => {
        if (enabled) {
          onUpdate();
        }
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
        title="Enable AI messaging"
      >
        <BotOff className="h-3 w-3" />
      </Button>
    </AIPreviewPopout>
  );
};

export default QuickAIActions;
