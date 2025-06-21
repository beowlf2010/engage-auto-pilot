
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Phone, Mail, Car, Clock, MessageSquare, Settings, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface LeadDetailsModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
}

interface LeadDetails {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  vehicle_interest: string;
  source: string;
  status: string;
  ai_opt_in: boolean;
  ai_stage?: string;
  ai_sequence_paused: boolean;
  ai_pause_reason?: string;
  next_ai_send_at?: string;
  ai_messages_sent: number;
  created_at: string;
  phone_numbers: Array<{
    id: string;
    number: string;
    type: string;
    is_primary: boolean;
    status: string;
  }>;
  conversations: Array<{
    id: string;
    body: string;
    direction: string;
    sent_at: string;
    ai_generated: boolean;
  }>;
}

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ open, onClose, leadId }) => {
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && leadId) {
      fetchLeadDetails();
    }
  }, [open, leadId]);

  const fetchLeadDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          phone_numbers (id, number, type, is_primary, status),
          conversations (id, body, direction, sent_at, ai_generated)
        `)
        .eq('id', leadId)
        .single();

      if (error) throw error;
      setLeadDetails(data);
    } catch (error) {
      console.error('Error fetching lead details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToLead = () => {
    navigate(`/leads/${leadId}`);
    onClose();
  };

  const getPrimaryPhone = () => {
    return leadDetails?.phone_numbers?.find(p => p.is_primary)?.number || 
           leadDetails?.phone_numbers?.[0]?.number || 
           'No phone number';
  };

  const getAIStatusBadge = () => {
    if (!leadDetails?.ai_opt_in) return <Badge variant="secondary">AI Disabled</Badge>;
    if (leadDetails.ai_sequence_paused) return <Badge variant="destructive">AI Paused</Badge>;
    return <Badge variant="default">AI Active</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'new': 'default',
      'engaged': 'secondary',
      'paused': 'outline',
      'closed': 'secondary',
      'lost': 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
  };

  const recentMessages = leadDetails?.conversations
    ?.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
    ?.slice(0, 3) || [];

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!leadDetails) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="text-center p-8">
            <p>Lead details not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {leadDetails.first_name} {leadDetails.last_name}
          </DialogTitle>
          <DialogDescription>
            Lead details and communication history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">Primary Phone:</span>
                <span className="ml-2">{getPrimaryPhone()}</span>
                {leadDetails.phone_numbers.length > 1 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    +{leadDetails.phone_numbers.length - 1} more
                  </Badge>
                )}
              </div>
              {leadDetails.email && (
                <div>
                  <span className="text-sm font-medium">Email:</span>
                  <span className="ml-2">{leadDetails.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(leadDetails.status)}
                <span className="text-sm font-medium ml-2">Source:</span>
                <Badge variant="outline">{leadDetails.source}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Interest */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle Interest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{leadDetails.vehicle_interest}</p>
            </CardContent>
          </Card>

          {/* AI Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                AI Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                {getAIStatusBadge()}
                <span className="text-sm">Messages sent: {leadDetails.ai_messages_sent}</span>
              </div>
              
              {leadDetails.ai_stage && (
                <div>
                  <span className="text-sm font-medium">Current Stage:</span>
                  <Badge variant="outline" className="ml-2">{leadDetails.ai_stage}</Badge>
                </div>
              )}

              {leadDetails.ai_sequence_paused && leadDetails.ai_pause_reason && (
                <div>
                  <span className="text-sm font-medium">Pause Reason:</span>
                  <span className="ml-2 text-sm text-red-600">{leadDetails.ai_pause_reason}</span>
                </div>
              )}

              {leadDetails.next_ai_send_at && !leadDetails.ai_sequence_paused && (
                <div>
                  <span className="text-sm font-medium">Next Message:</span>
                  <span className="ml-2 text-sm">{formatDate(leadDetails.next_ai_send_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Messages */}
          {recentMessages.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Recent Messages ({leadDetails.conversations.length} total)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentMessages.map((message) => (
                  <div key={message.id} className="border-l-2 border-gray-200 pl-3 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={message.direction === 'in' ? 'default' : 'secondary'}>
                        {message.direction === 'in' ? 'Incoming' : 'Outgoing'}
                      </Badge>
                      {message.ai_generated && (
                        <Badge variant="outline" className="text-xs">AI</Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDate(message.sent_at)}
                      </span>
                    </div>
                    <p className="text-sm">{message.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Lead Created */}
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Lead created: {formatDate(leadDetails.created_at)}
          </div>
        </div>

        <Separator />

        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleNavigateToLead} className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            View Full Lead Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsModal;
