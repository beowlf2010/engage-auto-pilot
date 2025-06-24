
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  UserCheck,
  UserX,
  Check
} from 'lucide-react';

interface LeadActionsSectionProps {
  conversation: any;
  onMarkAsLost: () => void;
  onMarkAsSold: () => void;
  onSlowerFollowup: () => void;
  isMarkingLost: boolean;
  isMarkingSold: boolean;
  isSettingSlowerFollowup: boolean;
}

const LeadActionsSection: React.FC<LeadActionsSectionProps> = ({
  conversation,
  onMarkAsLost,
  onMarkAsSold,
  onSlowerFollowup,
  isMarkingLost,
  isMarkingSold,
  isSettingSlowerFollowup
}) => {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700">Lead Actions</h4>
      <div className="space-y-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={onSlowerFollowup}
          disabled={isSettingSlowerFollowup || conversation.status === 'lost' || conversation.status === 'closed'}
          className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
        >
          <UserCheck className="w-4 h-4 mr-2" />
          {isSettingSlowerFollowup ? 'Setting Up...' : 'Weekly Follow-up'}
        </Button>
        
        <Button 
          variant="outline"
          size="sm"
          onClick={onMarkAsSold}
          disabled={isMarkingSold || conversation.status === 'closed'}
          className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
        >
          <Check className="w-4 h-4 mr-2" />
          {isMarkingSold ? 'Marking Sold...' : 'Mark Sold'}
        </Button>
        
        <Button 
          variant="outline"
          size="sm"
          onClick={onMarkAsLost}
          disabled={isMarkingLost || conversation.status === 'lost'}
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        >
          <UserX className="w-4 h-4 mr-2" />
          {isMarkingLost ? 'Marking Lost...' : 'Mark Lost'}
        </Button>
      </div>
    </div>
  );
};

export default LeadActionsSection;
