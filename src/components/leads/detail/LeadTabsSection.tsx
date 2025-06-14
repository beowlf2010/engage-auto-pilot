
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, User, Calendar, Activity, Mail } from "lucide-react";
import ActivityTimeline from "./ActivityTimeline";
import MessageThread from "../../inbox/MessageThread";
import EmailTab from "./EmailTab";
import { LeadDetailData } from '@/services/leadDetailService';

interface MessageThreadLead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  ai_stage: string;
  next_ai_send_at: string | null;
  last_reply_at: string | null;
  ai_opt_in: boolean;
}

interface LeadTabsSectionProps {
  transformedLead: LeadDetailData;
  messageThreadLead: MessageThreadLead;
  leadId: string;
  showMessageComposer: boolean;
  setShowMessageComposer: (show: boolean) => void;
}

const LeadTabsSection = ({ 
  transformedLead, 
  messageThreadLead, 
  leadId,
  showMessageComposer,
  setShowMessageComposer 
}: LeadTabsSectionProps) => {
  return (
    <div className="lg:col-span-2">
      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messages" className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Messages</span>
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center space-x-2">
            <Mail className="w-4 h-4" />
            <span>Emails</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Activity</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-6">
          <MessageThread 
            lead={messageThreadLead}
            messages={[]}
            onClose={() => setShowMessageComposer(false)}
            onSendMessage={(message: string) => {
              console.log('Sending message:', message);
            }}
            onApproveAI={() => {
              console.log('Approving AI');
            }}
            onToggleAI={() => {
              console.log('Toggling AI');
            }}
          />
        </TabsContent>

        <TabsContent value="emails" className="space-y-6">
          <EmailTab leadId={leadId} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityTimeline activityTimeline={transformedLead.activityTimeline} />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Lead Profile Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700">Contact Information</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Complete contact details and communication preferences
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-700">Vehicle Preferences</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Interested vehicles and budget information
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeadTabsSection;
