
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  getPendingMessages, 
  approveMessage, 
  rejectMessage,
  ApprovalQueueMessage 
} from '@/services/aiMessageApprovalService';
import { CheckCircle, XCircle, Clock, AlertTriangle, User, MessageSquare } from 'lucide-react';

const MessageApprovalQueue = () => {
  const [pendingMessages, setPendingMessages] = useState<ApprovalQueueMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

  const fetchPendingMessages = async () => {
    try {
      const messages = await getPendingMessages();
      setPendingMessages(messages);
    } catch (error) {
      console.error('Error fetching pending messages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (messageId: string) => {
    try {
      const success = await approveMessage(messageId);
      if (success) {
        toast({
          title: "Success",
          description: "Message approved and will be sent",
        });
        fetchPendingMessages();
      } else {
        throw new Error('Failed to approve message');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve message",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (messageId: string) => {
    try {
      if (!rejectionReason.trim()) {
        toast({
          title: "Error",
          description: "Please provide a rejection reason",
          variant: "destructive"
        });
        return;
      }

      const success = await rejectMessage(messageId, rejectionReason);
      if (success) {
        toast({
          title: "Success",
          description: "Message rejected",
        });
        setSelectedMessage(null);
        setRejectionReason('');
        fetchPendingMessages();
      } else {
        throw new Error('Failed to reject message');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject message",
        variant: "destructive"
      });
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatScheduledTime = (scheduledAt: string) => {
    const date = new Date(scheduledAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Overdue';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  useEffect(() => {
    fetchPendingMessages();
    const interval = setInterval(fetchPendingMessages, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading approval queue...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Message Approval Queue</h2>
          <Badge variant="secondary">{pendingMessages.length} pending</Badge>
        </div>
        <Button onClick={fetchPendingMessages} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {pendingMessages.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">No messages pending approval at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingMessages.map((message) => (
            <Card key={message.id} className="border-l-4 border-l-yellow-400">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <CardTitle className="text-sm">
                        {(message as any).leads?.first_name} {(message as any).leads?.last_name}
                      </CardTitle>
                      <p className="text-xs text-gray-500">
                        {(message as any).leads?.vehicle_interest}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getUrgencyColor(message.urgency_level)}>
                      {message.urgency_level}
                    </Badge>
                    <Badge variant="outline">
                      {message.message_stage}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Proposed Message:</h4>
                  <div className="bg-gray-50 p-3 rounded border text-sm">
                    {message.message_content}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>Scheduled: {formatScheduledTime(message.scheduled_send_at)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleApprove(message.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    
                    <Button
                      onClick={() => setSelectedMessage(
                        selectedMessage === message.id ? null : message.id
                      )}
                      size="sm"
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>

                {selectedMessage === message.id && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <h5 className="text-sm font-medium text-red-800 mb-2">
                      Rejection Reason:
                    </h5>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please explain why this message should be rejected..."
                      className="mb-2"
                      rows={2}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={() => {
                          setSelectedMessage(null);
                          setRejectionReason('');
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleReject(message.id)}
                        size="sm"
                        variant="destructive"
                      >
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageApprovalQueue;
