
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

  // Transform the database lead object to match component expectations
  const transformedLead = {
    id: lead.id,
    firstName: lead.first_name,
    lastName: lead.last_name,
    middleName: lead.middle_name,
    email: lead.email,
    emailAlt: lead.email_alt,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    postalCode: lead.postal_code,
    vehicleInterest: lead.vehicle_interest,
    vehicleYear: lead.vehicle_year,
    vehicleMake: lead.vehicle_make,
    vehicleModel: lead.vehicle_model,
    vehicleVIN: lead.vehicle_vin,
    status: lead.status,
    source: lead.source,
    aiOptIn: lead.ai_opt_in || false,
    aiStage: lead.ai_stage,
    nextAiSendAt: lead.next_ai_send_at,
    createdAt: lead.created_at,
    salespersonId: lead.salesperson_id,
    doNotCall: lead.do_not_call,
    doNotEmail: lead.do_not_email,
    doNotMail: lead.do_not_mail,
    phoneNumbers: lead.phone_numbers?.map((phone: any) => ({
      id: phone.id,
      number: phone.number,
      type: phone.type,
      isPrimary: phone.is_primary,
      status: phone.status
    })) || [],
    conversations: [],
    activityTimeline: []
  };

  return (
    <div className="space-y-6">
      <LeadDetailHeader 
        lead={lead}
        onSendMessage={() => setShowMessageComposer(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info Cards */}
        <div className="lg:col-span-1 space-y-6">
          <ContactInfoCard lead={transformedLead} />
          <VehicleInfoCard lead={transformedLead} />
          <QuickContactCard />
          <LeadSummaryCard lead={transformedLead} />
          <AIAutomationCard lead={transformedLead} />
          <CommunicationPrefsCard lead={transformedLead} />
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
                lead={transformedLead}
                showComposer={showMessageComposer}
                onComposerClose={() => setShowMessageComposer(false)}
              />
            </TabsContent>

            <TabsContent value="emails" className="space-y-6">
              <EmailTab leadId={lead.id} />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <ActivityTimeline lead={transformedLead} />
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
