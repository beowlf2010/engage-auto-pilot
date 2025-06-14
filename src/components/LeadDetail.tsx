
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, User, Calendar, Activity, Mail } from "lucide-react";
import LeadDetailHeader from "./leads/detail/LeadDetailHeader";
import ContactInfoCard from "./leads/detail/ContactInfoCard";
import VehicleInfoCard from "./leads/detail/VehicleInfoCard";
import QuickContactCard from "./leads/detail/QuickContactCard";
import LeadSummaryCard from "./leads/detail/LeadSummaryCard";
import AIAutomationCard from "./leads/detail/AIAutomationCard";
import CommunicationPrefsCard from "./leads/detail/CommunicationPrefsCard";
import ActivityTimeline from "./leads/detail/ActivityTimeline";
import MessageThread from "./inbox/MessageThread";
import EmailTab from "./leads/detail/EmailTab";

const LeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [showMessageComposer, setShowMessageComposer] = useState(false);

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      if (!id) throw new Error("No lead ID provided");
      
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          phone_numbers (*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead Not Found</h2>
          <p className="text-gray-600">The lead you're looking for doesn't exist or you don't have permission to view it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LeadDetailHeader 
        lead={lead} 
        onSendMessage={() => setShowMessageComposer(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info Cards */}
        <div className="lg:col-span-1 space-y-6">
          <ContactInfoCard lead={lead} />
          <VehicleInfoCard lead={lead} />
          <QuickContactCard lead={lead} />
          <LeadSummaryCard lead={lead} />
          <AIAutomationCard lead={lead} />
          <CommunicationPrefsCard lead={lead} />
        </div>

        {/* Right Column - Messages and Activity */}
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
                leadId={lead.id}
                showComposer={showMessageComposer}
                onComposerClose={() => setShowMessageComposer(false)}
              />
            </TabsContent>

            <TabsContent value="emails" className="space-y-6">
              <EmailTab leadId={lead.id} />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <ActivityTimeline leadId={lead.id} />
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
      </div>
    </div>
  );
};

export default LeadDetail;
