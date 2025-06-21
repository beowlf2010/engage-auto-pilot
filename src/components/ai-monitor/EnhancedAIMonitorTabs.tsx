
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle, MessageSquare, User, Clock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import LeadStatusFixPanel from './LeadStatusFixPanel';

interface ApprovalQueueItem {
  id: string;
  lead_id: string;
  message_content: string;
  message_stage: string;
  created_at: string;
  urgency_level: string;
  leads?: {
    first_name: string;
    last_name: string;
    vehicle_interest: string;
  };
}

interface EmergencyFixesStatusProps {
  // Add any props if needed
}

const EmergencyFixesStatus: React.FC<EmergencyFixesStatusProps> = () => {
  const [totalLeads, setTotalLeads] = useState(0);
  const [leadsWithIssues, setLeadsWithIssues] = useState(0);
  const [leadsFixed, setLeadsFixed] = useState(0);

  useEffect(() => {
    // Fetch total leads
    supabase
      .from('leads')
      .select('count', { count: 'exact' })
      .then(response => {
        if (response.data && response.data.length > 0) {
          setTotalLeads(response.data[0].count || 0);
        }
      });

    // Fetch leads with potential issues (example: no phone number, stuck AI stage)
    supabase
      .from('leads')
      .select('count', { count: 'exact' })
      .or('phone_number.is.null, ai_stage.eq.stuck')
      .then(response => {
        if (response.data && response.data.length > 0) {
          setLeadsWithIssues(response.data[0].count || 0);
        }
      });

    // Fetch leads that have been fixed recently (example: AI stage reset in last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from('leads')
      .select('count', { count: 'exact' })
      .gte('ai_stage_reset_at', twentyFourHoursAgo)
      .then(response => {
        if (response.data && response.data.length > 0) {
          setLeadsFixed(response.data[0].count || 0);
        }
      });
  }, []);

  const issuesPercentage = totalLeads > 0 ? (leadsWithIssues / totalLeads) * 100 : 0;
  const fixedPercentage = totalLeads > 0 ? (leadsFixed / totalLeads) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-3 mb-2">
          <User className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold">Total Leads</h3>
        </div>
        <p className="text-2xl font-bold text-gray-800">{totalLeads}</p>
      </div>

      <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
        <div className="flex items-center space-x-3 mb-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-yellow-800">Leads with Issues</h3>
        </div>
        <p className="text-2xl font-bold text-yellow-900">{leadsWithIssues}</p>
        <Progress value={issuesPercentage} className="mt-2" />
        <p className="text-sm text-yellow-700">{issuesPercentage.toFixed(1)}% of total leads</p>
      </div>

      <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
        <div className="flex items-center space-x-3 mb-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold text-green-800">Leads Fixed (24h)</h3>
        </div>
        <p className="text-2xl font-bold text-green-900">{leadsFixed}</p>
        <Progress value={fixedPercentage} className="mt-2" />
        <p className="text-sm text-green-700">{fixedPercentage.toFixed(1)}% of total leads</p>
      </div>
    </div>
  );
};

const EnhancedAIMonitorTabs = () => {
  const [approvalQueue, setApprovalQueue] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ApprovalQueueItem | null>(null);
  const [overrideMessage, setOverrideMessage] = useState('');
  const { toast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    fetchApprovalQueue();

    // Set up a real-time subscription to the ai_message_approval_queue table
    const channel = supabase
      .channel('ai_message_approval_queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_message_approval_queue' },
        (payload) => {
          console.log('Change received!', payload)
          fetchApprovalQueue(); // Refresh the queue on any change
        }
      )
      .subscribe()

    // Unsubscribe when the component unmounts
    return () => {
      supabase.removeChannel(channel)
    }
  }, []);

  const fetchApprovalQueue = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_message_approval_queue')
        .select(`
          *,
          leads!inner(first_name, last_name, vehicle_interest)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching approval queue:', error);
        toast({
          title: "Error",
          description: "Failed to load approval queue",
          variant: "destructive",
        })
      } else {
        setApprovalQueue(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMessageSelect = (message: ApprovalQueueItem) => {
    setSelectedMessage(message);
    setOverrideMessage(message.message_content); // Initialize override with original
  };

  const handleApproveMessage = async () => {
    if (!selectedMessage) return;

    setIsApproving(true);
    try {
      // Call the function to send the AI-generated message
      const { error } = await supabase.functions.invoke('send-ai-approved-message', {
        body: {
          leadId: selectedMessage.lead_id,
          messageBody: overrideMessage, // Use the overridden message
          approvalQueueId: selectedMessage.id
        },
      });

      if (error) {
        console.error('Error sending AI-approved message:', error);
        toast({
          title: "Approval Failed",
          description: "Failed to send the approved message.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Message Approved",
          description: "The AI-generated message has been sent.",
        })
      }

      // Refresh the approval queue
      await fetchApprovalQueue();
      setSelectedMessage(null); // Clear selected message
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectMessage = async () => {
    if (!selectedMessage) return;

    setIsRejecting(true);
    try {
      // Delete the message from the approval queue
      const { error } = await supabase
        .from('ai_message_approval_queue')
        .delete()
        .eq('id', selectedMessage.id);

      if (error) {
        console.error('Error deleting message from approval queue:', error);
        toast({
          title: "Rejection Failed",
          description: "Failed to reject the message.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Message Rejected",
          description: "The AI-generated message has been rejected.",
        })
      }

      // Refresh the approval queue
      await fetchApprovalQueue();
      setSelectedMessage(null); // Clear selected message
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Fixes Status */}
      <EmergencyFixesStatus />

      {/* Add the new Lead Status Fix Panel */}
      <LeadStatusFixPanel />

      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="queue">Approval Queue</TabsTrigger>
          <TabsTrigger value="performance">AI Performance</TabsTrigger>
          <TabsTrigger value="settings">AI Settings</TabsTrigger>
          <TabsTrigger value="history">Message History</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableCaption>AI Message Approval Queue</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Created At</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : approvalQueue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No messages in the approval queue.</TableCell>
                  </TableRow>
                ) : (
                  approvalQueue.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-medium">{format(new Date(message.created_at), 'MMM dd, yyyy hh:mm a')}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Avatar>
                            <AvatarImage src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${message.lead_id}`} />
                            <AvatarFallback>
                              {message.leads ? 
                                `${message.leads.first_name.substring(0, 1)}${message.leads.last_name.substring(0, 1)}`.toUpperCase() : 
                                'UN'
                              }
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {message.leads ? 
                              `${message.leads.first_name} ${message.leads.last_name}` : 
                              'Unknown Lead'
                            }
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="truncate">{message.message_content}</div>
                      </TableCell>
                      <TableCell>{message.message_stage}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleMessageSelect(message)}>
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>AI Message Review</DialogTitle>
                              <DialogDescription>
                                Review and approve or reject the AI-generated message.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                  Lead
                                </Label>
                                <Input 
                                  id="name" 
                                  value={message.leads ? 
                                    `${message.leads.first_name} ${message.leads.last_name}` : 
                                    'Unknown Lead'
                                  } 
                                  className="col-span-3" 
                                  disabled 
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="ai-stage" className="text-right">
                                  Stage
                                </Label>
                                <Input id="ai-stage" value={message.message_stage} className="col-span-3" disabled />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="message" className="text-right">
                                  Message
                                </Label>
                                <Textarea
                                  id="message"
                                  value={overrideMessage}
                                  onChange={(e) => setOverrideMessage(e.target.value)}
                                  className="col-span-3"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="secondary" onClick={handleRejectMessage} disabled={isRejecting}>
                                Reject
                              </Button>
                              <Button type="button" onClick={handleApproveMessage} disabled={isApproving}>
                                Approve
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="performance">
          <div>
            <h2 className="text-lg font-semibold">AI Performance Metrics</h2>
            <p>Here, you'll find detailed analytics on AI performance, including message success rates,
              customer engagement levels, and areas for improvement.</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Overall success rate of AI-generated messages</li>
              <li>Customer engagement metrics (e.g., response rate, conversation length)</li>
              <li>Identification of common issues or bottlenecks in the AI communication process</li>
            </ul>
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <div>
            <h2 className="text-lg font-semibold">AI Configuration Settings</h2>
            <p>This section allows you to adjust various AI settings, such as message frequency,
              content templates, and escalation rules.</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Adjust message frequency and timing</li>
              <li>Customize AI message templates</li>
              <li>Define rules for escalating conversations to human agents</li>
            </ul>
          </div>
        </TabsContent>
        <TabsContent value="history">
          <div>
            <h2 className="text-lg font-semibold">AI Message History</h2>
            <p>Review a comprehensive log of all AI-generated messages, including their content,
              delivery status, and customer responses.</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Detailed log of all AI-generated messages</li>
              <li>Message content, delivery status, and customer responses</li>
              <li>Filtering and search capabilities for specific messages or leads</li>
            </ul>
          </div>
        </TabsContent>
        <TabsContent value="logs">
          <div>
            <h2 className="text-lg font-semibold">System Logs</h2>
            <p>Access detailed system logs to monitor AI operations, identify errors, and troubleshoot
              any issues that may arise.</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Real-time monitoring of AI operations</li>
              <li>Error tracking and troubleshooting tools</li>
              <li>Detailed logs for system administrators and developers</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAIMonitorTabs;
