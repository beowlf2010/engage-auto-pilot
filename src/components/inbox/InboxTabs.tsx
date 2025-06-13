
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LeadCard from './LeadCard';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  ai_stage: string;
  next_ai_send_at?: string;
  last_reply_at?: string;
  ai_opt_in: boolean;
}

interface InboxTabsProps {
  leads: Lead[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLeadClick: (lead: Lead) => void;
}

const InboxTabs: React.FC<InboxTabsProps> = ({ leads, activeTab, onTabChange, onLeadClick }) => {
  const getFilteredLeads = (tab: string) => {
    switch (tab) {
      case 'replied':
        return leads.filter(lead => lead.last_reply_at);
      case 'scheduled':
        return leads.filter(lead => lead.ai_opt_in && !lead.last_reply_at);
      case 'paused':
        return leads.filter(lead => !lead.ai_opt_in);
      default:
        return leads;
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="replied">Replied</TabsTrigger>
        <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        <TabsTrigger value="paused">Paused</TabsTrigger>
      </TabsList>

      {(['replied', 'scheduled', 'paused'] as const).map((tab) => (
        <TabsContent key={tab} value={tab} className="space-y-2">
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-200">
              {getFilteredLeads(tab).map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={onLeadClick}
                />
              ))}
              {getFilteredLeads(tab).length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No leads in this category
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default InboxTabs;
