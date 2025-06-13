import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MessageSquare, 
  Edit, 
  User,
  Car,
  Calendar,
  MapPin,
  Bot,
  Clock,
  CheckCircle,
  XCircle,
  PhoneCall
} from "lucide-react";
import { fetchLeadDetail, LeadDetailData } from '@/services/leadDetailService';
import { formatPhoneForDisplay } from '@/utils/phoneUtils';
import { Skeleton } from "@/components/ui/skeleton";
import PhoneNumberDisplay from '@/components/PhoneNumberDisplay';

const LeadDetail = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeadDetail = async () => {
      if (!leadId) return;
      
      setLoading(true);
      const leadData = await fetchLeadDetail(leadId);
      setLead(leadData);
      setLoading(false);
    };

    loadLeadDetail();
  }, [leadId]);

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'new': 'bg-blue-100 text-blue-800',
      'engaged': 'bg-green-100 text-green-800',
      'paused': 'bg-yellow-100 text-yellow-800',
      'closed': 'bg-gray-100 text-gray-800',
      'lost': 'bg-red-100 text-red-800'
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lead_created':
        return <User className="w-4 h-4" />;
      case 'message_sent':
        return <MessageSquare className="w-4 h-4" />;
      case 'message_received':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handlePhoneSelect = (phoneNumber: string) => {
    // This could trigger SMS composition or phone dialing
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

  // Convert lead phone numbers to PhoneNumber format for the component
  const phoneNumbers = lead.phoneNumbers.map(phone => ({
    number: phone.number,
    type: phone.type as 'cell' | 'day' | 'eve',
    priority: 1, // Default priority, could be enhanced later
    status: phone.status as 'active' | 'failed' | 'opted_out'
  }));

  const primaryPhone = phoneNumbers.find(p => p.status === 'active')?.number || '';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {lead.firstName} {lead.lastName}
              {lead.middleName && ` ${lead.middleName}`}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={getStatusBadge(lead.status)}>
                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              </Badge>
              <span className="text-sm text-gray-500">
                Created {formatTimestamp(lead.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button>
            <MessageSquare className="w-4 h-4 mr-2" />
            Send Message
          </Button>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Lead
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Information */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="conversations">Messages</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Phone Numbers - Using PhoneNumberDisplay component */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-3">Phone Numbers</h4>
                    <PhoneNumberDisplay
                      phoneNumbers={phoneNumbers}
                      primaryPhone={primaryPhone}
                      onPhoneSelect={handlePhoneSelect}
                      compact={false}
                    />
                  </div>

                  <Separator />

                  {/* Email */}
                  {(lead.email || lead.emailAlt) && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Email</h4>
                      <div className="space-y-1">
                        {lead.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span>{lead.email}</span>
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          </div>
                        )}
                        {lead.emailAlt && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span>{lead.emailAlt}</span>
                            <Badge variant="outline" className="text-xs">Alt</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  {(lead.address || lead.city || lead.state) && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Address</h4>
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                          <div>
                            {lead.address && <div>{lead.address}</div>}
                            <div>
                              {lead.city && lead.city}
                              {lead.city && lead.state && ', '}
                              {lead.state} {lead.postalCode}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Car className="w-5 h-5 mr-2" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Interest:</span>
                      <p className="text-sm">{lead.vehicleInterest}</p>
                    </div>
                    {lead.vehicleYear && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Year:</span>
                        <p className="text-sm">{lead.vehicleYear}</p>
                      </div>
                    )}
                    {lead.vehicleMake && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Make:</span>
                        <p className="text-sm">{lead.vehicleMake}</p>
                      </div>
                    )}
                    {lead.vehicleModel && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Model:</span>
                        <p className="text-sm">{lead.vehicleModel}</p>
                      </div>
                    )}
                    {lead.vehicleVIN && (
                      <div className="col-span-2">
                        <span className="text-sm font-medium text-gray-700">VIN:</span>
                        <p className="text-sm font-mono">{lead.vehicleVIN}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conversations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Message History</CardTitle>
                </CardHeader>
                <CardContent>
                  {lead.conversations.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No messages yet</p>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {lead.conversations.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.direction === 'out'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.body}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs opacity-75">
                                {formatTimestamp(message.sentAt)}
                              </span>
                              {message.aiGenerated && (
                                <Bot className="w-3 h-3 opacity-75" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lead.activityTimeline.map((activity, index) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimestamp(activity.timestamp)}
                          </p>
                        </div>
                        {index < lead.activityTimeline.length - 1 && (
                          <div className="absolute left-2 mt-6 h-4 w-px bg-gray-200" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Quick Info & Actions */}
        <div className="space-y-6">
          {/* Lead Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Source:</span>
                <Badge variant="outline" className="ml-2">{lead.source}</Badge>
              </div>
              {lead.salespersonName && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Salesperson:</span>
                  <p className="text-sm">{lead.salespersonName}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-700">Messages:</span>
                <p className="text-sm">{lead.conversations.length} total</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Phone Numbers:</span>
                <p className="text-sm">{lead.phoneNumbers.length} numbers</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <PhoneNumberDisplay
                phoneNumbers={phoneNumbers}
                primaryPhone={primaryPhone}
                onPhoneSelect={handlePhoneSelect}
                compact={true}
              />
            </CardContent>
          </Card>

          {/* AI Automation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="w-5 h-5 mr-2" />
                AI Automation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={lead.aiOptIn ? "default" : "secondary"}>
                  {lead.aiOptIn ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              {lead.aiStage && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Stage:</span>
                  <p className="text-sm">{lead.aiStage}</p>
                </div>
              )}
              {lead.nextAiSendAt && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Next Message:</span>
                  <p className="text-sm">{formatTimestamp(lead.nextAiSendAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Phone:</span>
                <Badge variant={lead.doNotCall ? "destructive" : "outline"}>
                  {lead.doNotCall ? "Do Not Call" : "Allowed"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Email:</span>
                <Badge variant={lead.doNotEmail ? "destructive" : "outline"}>
                  {lead.doNotEmail ? "Do Not Email" : "Allowed"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Mail:</span>
                <Badge variant={lead.doNotMail ? "destructive" : "outline"}>
                  {lead.doNotMail ? "Do Not Mail" : "Allowed"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
