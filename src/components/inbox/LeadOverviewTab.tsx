
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
    <div className="space-y-4">
      {/* Lead Information */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{conversation.leadName}</h3>
          <Badge variant={conversation.status === 'new' ? 'default' : 'secondary'}>
            {conversation.status}
          </Badge>
        </div>

        <div className="space-y-2">
          {conversation.leadPhone && (
            <div className="flex items-center space-x-2 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{conversation.leadPhone}</span>
            </div>
          )}

          <div className="flex items-center space-x-2 text-sm">
            <Car className="h-4 w-4 text-gray-400" />
            <span>{conversation.vehicleInterest || 'No vehicle specified'}</span>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>Last message: {conversation.lastMessageTime}</span>
          </div>
        </div>

        {conversation.unreadCount > 0 && (
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-600">
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
