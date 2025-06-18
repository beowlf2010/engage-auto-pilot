
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppointmentActions } from '@/hooks/useAppointments';
import type { Appointment } from '@/types/appointment';
import { format } from 'date-fns';

interface AppointmentCardProps {
  appointment: Appointment;
  showLeadName?: boolean;
}

const AppointmentCard = ({ appointment, showLeadName = false }: AppointmentCardProps) => {
  const { 
    confirmAppointment, 
    cancelAppointment, 
    completeAppointment, 
    markNoShow,
    isConfirming,
    isCancelling,
    isCompleting,
    isMarkingNoShow
  } = useAppointmentActions();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      case 'rescheduled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'consultation': return 'Consultation';
      case 'test_drive': return 'Test Drive';
      case 'service': return 'Service';
      case 'delivery': return 'Delivery';
      case 'follow_up': return 'Follow Up';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const appointmentDate = new Date(appointment.scheduled_at);
  const isPast = appointmentDate < new Date();
  const canPerformActions = ['scheduled', 'confirmed'].includes(appointment.status);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-gray-900">{appointment.title}</h3>
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status.replace('_', ' ')}
              </Badge>
            </div>
            
            {showLeadName && appointment.lead_name && (
              <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                <User className="h-4 w-4" />
                <span>{appointment.lead_name}</span>
              </div>
            )}

            <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
              <Calendar className="h-4 w-4" />
              <span>{format(appointmentDate, 'MMM d, yyyy')}</span>
            </div>

            <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
              <Clock className="h-4 w-4" />
              <span>{format(appointmentDate, 'h:mm a')} ({appointment.duration_minutes} min)</span>
            </div>

            {appointment.location && (
              <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                <MapPin className="h-4 w-4" />
                <span>{appointment.location}</span>
              </div>
            )}

            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {getTypeLabel(appointment.appointment_type)}
              </Badge>
              {appointment.salesperson_name && (
                <Badge variant="outline" className="text-xs">
                  {appointment.salesperson_name}
                </Badge>
              )}
            </div>
          </div>

          {canPerformActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {appointment.status === 'scheduled' && (
                  <DropdownMenuItem 
                    onClick={() => confirmAppointment(appointment.id)}
                    disabled={isConfirming}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm
                  </DropdownMenuItem>
                )}
                
                {!isPast && (
                  <DropdownMenuItem 
                    onClick={() => cancelAppointment({ id: appointment.id, reason: 'Cancelled by user' })}
                    disabled={isCancelling}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </DropdownMenuItem>
                )}

                {isPast && appointment.status !== 'completed' && appointment.status !== 'no_show' && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => completeAppointment({ id: appointment.id })}
                      disabled={isCompleting}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => markNoShow({ id: appointment.id })}
                      disabled={isMarkingNoShow}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Mark No-Show
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      {appointment.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600">{appointment.description}</p>
        </CardContent>
      )}

      {appointment.notes && (
        <CardContent className="pt-0">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
            <p className="text-sm text-gray-600">{appointment.notes}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AppointmentCard;
