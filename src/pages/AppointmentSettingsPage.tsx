
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppointmentSlotManager from '@/components/appointments/AppointmentSlotManager';
import { Settings, Calendar, Users, Clock } from 'lucide-react';

const AppointmentSettingsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Appointment Settings
        </h1>
        <p className="text-gray-600">
          Manage appointment availability, time slots, and booking settings
        </p>
      </div>

      <Tabs defaultValue="slots" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="slots" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Time Slots</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>General Settings</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Staff Availability</span>
          </TabsTrigger>
          <TabsTrigger value="business-hours" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Business Hours</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slots">
          <AppointmentSlotManager />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>General Appointment Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>General settings configuration coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Staff availability management coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business-hours">
          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Business hours configuration coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppointmentSettingsPage;
