
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Clock, User, Phone, Mail, MessageSquare } from 'lucide-react';
import { appointmentSlotsService, type AppointmentSlot } from '@/services/appointmentSlotsService';
import { appointmentService } from '@/services/appointmentService';
import { toast } from '@/hooks/use-toast';
import { format, parse, isValid } from 'date-fns';

interface PublicAppointmentBookingProps {
  leadId?: string;
  onSuccess?: (appointmentId: string) => void;
  className?: string;
}

const PublicAppointmentBooking = ({ leadId, onSuccess, className }: PublicAppointmentBookingProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'datetime' | 'details' | 'confirmation'>('datetime');
  
  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    appointmentType: 'consultation' as const,
    description: ''
  });

  useEffect(() => {
    loadAvailableSlots();
  }, []);

  const loadAvailableSlots = async () => {
    try {
      const slots = await appointmentSlotsService.getAvailableSlots();
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading available slots:', error);
      toast({
        title: "Error",
        description: "Failed to load available appointment times.",
        variant: "destructive",
      });
    }
  };

  const getAvailableTimesForDate = (date: Date): string[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availableSlots
      .filter(slot => slot.slot_date === dateStr && slot.available_spots > 0)
      .map(slot => slot.slot_time)
      .sort();
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleNextStep = () => {
    if (step === 'datetime' && selectedDate && selectedTime) {
      setStep('details');
    }
  };

  const handlePreviousStep = () => {
    if (step === 'details') {
      setStep('datetime');
    } else if (step === 'confirmation') {
      setStep('details');
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Please select a date and time.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First book the slot
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const slotBooked = await appointmentSlotsService.bookSlot(dateStr, selectedTime);
      
      if (!slotBooked) {
        throw new Error('Selected time slot is no longer available');
      }

      // Generate booking token
      const bookingToken = await appointmentSlotsService.generateBookingToken();

      // Create the appointment
      const scheduledAt = new Date(`${dateStr}T${selectedTime}`);
      
      const appointmentData = {
        lead_id: leadId || '', // Will be handled differently for public bookings
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: 60,
        appointment_type: formData.appointmentType,
        title: `${formData.appointmentType.charAt(0).toUpperCase() + formData.appointmentType.slice(1)} with ${formData.firstName} ${formData.lastName}`,
        description: formData.description || `Customer: ${formData.firstName} ${formData.lastName}\nEmail: ${formData.email}\nPhone: ${formData.phone}`,
        booking_source: 'customer' as const,
        booking_token: bookingToken
      };

      // For public bookings without leadId, we'll create a temporary lead or handle differently
      if (!leadId) {
        // This would typically create a lead first or use a different booking flow
        appointmentData.description += '\n\nNote: Public booking - lead may need to be created';
      }

      const appointment = await appointmentService.createAppointment(appointmentData);
      
      setStep('confirmation');
      onSuccess?.(appointment.id);
      
      toast({
        title: "Appointment Scheduled!",
        description: `Your ${formData.appointmentType} has been scheduled for ${format(selectedDate, 'MMMM d, yyyy')} at ${selectedTime}.`,
      });

    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const availableDates = [...new Set(availableSlots.map(slot => slot.slot_date))]
    .map(dateStr => parse(dateStr, 'yyyy-MM-dd', new Date()))
    .filter(date => isValid(date));

  if (step === 'confirmation') {
    return (
      <Card className={className}>
        <CardHeader className="text-center">
          <CardTitle className="text-green-600">Appointment Confirmed!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800">Your appointment has been scheduled</h3>
            <p className="text-green-700 mt-2">
              {format(selectedDate!, 'EEEE, MMMM d, yyyy')} at {selectedTime}
            </p>
            <p className="text-sm text-green-600 mt-2">
              Type: {formData.appointmentType.charAt(0).toUpperCase() + formData.appointmentType.slice(1)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            You will receive a confirmation email shortly with all the details.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5" />
          <span>Schedule an Appointment</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'datetime' && (
          <>
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Select a Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => 
                    date < new Date() || 
                    !availableDates.some(availableDate => 
                      format(availableDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                    )
                  }
                  className="rounded-md border mt-2"
                />
              </div>

              {selectedDate && (
                <div>
                  <Label className="text-base font-medium">Select a Time</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {getAvailableTimesForDate(selectedDate).map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        onClick={() => handleTimeSelect(time)}
                        className="text-sm"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {time}
                      </Button>
                    ))}
                  </div>
                  {getAvailableTimesForDate(selectedDate).length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      No available times for this date. Please select another date.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleNextStep}
                disabled={!selectedDate || !selectedTime}
              >
                Next: Enter Details
              </Button>
            </div>
          </>
        )}

        {step === 'details' && (
          <>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Selected:</strong> {format(selectedDate!, 'EEEE, MMMM d, yyyy')} at {selectedTime}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="appointmentType">Appointment Type</Label>
              <Select 
                value={formData.appointmentType} 
                onValueChange={(value: any) => setFormData({ ...formData, appointmentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="test_drive">Test Drive</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Additional Notes (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell us about your vehicle interests or any specific questions..."
                rows={3}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePreviousStep}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule Appointment'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PublicAppointmentBooking;
