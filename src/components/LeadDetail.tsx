
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { fetchLeadDetail, LeadDetailData } from '@/services/leadDetailService';
import { Skeleton } from "@/components/ui/skeleton";
import LeadMessaging from './leads/LeadMessaging';
import { Button } from '@/components/ui/button';
import { PhoneNumber } from '@/types/lead';
import LeadDetailHeader from './leads/detail/LeadDetailHeader';
import ContactInfoCard from './leads/detail/ContactInfoCard';
import VehicleInfoCard from './leads/detail/VehicleInfoCard';
import ActivityTimeline from './leads/detail/ActivityTimeline';
import LeadSummaryCard from './leads/detail/LeadSummaryCard';
import QuickContactCard from './leads/detail/QuickContactCard';
import AIAutomationCard from './leads/detail/AIAutomationCard';
import CommunicationPrefsCard from './leads/detail/CommunicationPrefsCard';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const LeadDetail = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const loadLeadDetail = async () => {
      if (!leadId) {
        setLoading(false);
        setError("No lead ID provided.");
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        const leadData = await fetchLeadDetail(leadId);
        setLead(leadData);
      } catch (err) {
        console.error("Failed to load lead details:", err);
        setError("An unexpected error occurred while fetching lead details.");
      } finally {
        setLoading(false);
      }
    };

    loadLeadDetail();
  }, [leadId]);

  const handlePhoneSelect = (phoneNumber: string) => {
    console.log('Selected phone:', phoneNumber);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Lead</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lead Not Found</h1>
          <p className="text-gray-600 mb-4">The requested lead could not be found.</p>
          <Button onClick={() => navigate('/leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  const phoneNumbers: PhoneNumber[] = lead.phoneNumbers.map(phone => ({
    number: phone.number,
    type: phone.type as 'cell' | 'day' | 'eve',
    priority: 1, // Default priority, could be enhanced later
    status: phone.status as 'active' | 'failed' | 'opted_out'
  }));

  const primaryPhone = phoneNumbers.find(p => p.status === 'active')?.number || '';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <LeadDetailHeader lead={lead} onSendMessageClick={() => setActiveTab("conversations")} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="conversations">Messages</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <ContactInfoCard 
                lead={lead} 
                phoneNumbers={phoneNumbers} 
                primaryPhone={primaryPhone}
                onPhoneSelect={handlePhoneSelect}
              />
              <VehicleInfoCard lead={lead} />
            </TabsContent>

            <TabsContent value="conversations">
              <Card>
                <CardHeader>
                  <CardTitle>Message History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {leadId && <LeadMessaging leadId={leadId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <ActivityTimeline activityTimeline={lead.activityTimeline} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <LeadSummaryCard lead={lead} />
          <QuickContactCard 
            phoneNumbers={phoneNumbers}
            primaryPhone={primaryPhone}
            onPhoneSelect={handlePhoneSelect}
          />
          <AIAutomationCard lead={lead} />
          <CommunicationPrefsCard lead={lead} />
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
