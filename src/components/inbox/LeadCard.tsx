
import React from 'react';
import { Badge } from '@/components/ui/badge';
import CountdownBadge from './CountdownBadge';

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

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick }) => {
  return (
    <div
      className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={() => onClick(lead)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-slate-900">
            {lead.first_name} {lead.last_name}
          </div>
          <div className="text-sm text-slate-500">{lead.phone}</div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">{lead.ai_stage}</Badge>
          <CountdownBadge dt={lead.next_ai_send_at} />
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
