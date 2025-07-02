import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Users, 
  Star, 
  MessageCircle, 
  Calendar,
  Phone
} from 'lucide-react';
import { Lead } from '@/types/lead';

interface SoldCustomerActionsProps {
  lead: Lead;
  onAction: (action: string, leadId: string) => void;
}

const SoldCustomerActions: React.FC<SoldCustomerActionsProps> = ({
  lead,
  onAction
}) => {
  // Compact actions for table display
  const customerServiceActions = [
    {
      key: 'referral_request',
      label: 'Referral',
      icon: Users,
      color: 'text-blue-600 hover:text-blue-700'
    },
    {
      key: 'review_request',
      label: 'Review',
      icon: Heart,
      color: 'text-red-600 hover:text-red-700'
    },
    {
      key: 'satisfaction_survey',
      label: 'Survey',
      icon: Star,
      color: 'text-yellow-600 hover:text-yellow-700'
    },
    {
      key: 'followup_call',
      label: 'Call',
      icon: Phone,
      color: 'text-green-600 hover:text-green-700'
    }
  ];

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-2 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
          Customer Service
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-1">
        {customerServiceActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Button
              key={action.key}
              variant="ghost"
              size="sm"
              onClick={() => onAction(action.key, lead.id)}
              className={`flex items-center gap-1 h-8 px-2 text-xs ${action.color}`}
              title={`${action.label} request for ${lead.firstName} ${lead.lastName}`}
            >
              <IconComponent className="h-3 w-3" />
              <span>{action.label}</span>
            </Button>
          );
        })}
      </div>
      
      <div className="flex items-center gap-1 mt-2 pt-1 border-t border-green-200 text-xs text-green-600">
        <MessageCircle className="h-3 w-3" />
        <span>Post-sale care</span>
      </div>
    </div>
  );
};

export default SoldCustomerActions;