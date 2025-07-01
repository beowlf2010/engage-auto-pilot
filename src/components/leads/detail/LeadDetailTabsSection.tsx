
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Bot, BarChart3, Calendar, User } from "lucide-react";
import EnhancedMessageThread from "./EnhancedMessageThread";
import EnhancedUnifiedAIPanel from "./streamlined/EnhancedUnifiedAIPanel";
import LeadNotesSection from "./LeadNotesSection";
import LeadHistorySection from "./LeadHistorySection";

interface LeadDetailTabsSectionProps {
  lead: any;
  messages: any[];
  messagesLoading: boolean;
  onSendMessage: (message: string) => Promise<void>;
}

const LeadDetailTabsSection: React.FC<LeadDetailTabsSectionProps> = ({
  lead,
  messages,
  messagesLoading,
  onSendMessage
}) => {
  const [activeTab, setActiveTab] = useState("messages");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
      <TabsList className="grid w-full grid-cols-5 mb-4">
        <TabsTrigger value="messages" className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Messages
        </TabsTrigger>
        <TabsTrigger value="ai-intelligence" className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          AI Intelligence
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Notes
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="messages" className="h-[calc(100%-3rem)] overflow-hidden">
        <EnhancedMessageThread
          leadName={`${lead.firstName || ''} ${lead.lastName || ''}`.trim()}
          messages={messages}
          isLoading={messagesLoading}
          onSendMessage={onSendMessage}
        />
      </TabsContent>

      <TabsContent value="ai-intelligence" className="h-[calc(100%-3rem)] overflow-auto p-4">
        <EnhancedUnifiedAIPanel
          leadId={lead.id}
          leadName={`${lead.firstName || ''} ${lead.lastName || ''}`.trim()}
          messages={messages}
          vehicleInterest={lead.vehicleInterest || ''}
          onSendMessage={onSendMessage}
        />
      </TabsContent>

      <TabsContent value="analytics" className="h-[calc(100%-3rem)] overflow-auto p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Lead Analytics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900">Message Count</h4>
              <p className="text-2xl font-bold text-blue-800">{messages.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900">Status</h4>
              <p className="text-lg font-semibold text-green-800 capitalize">{lead.status}</p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="notes" className="h-[calc(100%-3rem)] overflow-auto">
        <LeadNotesSection leadId={lead.id} />
      </TabsContent>

      <TabsContent value="history" className="h-[calc(100%-3rem)] overflow-auto">
        <LeadHistorySection leadId={lead.id} />
      </TabsContent>
    </Tabs>
  );
};

export default LeadDetailTabsSection;
