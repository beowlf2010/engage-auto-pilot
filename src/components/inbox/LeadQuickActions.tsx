
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  Phone, 
  Mail, 
  Car
} from 'lucide-react';

interface LeadQuickActionsProps {
  onScheduleAppointment?: () => void;
}

const LeadQuickActions: React.FC<LeadQuickActionsProps> = ({
  onScheduleAppointment
}) => {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700">Quick Actions</h4>
      <div className="grid grid-cols-2 gap-2">
        {onScheduleAppointment && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onScheduleAppointment}
            className="flex items-center space-x-1"
          >
            <Calendar className="h-4 w-4" />
            <span>Schedule</span>
          </Button>
        )}
        <Button variant="outline" size="sm" className="flex items-center space-x-1">
          <Phone className="h-4 w-4" />
          <span>Call</span>
        </Button>
        <Button variant="outline" size="sm" className="flex items-center space-x-1">
          <Mail className="h-4 w-4" />
          <span>Email</span>
        </Button>
        <Button variant="outline" size="sm" className="flex items-center space-x-1">
          <Car className="h-4 w-4" />
          <span>Show Cars</span>
        </Button>
      </div>
    </div>
  );
};

export default LeadQuickActions;
