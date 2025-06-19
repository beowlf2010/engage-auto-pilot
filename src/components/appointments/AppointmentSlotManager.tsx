
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, Settings, Users } from 'lucide-react';
import { appointmentSlotsService, type SlotManagement } from '@/services/appointmentSlotsService';
import { toast } from '@/hooks/use-toast';
import { format, parse, addDays, startOfWeek, endOfWeek } from 'date-fns';

const AppointmentSlotManager = () => {
  const [slots, setSlots] = useState<SlotManagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [showAddSlots, setShowAddSlots] = useState(false);

  useEffect(() => {
    loadSlots();
  }, [selectedWeek]);

  const loadSlots = async () => {
    try {
      setLoading(true);
      const weekStart = startOfWeek(selectedWeek);
      const weekEnd = endOfWeek(selectedWeek);
      
      const slotsData = await appointmentSlotsService.getAllSlots(
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      );
      setSlots(slotsData);
    } catch (error) {
      console.error('Error loading slots:', error);
      toast({
        title: "Error",
        description: "Failed to load appointment slots.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSlotUpdate = async (slotId: string, updates: Partial<SlotManagement>) => {
    try {
      await appointmentSlotsService.updateSlot(slotId, updates);
      await loadSlots();
      toast({
        title: "Success",
        description: "Appointment slot updated successfully.",
      });
    } catch (error) {
      console.error('Error updating slot:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment slot.",
        variant: "destructive",
      });
    }
  };

  const handleCreateWeekSlots = async () => {
    try {
      const weekStart = startOfWeek(selectedWeek);
      const newSlots = [];
      
      // Create slots for weekdays (Monday-Friday) 9 AM - 5 PM
      for (let day = 1; day <= 5; day++) {
        const date = addDays(weekStart, day);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        for (let hour = 9; hour <= 17; hour++) {
          const timeStr = `${hour.toString().padStart(2, '0')}:00`;
          newSlots.push({
            date: dateStr,
            time_slot: timeStr,
            is_available: true,
            max_appointments: 1
          });
        }
      }
      
      await appointmentSlotsService.createSlots(newSlots);
      await loadSlots();
      toast({
        title: "Success",
        description: "Weekly appointment slots created successfully.",
      });
    } catch (error) {
      console.error('Error creating slots:', error);
      toast({
        title: "Error",
        description: "Failed to create appointment slots.",
        variant: "destructive",
      });
    }
  };

  const groupSlotsByDate = (slots: SlotManagement[]) => {
    return slots.reduce((acc, slot) => {
      const date = slot.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(slot);
      return acc;
    }, {} as Record<string, SlotManagement[]>);
  };

  const getSlotStatusBadge = (slot: SlotManagement) => {
    if (!slot.is_available) {
      return <Badge variant="secondary">Unavailable</Badge>;
    }
    if (slot.current_bookings >= slot.max_appointments) {
      return <Badge variant="destructive">Fully Booked</Badge>;
    }
    if (slot.current_bookings > 0) {
      return <Badge variant="outline">Partially Booked</Badge>;
    }
    return <Badge variant="outline">Available</Badge>;
  };

  const groupedSlots = groupSlotsByDate(slots);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading appointment slots...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Appointment Slot Management</span>
            </div>
            <Button onClick={handleCreateWeekSlots} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Week Slots
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
              >
                Previous Week
              </Button>
              <div className="text-lg font-medium">
                {format(startOfWeek(selectedWeek), 'MMM d')} - {format(endOfWeek(selectedWeek), 'MMM d, yyyy')}
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
              >
                Next Week
              </Button>
            </div>
          </div>

          {Object.keys(groupedSlots).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No appointment slots found for this week.</p>
              <Button onClick={handleCreateWeekSlots} className="mt-4">
                Create Default Slots
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSlots)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, dateSlots]) => (
                  <div key={date} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dateSlots
                        .sort((a, b) => a.time_slot.localeCompare(b.time_slot))
                        .map((slot) => (
                          <div key={slot.id} className="border rounded p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">{slot.time_slot}</span>
                              </div>
                              {getSlotStatusBadge(slot)}
                            </div>
                            
                            <div className="text-sm text-muted-foreground">
                              <div className="flex items-center space-x-2">
                                <Users className="h-3 w-3" />
                                <span>{slot.current_bookings}/{slot.max_appointments} booked</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`available-${slot.id}`} className="text-xs">
                                  Available
                                </Label>
                                <Switch
                                  id={`available-${slot.id}`}
                                  checked={slot.is_available}
                                  onCheckedChange={(checked) =>
                                    handleSlotUpdate(slot.id, { is_available: checked })
                                  }
                                />
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`capacity-${slot.id}`} className="text-xs">
                                  Max Appointments
                                </Label>
                                <Input
                                  id={`capacity-${slot.id}`}
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={slot.max_appointments}
                                  onChange={(e) =>
                                    handleSlotUpdate(slot.id, { 
                                      max_appointments: parseInt(e.target.value) || 1 
                                    })
                                  }
                                  className="w-16 h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentSlotManager;
