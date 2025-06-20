
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Phone, 
  Mail, 
  Car, 
  MapPin, 
  DollarSign, 
  Calendar,
  Clock,
  MessageSquare,
  TrendingUp,
  Star,
  UserX
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppointmentsList from '../appointments/AppointmentsList';
import MarkLostConfirmDialog from '../leads/MarkLostConfirmDialog';
import { markLeadAsLost } from '@/services/leadStatusService';

interface LeadContextPanelProps {
  conversation: any;
  onScheduleAppointment?: () => void;
}

const LeadContextPanel = ({ conversation, onScheduleAppointment }: LeadContextPanelProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showMarkLostDialog, setShowMarkLostDialog] = useState(false);
  const [isMarkingLost, setIsMarkingLost] = useState(false);

  const handleMarkAsLost = async () => {
    if (!conversation?.leadId) return;
    
    setIsMarkingLost(true);
    try {
      const result = await markLeadAsLost(conversation.leadId);
      
      if (result.success) {
        toast({
          title: "Lead marked as lost",
          description: `${conversation.leadName} has been marked as lost and removed from all automation.`,
        });
        
        // Refresh the page to reflect changes
        window.location.reload();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark lead as lost",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsMarkingLost(false);
      setShowMarkLostDialog(false);
    }
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
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-blue-600" />
            <span>Lead Details</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 h-[calc(100%-5rem)] overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <TabsContent value="overview" className="mt-4 space-y-4">
                {/* Lead Information */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{conversation.leadName}</h3>
                    <Badge variant={conversation.status === 'new' ? 'default' : 'secondary'}>
                      {conversation.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {conversation.leadPhone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{conversation.leadPhone}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 text-sm">
                      <Car className="h-4 w-4 text-gray-400" />
                      <span>{conversation.vehicleInterest || 'No vehicle specified'}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Last message: {conversation.lastMessageTime}</span>
                    </div>
                  </div>

                  {conversation.unreadCount > 0 && (
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-600">
                        {conversation.unreadCount} unread message{conversation.unreadCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Quick Actions */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {onScheduleAppointment && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onScheduleAppointment}
                        className="flex items-center space-x-1"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Schedule</span>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex items-center space-x-1">
                      <Phone className="h-4 w-4" />
                      <span>Call</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center space-x-1">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center space-x-1">
                      <Car className="h-4 w-4" />
                      <span>Show Cars</span>
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Lead Actions */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Lead Actions</h4>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMarkLostDialog(true)}
                    disabled={isMarkingLost || conversation.status === 'lost'}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    {isMarkingLost ? 'Marking Lost...' : 'Mark Lost'}
                  </Button>
                </div>

                <Separator />

                {/* AI Status */}
                {conversation.aiOptIn && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">AI Status</h4>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium text-purple-800">Finn AI Active</span>
                      </div>
                      <p className="text-xs text-purple-600">
                        AI assistant is helping with this lead
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="appointments" className="mt-4">
                <AppointmentsList
                  leadId={conversation.leadId}
                  onScheduleNew={onScheduleAppointment}
                  maxHeight="500px"
                />
              </TabsContent>

              <TabsContent value="activity" className="mt-4 space-y-4">
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Activity tracking coming soon</p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <MarkLostConfirmDialog
        open={showMarkLostDialog}
        onOpenChange={setShowMarkLostDialog}
        onConfirm={handleMarkAsLost}
        leadCount={1}
        leadName={conversation.leadName}
      />
    </>
  );
};

export default LeadContextPanel;
