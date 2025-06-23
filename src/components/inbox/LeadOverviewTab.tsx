
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Phone, 
  Car, 
  Clock,
  MessageSquare
} from 'lucide-react';
import LeadQuickActions from './LeadQuickActions';
import LeadActionsSection from './LeadActionsSection';
import AIStatusSection from './AIStatusSection';

interface LeadOverviewTabProps {
  conversation: any;
  onScheduleAppointment?: () => void;
  onMarkAsLost: () => void;
  onSlowerFollowup: () => void;
  isMarkingLost: boolean;
  isSettingSlowerFollowup: boolean;
}

const LeadOverviewTab: React.FC<LeadOverviewTabProps> = ({
  conversation,
  onScheduleAppointment,
  onMarkAsLost,
  onSlowerFollowup,
  isMarkingLost,
  isSettingSlowerFollowup
}) => {
  return (
    <div className="space-y-6">
      {/* Lead Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-gray-900">{conversation.leadName}</h3>
          <Badge variant={conversation.status === 'new' ? 'default' : 'secondary'}>
            {conversation.status}
          </Badge>
        </div>

        <div className="space-y-3">
          {conversation.leadPhone && (
            <div className="flex items-center space-x-3 text-sm">
              <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">{conversation.leadPhone}</span>
            </div>
          )}

          <div className="flex items-center space-x-3 text-sm">
            <Car className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700">{conversation.vehicleInterest || 'No vehicle specified'}</span>
          </div>

          <div className="flex items-center space-x-3 text-sm">
            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700">Last message: {conversation.lastMessageTime}</span>
          </div>
        </div>

        {conversation.unreadCount > 0 && (
          <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <MessageSquare className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium text-red-700">
              {conversation.unreadCount} unread message{conversation.unreadCount > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <Separator />

      <LeadQuickActions 
        onScheduleAppointment={onScheduleAppointment}
      />

      <Separator />

      <LeadActionsSection
        conversation={conversation}
        onMarkAsLost={onMarkAsLost}
        onSlowerFollowup={onSlowerFollowup}
        isMarkingLost={isMarkingLost}
        isSettingSlowerFollowup={isSettingSlowerFollowup}
      />

      <Separator />

      <AIStatusSection conversation={conversation} />
    </div>
  );
};

export default LeadOverviewTab;
