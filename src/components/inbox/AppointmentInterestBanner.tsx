
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Zap } from 'lucide-react';

interface AppointmentInterestBannerProps {
  isVisible: boolean;
  confidence: number;
  appointmentType: string;
  urgency: 'low' | 'medium' | 'high';
  timePreferences?: {
    dayPreferences: string[];
    timePreferences: string[];
    datePreferences: string[];
  };
  onScheduleAppointment: () => void;
  onDismiss: () => void;
}

const AppointmentInterestBanner = ({
  isVisible,
  confidence,
  appointmentType,
  urgency,
  timePreferences,
  onScheduleAppointment,
  onDismiss
}: AppointmentInterestBannerProps) => {
  if (!isVisible) return null;

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-orange-50 border-orange-200';
      case 'low': return 'bg-blue-50 border-blue-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const formatAppointmentType = (type: string) => {
    switch (type) {
      case 'test_drive': return 'Test Drive';
      case 'consultation': return 'Consultation';
      case 'viewing': return 'Vehicle Viewing';
      default: return 'Appointment';
    }
  };

  return (
    <Card className={`mb-3 ${getUrgencyColor(urgency)} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Calendar className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  Appointment Interest Detected
                </h4>
                <Badge variant="outline" className={getUrgencyBadgeColor(urgency)}>
                  {urgency} priority
                </Badge>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {(confidence * 100).toFixed(0)}% confidence
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                Customer shows interest in scheduling a <strong>{formatAppointmentType(appointmentType)}</strong>
              </p>

              {timePreferences && (timePreferences.dayPreferences.length > 0 || timePreferences.timePreferences.length > 0 || timePreferences.datePreferences.length > 0) && (
                <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                  {timePreferences.dayPreferences.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>Days: {timePreferences.dayPreferences.join(', ')}</span>
                    </div>
                  )}
                  {timePreferences.timePreferences.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Times: {timePreferences.timePreferences.join(', ')}</span>
                    </div>
                  )}
                  {timePreferences.datePreferences.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Zap className="h-3 w-3" />
                      <span>When: {timePreferences.datePreferences.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Button
                  onClick={onScheduleAppointment}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Schedule Now
                </Button>
                <Button
                  onClick={onDismiss}
                  size="sm"
                  variant="ghost"
                  className="text-gray-500 hover:text-gray-700"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentInterestBanner;
