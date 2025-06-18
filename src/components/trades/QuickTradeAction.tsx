
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Car, Calendar, Plus } from 'lucide-react';
import TradeInfoCollector from './TradeInfoCollector';
import AppointmentScheduler from '../appointments/AppointmentScheduler';

interface QuickTradeActionProps {
  leadId: string;
  leadName: string;
  onTradeAdded?: () => void;
}

const QuickTradeAction = ({ leadId, leadName, onTradeAdded }: QuickTradeActionProps) => {
  const [showTradeCollector, setShowTradeCollector] = useState(false);
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);
  const [tradeVehicle, setTradeVehicle] = useState(null);

  const handleTradeCreated = (vehicle: any) => {
    setTradeVehicle(vehicle);
    setShowTradeCollector(false);
    onTradeAdded?.();
    // Auto-open appointment scheduler after trade info is saved
    setShowAppointmentScheduler(true);
  };

  const handleScheduleAppraisal = () => {
    setShowAppointmentScheduler(true);
  };

  if (showTradeCollector) {
    return (
      <TradeInfoCollector
        leadId={leadId}
        leadName={leadName}
        onTradeCreated={handleTradeCreated}
        onScheduleAppraisal={handleScheduleAppraisal}
      />
    );
  }

  return (
    <>
      <div className="flex space-x-2">
        <Button 
          onClick={() => setShowTradeCollector(true)}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Car className="h-4 w-4 mr-2" />
          Add Trade Info
        </Button>
        <Button 
          onClick={handleScheduleAppraisal}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Appraisal
        </Button>
      </div>

      <AppointmentScheduler
        isOpen={showAppointmentScheduler}
        onClose={() => setShowAppointmentScheduler(false)}
        leadId={leadId}
        leadName={leadName}
      />
    </>
  );
};

export default QuickTradeAction;
