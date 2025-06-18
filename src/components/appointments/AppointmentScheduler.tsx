
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import type { CreateAppointmentData } from '@/types/appointment';

interface AppointmentSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName?: string;
}

const AppointmentScheduler = ({ isOpen, onClose, leadId, leadName }: AppointmentSchedulerProps) => {
  const { createAppointment, isCreating } = useAppointments();
  
  const [formData, setFormData] = useState<Partial<CreateAppointmentData>>({
    lead_id: leadId,
    appointment_type: 'consultation',
    duration_minutes: 60,
    title: '',
    description: '',
    location: '',
    scheduled_at: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.scheduled_at) {
      return;
    }

    const appointmentData: CreateAppointmentData = {
      lead_id: leadId,
      title: formData.title,
      scheduled_at: formData.scheduled_at,
      appointment_type: formData.appointment_type as any,
      duration_minutes: formData.duration_minutes || 60,
      description: formData.description || undefined,
      location: formData.location || undefined,
    };

    createAppointment(appointmentData);
    
    // Reset form and close dialog
    setFormData({
      lead_id: leadId,
      appointment_type: 'consultation',
      duration_minutes: 60,
      title: '',
      description: '',
      location: '',
      scheduled_at: ''
    });
    onClose();
  };

  const minDateTime = new Date();
  minDateTime.setMinutes(minDateTime.getMinutes() + 30); // At least 30 minutes from now
  const minDateTimeString = minDateTime.toISOString().slice(0, 16);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Schedule Appointment</span>
          </DialogTitle>
          {leadName && (
            <p className="text-sm text-gray-600">for {leadName}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="appointment_type">Type</Label>
              <Select
                value={formData.appointment_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, appointment_type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="test_drive">Test Drive</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Select
                value={formData.duration_minutes?.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Sales consultation for 2024 Camaro"
              required
            />
          </div>

          <div>
            <Label htmlFor="scheduled_at">Date & Time *</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                min={minDateTimeString}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Dealership showroom, Customer location"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional notes about the appointment..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !formData.title || !formData.scheduled_at}>
              {isCreating ? 'Scheduling...' : 'Schedule Appointment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentScheduler;
