
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  StickyNote,
  Brain,
  Calendar,
  Settings
} from 'lucide-react';
import AppointmentsList from '../appointments/AppointmentsList';
import LeadNotesTab from './LeadNotesTab';
import InboxAIPanel from './InboxAIPanel';
import InboxLeadActions from './InboxLeadActions';

interface LeadContextPanelProps {
  conversation: any;
  messages: any[];
  onSendMessage: (message: string) => Promise<void>;
  onScheduleAppointment?: () => void;
}

const LeadContextPanel = ({ 
  conversation, 
  messages = [],
  onSendMessage,
  onScheduleAppointment 
}: LeadContextPanelProps) => {
  const [activeTab, setActiveTab] = useState('ai');

  const handleActionComplete = () => {
    // Refresh the page or update state when actions are completed
    window.location.reload();
  };

  if (!conversation) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 text-center">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No conversation selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3 border-b">
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5 text-blue-600" />
          <span className="text-sm truncate">{conversation.leadName}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 min-h-0 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-4 mt-4 mb-2 flex-shrink-0">
            <TabsTrigger value="ai" title="AI Assistant" className="text-xs">
              <Brain className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="actions" title="Actions" className="text-xs">
              <Settings className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="notes" title="Notes" className="text-xs">
              <StickyNote className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="appointments" title="Calendar" className="text-xs">
              <Calendar className="h-3 w-3" />
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
            <TabsContent value="ai" className="mt-0 h-full">
              <div className="h-full">
                <InboxAIPanel
                  conversation={conversation}
                  messages={messages}
                  onSendMessage={onSendMessage}
                  className="h-full"
                />
              </div>
            </TabsContent>

            <TabsContent value="actions" className="mt-0">
              <InboxLeadActions
                conversation={conversation}
                onActionComplete={handleActionComplete}
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              {conversation.leadId ? (
                <LeadNotesTab 
                  leadId={conversation.leadId} 
                  leadName={conversation.leadName || 'Lead'}
                />
              ) : (
                <div className="text-center py-8">
                  <StickyNote className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No lead selected</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="appointments" className="mt-0">
              <AppointmentsList
                leadId={conversation.leadId}
                onScheduleNew={onScheduleAppointment}
                maxHeight="400px"
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LeadContextPanel;
