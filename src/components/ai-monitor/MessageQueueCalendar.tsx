
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CalendarMessage {
  id: string;
  firstName: string;
  lastName: string;
  vehicleInterest: string;
  nextSendAt: string;
  aiStage: string;
  isPaused: boolean;
}

interface CalendarDay {
  date: Date;
  messages: CalendarMessage[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

const MessageQueueCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate]);

  const fetchCalendarData = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Extend to include previous/next month days for full calendar view
      const startOfCalendar = new Date(startOfMonth);
      startOfCalendar.setDate(startOfCalendar.getDate() - startOfCalendar.getDay());
      
      const endOfCalendar = new Date(endOfMonth);
      endOfCalendar.setDate(endOfCalendar.getDate() + (6 - endOfCalendar.getDay()));

      const { data: scheduledMessages, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, next_ai_send_at, ai_stage, ai_sequence_paused')
        .eq('ai_opt_in', true)
        .not('next_ai_send_at', 'is', null)
        .gte('next_ai_send_at', startOfCalendar.toISOString())
        .lte('next_ai_send_at', endOfCalendar.toISOString());

      if (error) throw error;

      // Group messages by date
      const messagesByDate = new Map<string, CalendarMessage[]>();
      scheduledMessages?.forEach(message => {
        const messageDate = new Date(message.next_ai_send_at);
        const dateKey = messageDate.toDateString();
        
        if (!messagesByDate.has(dateKey)) {
          messagesByDate.set(dateKey, []);
        }
        
        messagesByDate.get(dateKey)!.push({
          id: message.id,
          firstName: message.first_name,
          lastName: message.last_name,
          vehicleInterest: message.vehicle_interest,
          nextSendAt: message.next_ai_send_at,
          aiStage: message.ai_stage || 'initial',
          isPaused: message.ai_sequence_paused || false
        });
      });

      // Generate calendar days
      const days: CalendarDay[] = [];
      const currentDay = new Date(startOfCalendar);
      const today = new Date();
      
      while (currentDay <= endOfCalendar) {
        const dateKey = currentDay.toDateString();
        const messages = messagesByDate.get(dateKey) || [];
        
        days.push({
          date: new Date(currentDay),
          messages,
          isCurrentMonth: currentDay.getMonth() === currentDate.getMonth(),
          isToday: currentDay.toDateString() === today.toDateString()
        });
        
        currentDay.setDate(currentDay.getDate() + 1);
      }

      setCalendarData(days);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getMessageCountColor = (count: number) => {
    if (count === 0) return '';
    if (count <= 2) return 'bg-blue-100 text-blue-800';
    if (count <= 5) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading calendar...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xl">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {dayNames.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarData.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      p-2 min-h-[80px] border rounded cursor-pointer transition-colors
                      ${day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-muted-foreground'}
                      ${day.isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                      ${selectedDay?.date.toDateString() === day.date.toDateString() ? 'ring-2 ring-blue-500' : ''}
                    `}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div className="text-sm font-medium mb-1">
                      {day.date.getDate()}
                    </div>
                    
                    {day.messages.length > 0 && (
                      <div className="space-y-1">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getMessageCountColor(day.messages.length)}`}
                        >
                          {day.messages.length} msg{day.messages.length !== 1 ? 's' : ''}
                        </Badge>
                        
                        {day.messages.slice(0, 2).map(message => (
                          <div key={message.id} className="text-xs truncate">
                            {message.firstName} {message.lastName}
                          </div>
                        ))}
                        
                        {day.messages.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{day.messages.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>
                  {selectedDay 
                    ? selectedDay.date.toLocaleDateString()
                    : 'Select a day'
                  }
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDay ? (
                <div className="space-y-3">
                  {selectedDay.messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No messages scheduled</p>
                    </div>
                  ) : (
                    selectedDay.messages.map(message => (
                      <div key={message.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {message.firstName} {message.lastName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {message.aiStage}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {message.vehicleInterest}
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {new Date(message.nextSendAt).toLocaleTimeString()}
                        </div>
                        
                        {message.isPaused && (
                          <Badge variant="secondary" className="text-xs">
                            Paused
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click on a calendar day to see scheduled messages
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MessageQueueCalendar;
