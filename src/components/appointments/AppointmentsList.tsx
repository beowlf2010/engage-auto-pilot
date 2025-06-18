
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import AppointmentCard from './AppointmentCard';
import { useAppointments } from '@/hooks/useAppointments';

interface AppointmentsListProps {
  leadId?: string;
  onScheduleNew?: () => void;
  showLeadNames?: boolean;
  maxHeight?: string;
}

const AppointmentsList = ({ 
  leadId, 
  onScheduleNew, 
  showLeadNames = false,
  maxHeight = "400px"
}: AppointmentsListProps) => {
  const { appointments, isLoading, refetch } = useAppointments(leadId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">Loading appointments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Appointments</span>
            {appointments.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({appointments.length})
              </span>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {onScheduleNew && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onScheduleNew}
              >
                <Plus className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {appointments.length === 0 ? (
          <div className="p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No appointments scheduled</p>
            {onScheduleNew && (
              <Button onClick={onScheduleNew} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Schedule First Appointment
              </Button>
            )}
          </div>
        ) : (
          <div 
            className="space-y-3 p-4 overflow-y-auto"
            style={{ maxHeight }}
          >
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                showLeadName={showLeadNames}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsList;
