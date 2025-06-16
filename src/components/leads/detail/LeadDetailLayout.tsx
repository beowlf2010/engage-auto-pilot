
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConversationData } from "@/hooks/useConversationData";
import { useCompliance } from "@/hooks/useCompliance";
import LeadDetailHeader from "./LeadDetailHeader";
import LeadInfoCardsSection from "./LeadInfoCardsSection";
import EnhancedMessageThread from "./EnhancedMessageThread";
import ActivityTimelineComponent from "./ActivityTimelineComponent";
import EmailTab from "./EmailTab";
import type { Lead } from "@/types/lead";
import type { LeadDetailData } from "@/services/leadDetailService";

interface LeadDetailLayoutProps {
  lead: LeadDetailData;
  transformedLead: Lead;
  messageThreadLead: any;
  phoneNumbers: any[];
  primaryPhone: string;
  showMessageComposer: boolean;
  setShowMessageComposer: (show: boolean) => void;
  onPhoneSelect: (phone: any) => void;
}

const LeadDetailLayout: React.FC<LeadDetailLayoutProps> = ({
  lead,
  transformedLead,
  messageThreadLead,
  phoneNumbers,
  primaryPhone,
  showMessageComposer,
  setShowMessageComposer,
  onPhoneSelect
}) => {
  const navigate = useNavigate();
  const compliance = useCompliance();
  const { messages, messagesLoading, loadMessages, sendMessage } = useConversationData();

  // Load messages when component mounts or lead changes
  React.useEffect(() => {
    if (lead.id) {
      loadMessages(lead.id);
    }
  }, [lead.id, loadMessages]);

  const handleSendMessage = async (message: string): Promise<void> => {
    try {
      console.log("Sending message:", message);
      await sendMessage(lead.id, message, false, {
        checkSuppressed: compliance.checkSuppressed,
        enforceConsent: compliance.enforceConsent,
        storeConsent: compliance.storeConsent
      });
      
      // Reload messages to show the new message
      await loadMessages(lead.id);
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error; // Let the EnhancedMessageThread handle the error display
    }
  };

  // Transform lead for header component
  const headerLead = {
    id: lead.id,
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    status: lead.status,
    vehicle_interest: lead.vehicleInterest,
    city: lead.city,
    state: lead.state,
    created_at: lead.createdAt
  };

  // Use the messages from the conversation hook if available, otherwise use lead conversations
  const conversationMessages = messages.length > 0 ? messages : lead.conversations;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/leads")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leads
              </Button>
            </div>
            <Button
              onClick={() => setShowMessageComposer(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Lead Info */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              <LeadDetailHeader lead={headerLead} />
              <LeadInfoCardsSection 
                lead={lead} 
                phoneNumbers={phoneNumbers}
                primaryPhone={primaryPhone}
                onPhoneSelect={onPhoneSelect}
              />
            </div>
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="messages" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>

              <TabsContent value="messages" className="space-y-0">
                <div className="h-[600px]">
                  <EnhancedMessageThread
                    messages={conversationMessages}
                    onSendMessage={handleSendMessage}
                    isLoading={messagesLoading}
                    leadName={`${lead.firstName} ${lead.lastName}`}
                  />
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-0">
                <div className="h-[600px]">
                  <ActivityTimelineComponent
                    activities={lead.activityTimeline}
                  />
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-0">
                <div className="h-[600px]">
                  <EmailTab leadId={lead.id} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailLayout;
