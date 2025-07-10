import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, Pause, Clock, CheckCircle, XCircle, AlertTriangle, 
  MessageSquare, Settings, Filter, Calendar 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const AIWorkflowsPage = () => {
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch message approval queue
  const { data: approvalQueue = [], isLoading: queueLoading } = useQuery({
    queryKey: ['message-approval-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_message_approval_queue')
        .select(`
          *,
          leads!inner(first_name, last_name, vehicle_interest)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch AI template performance
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['ai-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_template_performance')
        .select('*')
        .order('performance_score', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch personalization rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['personalization-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_personalization_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const approveMessage = async (messageId: string, approved: boolean, reason?: string) => {
    try {
      const { error } = await supabase
        .from('ai_message_approval_queue')
        .update({
          approved,
          rejected: !approved,
          approved_at: approved ? new Date().toISOString() : null,
          rejected_at: !approved ? new Date().toISOString() : null,
          rejection_reason: reason || null,
        })
        .eq('id', messageId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['message-approval-queue'] });
      toast({
        title: approved ? "Message Approved" : "Message Rejected",
        description: `Message has been ${approved ? 'approved' : 'rejected'} successfully`,
      });
      setSelectedMessage(null);
      setApprovalNote('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update message status",
        variant: "destructive",
      });
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'normal':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (message: any) => {
    if (message.approved) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (message.rejected) return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const pendingCount = approvalQueue.filter(m => !m.approved && !m.rejected).length;
  const approvedCount = approvalQueue.filter(m => m.approved).length;
  const rejectedCount = approvalQueue.filter(m => m.rejected).length;

  const isLoading = queueLoading || templatesLoading || rulesLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Workflows</h1>
          <p className="text-muted-foreground">
            Manage automated message generation and approval workflows
          </p>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Workflow Settings
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Today</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Approval Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvalQueue.filter(m => m.auto_approved).length > 0 
                ? ((approvalQueue.filter(m => m.auto_approved).length / approvalQueue.length) * 100).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queue">Approval Queue ({pendingCount})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="rules">Personalization ({rules.length})</TabsTrigger>
          <TabsTrigger value="schedule">Scheduling</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Approval Queue</CardTitle>
              <CardDescription>
                Review and approve AI-generated messages before they're sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvalQueue.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold">No messages in queue</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      All AI-generated messages have been processed
                    </p>
                  </div>
                ) : (
                  approvalQueue.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-4 border rounded-lg transition-all hover:shadow-md",
                        !message.approved && !message.rejected && "border-yellow-200 bg-yellow-50"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-blue-100">
                          {getStatusIcon(message)}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold">
                                {message.leads?.first_name} {message.leads?.last_name}
                              </h4>
                              <Badge variant="outline">{message.message_stage}</Badge>
                              <Badge variant={getUrgencyColor(message.urgency_level)}>
                                {message.urgency_level}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          
                          <div className="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                            <p className="text-sm">{message.message_content}</p>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Scheduled: {new Date(message.scheduled_send_at).toLocaleString()}</span>
                            </div>
                            
                            {!message.approved && !message.rejected && (
                              <div className="flex items-center gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedMessage(message)}
                                    >
                                      Review
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Review AI-Generated Message</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Lead</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedMessage?.leads?.first_name} {selectedMessage?.leads?.last_name}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Message Content</Label>
                                        <div className="p-3 bg-gray-50 rounded border">
                                          <p className="text-sm">{selectedMessage?.message_content}</p>
                                        </div>
                                      </div>
                                      <div>
                                        <Label htmlFor="approval-note">Notes (Optional)</Label>
                                        <Textarea
                                          id="approval-note"
                                          value={approvalNote}
                                          onChange={(e) => setApprovalNote(e.target.value)}
                                          placeholder="Add any notes about this approval/rejection..."
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          onClick={() => approveMessage(selectedMessage?.id, true)}
                                          className="flex-1"
                                        >
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Approve
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          onClick={() => approveMessage(selectedMessage?.id, false, approvalNote)}
                                          className="flex-1"
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Reject
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            )}
                          </div>
                          
                          {message.rejected && message.rejection_reason && (
                            <div className="p-2 bg-red-50 rounded border-l-4 border-red-500">
                              <p className="text-xs text-red-700">
                                <strong>Rejection Reason:</strong> {message.rejection_reason}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Message Templates</CardTitle>
              <CardDescription>
                Performance analytics for AI message templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{template.template_variant}</Badge>
                        <span className="text-sm font-medium">
                          Performance Score: {template.performance_score.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={template.response_rate > 0.3 ? 'default' : 'secondary'}>
                          {(template.response_rate * 100).toFixed(1)}% Response Rate
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-sm">{template.template_content}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>Used {template.usage_count} times</span>
                      <span>{template.positive_responses} positive responses</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personalization Rules</CardTitle>
              <CardDescription>
                AI personalization rules and their effectiveness
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">{rule.rule_name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">Priority: {rule.priority}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Type: {rule.rule_type}
                    </p>
                    <div className="p-3 bg-gray-50 rounded">
                      <pre className="text-xs">
                        {JSON.stringify(rule.condition_criteria, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Scheduling</CardTitle>
              <CardDescription>
                Configure when AI messages should be sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="business-hours">Business Hours</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select business hours" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9-17">9 AM - 5 PM</SelectItem>
                        <SelectItem value="8-18">8 AM - 6 PM</SelectItem>
                        <SelectItem value="24h">24 Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="est">Eastern Time</SelectItem>
                        <SelectItem value="cst">Central Time</SelectItem>
                        <SelectItem value="mst">Mountain Time</SelectItem>
                        <SelectItem value="pst">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button>Save Settings</Button>
                  <Button variant="outline">Reset to Default</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIWorkflowsPage;