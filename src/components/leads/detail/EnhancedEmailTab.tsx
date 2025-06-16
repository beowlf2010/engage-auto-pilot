
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';
import { useEmailConversations } from '@/hooks/useEmailConversations';
import EmailStatsCards from './EmailStatsCards';
import QuickEmailActions from './QuickEmailActions';
import EmailAutomationCard from './EmailAutomationCard';
import EmailConversationsList from '../../email/EmailConversationsList';
import EmailComposer from '../../email/EmailComposer';

interface EnhancedEmailTabProps {
  leadId: string;
  leadEmail?: string;
  leadFirstName?: string;
  leadLastName?: string;
  vehicleInterest?: string;
}

const EnhancedEmailTab: React.FC<EnhancedEmailTabProps> = ({
  leadId,
  leadEmail,
  leadFirstName = '',
  leadLastName = '',
  vehicleInterest = ''
}) => {
  const [showComposer, setShowComposer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: emails = [] } = useEmailConversations(leadId);

  const filteredEmails = emails.filter(email =>
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Email Stats */}
      <EmailStatsCards emails={emails} />

      {/* Quick Actions */}
      <QuickEmailActions
        leadId={leadId}
        leadEmail={leadEmail}
        leadFirstName={leadFirstName}
        leadLastName={leadLastName}
        vehicleInterest={vehicleInterest}
        onComposeClick={() => setShowComposer(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Conversations */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Filters */}
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Email List */}
          <EmailConversationsList leadId={leadId} />
        </div>

        {/* Email Automation Sidebar */}
        <div className="space-y-4">
          <EmailAutomationCard leadId={leadId} />
        </div>
      </div>

      {/* Email Composer Modal */}
      <EmailComposer
        open={showComposer}
        onOpenChange={setShowComposer}
        leadId={leadId}
        leadEmail={leadEmail}
        leadFirstName={leadFirstName}
        leadLastName={leadLastName}
        vehicleInterest={vehicleInterest}
      />
    </div>
  );
};

export default EnhancedEmailTab;
