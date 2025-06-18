
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Mail, Calendar, Car, TrendingUp } from 'lucide-react';
import EnhancedMessageThread from './EnhancedMessageThread';
import EnhancedEmailTab from './EnhancedEmailTab';
import VehicleRecommendationsTab from './VehicleRecommendationsTab';
import AppointmentsList from '../../appointments/AppointmentsList';
import AppointmentScheduler from '../../appointments/AppointmentScheduler';

interface LeadDetailTabsSectionProps {
  lead: any;
  messages: any[];
  messagesLoading: boolean;
  onSendMessage: (message: string) => Promise<void>;
}

const LeadDetailTabsSection = ({ 
  lead, 
  messages, 
  messagesLoading, 
  onSendMessage 
}: LeadDetailTabsSectionProps) => {
  const [activeTab, setActiveTab] = useState('messages');
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);

  const handleScheduleAppointment = () => {
    setShowAppointmentScheduler(true);
  };

  const leadName = `${lead.firstName} ${lead.lastName}`;

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="messages" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Appointments</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="flex items-center space-x-2">
              <Car className="h-4 w-4" />
              <span>Vehicles</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="messages" className="h-full m-0">
            <EnhancedMessageThread
              messages={messages}
              onSendMessage={onSendMessage}
              isLoading={messagesLoading}
              leadName={leadName}
            />
          </TabsContent>

          <TabsContent value="appointments" className="h-full m-0 p-6">
            <AppointmentsList
              leadId={lead.id}
              onScheduleNew={handleScheduleAppointment}
              maxHeight="calc(100vh - 300px)"
            />
          </TabsContent>

          <TabsContent value="email" className="h-full m-0">
            <EnhancedEmailTab leadId={lead.id} />
          </TabsContent>

          <TabsContent value="vehicles" className="h-full m-0">
            <VehicleRecommendationsTab lead={lead} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Appointment Scheduler Dialog */}
      <AppointmentScheduler
        isOpen={showAppointmentScheduler}
        onClose={() => setShowAppointmentScheduler(false)}
        leadId={lead.id}
        leadName={leadName}
      />
    </>
  );
};

export default LeadDetailTabsSection;
