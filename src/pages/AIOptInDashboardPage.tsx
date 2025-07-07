import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Bot, 
  Pause, 
  Play, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Search,
  Filter,
  Download,
  XCircle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OptimizedLoading } from '@/components/ui/OptimizedLoading';
import EnhancedBulkAIOptIn from '@/components/leads/EnhancedBulkAIOptIn';
import EnhancedAIPreview from '@/components/leads/EnhancedAIPreview';
import { toast } from '@/hooks/use-toast';
import { getLearnedNameValidation } from '@/services/nameValidationLearningService';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  vehicle_interest?: string;
  ai_opt_in?: boolean;
  ai_stage?: string;
  last_reply_at?: string;
  status: string;
  created_at: string;
  ai_strategy_bucket?: string;
  message_intensity?: string;
}

interface ValidationStatus {
  nameValidation: boolean;
  vehicleValidation: boolean;
  nameConfidence: number;
  vehicleConfidence: number;
  hasLearningData: boolean;
}

interface AIStats {
  totalAIEnabled: number;
  activeSequences: number;
  pausedSequences: number;
  pendingReview: number;
  responseRate: number;
}

const AIOptInDashboardPage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [aiStats, setAIStats] = useState<AIStats>({
    totalAIEnabled: 0,
    activeSequences: 0,
    pausedSequences: 0,
    pendingReview: 0,
    responseRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiStatusFilter, setAIStatusFilter] = useState<string>('all');
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [validationStatuses, setValidationStatuses] = useState<Map<string, ValidationStatus>>(new Map());
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch leads with AI-related data
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id, first_name, last_name, email, vehicle_interest, 
          ai_opt_in, ai_stage, last_reply_at, status, created_at,
          ai_strategy_bucket, message_intensity
        `)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      setLeads(leadsData || []);

      // Fetch validation statuses for all leads
      await fetchValidationStatuses(leadsData || []);

      // Calculate AI statistics
      const totalAIEnabled = leadsData?.filter(lead => lead.ai_opt_in).length || 0;
      const activeSequences = leadsData?.filter(lead => 
        lead.ai_opt_in && lead.ai_stage === 'scheduled'
      ).length || 0;
      const pausedSequences = leadsData?.filter(lead => 
        lead.ai_opt_in && lead.ai_stage === 'paused'
      ).length || 0;
      const pendingReview = leadsData?.filter(lead => 
        !lead.ai_opt_in && (!lead.vehicle_interest || lead.vehicle_interest.length < 10)
      ).length || 0;

      setAIStats({
        totalAIEnabled,
        activeSequences,
        pausedSequences,
        pendingReview,
        responseRate: totalAIEnabled > 0 ? Math.round((activeSequences / totalAIEnabled) * 100) : 0
      });

    } catch (error) {
      console.error('Error fetching AI opt-in data:', error);
      toast({
        title: "Error",
        description: "Failed to load AI opt-in data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchValidationStatuses = async (leadsData: Lead[]) => {
    const statusMap = new Map<string, ValidationStatus>();
    
    for (const lead of leadsData) {
      if (!lead.ai_opt_in) { // Only check validation for non-AI-enabled leads
        try {
          // Check name validation
          const nameValidation = await getLearnedNameValidation(lead.first_name);
          const nameThreshold = 0.6;
          const vehicleThreshold = 0.6;
          
          // Simple heuristics for vehicle validation (you can enhance this)
          const vehicleConfidence = lead.vehicle_interest && lead.vehicle_interest.length > 10 ? 0.8 : 0.3;
          
          statusMap.set(lead.id, {
            nameValidation: nameValidation ? nameValidation.confidence >= nameThreshold : lead.first_name.length > 2,
            vehicleValidation: vehicleConfidence >= vehicleThreshold,
            nameConfidence: nameValidation?.confidence || (lead.first_name.length > 2 ? 0.7 : 0.3),
            vehicleConfidence,
            hasLearningData: !!nameValidation
          });
        } catch (error) {
          console.error('Error fetching validation for lead:', lead.id, error);
          // Fallback to simple validation
          statusMap.set(lead.id, {
            nameValidation: lead.first_name.length > 2,
            vehicleValidation: !!lead.vehicle_interest && lead.vehicle_interest.length > 10,
            nameConfidence: lead.first_name.length > 2 ? 0.7 : 0.3,
            vehicleConfidence: lead.vehicle_interest && lead.vehicle_interest.length > 10 ? 0.8 : 0.3,
            hasLearningData: false
          });
        }
      }
    }
    
    setValidationStatuses(statusMap);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !searchTerm || 
        `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.vehicle_interest?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAIFilter = aiStatusFilter === 'all' ||
        (aiStatusFilter === 'enabled' && lead.ai_opt_in) ||
        (aiStatusFilter === 'disabled' && !lead.ai_opt_in) ||
        (aiStatusFilter === 'active' && lead.ai_opt_in && lead.ai_stage === 'scheduled') ||
        (aiStatusFilter === 'paused' && lead.ai_opt_in && lead.ai_stage === 'paused');

      return matchesSearch && matchesAIFilter;
    });
  }, [leads, searchTerm, aiStatusFilter]);

  const toggleLeadSelection = (lead: Lead) => {
    setSelectedLeads(prev => 
      prev.find(l => l.id === lead.id)
        ? prev.filter(l => l.id !== lead.id)
        : [...prev, lead]
    );
  };

  const selectAllFiltered = () => {
    setSelectedLeads(filteredLeads);
  };

  const clearSelection = () => {
    setSelectedLeads([]);
  };

  const handleAIToggle = async (leadId: string, enable: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: enable,
          ai_stage: enable ? 'scheduled' : null
        })
        .eq('id', leadId);

      if (error) throw error;

      await fetchData();
      toast({
        title: "Success",
        description: `AI ${enable ? 'enabled' : 'disabled'} for lead`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update AI status",
        variant: "destructive"
      });
    }
  };

  const handlePreviewOpen = (leadId: string) => {
    setPreviewLeadId(leadId);
  };

  const handlePreviewClose = () => {
    setPreviewLeadId(null);
  };

  const handleAIEnabled = () => {
    fetchData(); // Refresh data after AI is enabled
  };

  const getValidationIcon = (isValid: boolean, confidence: number) => {
    const threshold = 0.6;
    if (isValid && confidence >= threshold) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    return <XCircle className="w-4 h-4 text-amber-600" />;
  };

  const getValidationBadge = (isValid: boolean, confidence: number) => {
    const threshold = 0.6;
    if (isValid && confidence >= threshold) {
      return <Badge className="bg-green-100 text-green-800">Pass</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-800">Review</Badge>;
  };

  const getDataQualityScore = (lead: Lead) => {
    let score = 0;
    if (lead.first_name && lead.first_name.length > 1) score += 25;
    if (lead.last_name && lead.last_name.length > 1) score += 25;
    if (lead.email && lead.email.includes('@')) score += 25;
    if (lead.vehicle_interest && lead.vehicle_interest.length > 10) score += 25;
    return score;
  };

  const getQualityBadge = (score: number) => {
    if (score >= 75) return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
  };

  if (loading) {
    return <OptimizedLoading variant="dashboard" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Opt-In Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage AI automation across your lead database
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <TrendingUp className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI-Enabled Leads</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats.totalAIEnabled}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((aiStats.totalAIEnabled / leads.length) * 100)}% of total leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{aiStats.activeSequences}</div>
            <p className="text-xs text-muted-foreground">
              Currently being nurtured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused Sequences</CardTitle>
            <Pause className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{aiStats.pausedSequences}</div>
            <p className="text-xs text-muted-foreground">
              Temporarily paused
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Review</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{aiStats.pendingReview}</div>
            <p className="text-xs text-muted-foreground">
              Poor data quality
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Engagement</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats.responseRate}%</div>
            <p className="text-xs text-muted-foreground">
              Active engagement rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="management" className="space-y-4">
        <TabsList>
          <TabsTrigger value="management">Lead Management</TabsTrigger>
          <TabsTrigger value="bulk-actions">Bulk AI Opt-In</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-4">
          {/* Filters and Search */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={aiStatusFilter} onValueChange={setAIStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="enabled">AI Enabled</SelectItem>
                <SelectItem value="disabled">AI Disabled</SelectItem>
                <SelectItem value="active">Active Sequences</SelectItem>
                <SelectItem value="paused">Paused Sequences</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={selectAllFiltered}>
              Select All ({filteredLeads.length})
            </Button>
            
            {selectedLeads.length > 0 && (
              <Button variant="outline" onClick={clearSelection}>
                Clear ({selectedLeads.length})
              </Button>
            )}
          </div>

          {/* Selection Actions */}
          {selectedLeads.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedLeads.length} leads selected</span>
                <div className="flex gap-2">
                  <EnhancedBulkAIOptIn
                    selectedLeads={selectedLeads}
                    onComplete={() => {
                      clearSelection();
                      fetchData();
                    }}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Management ({filteredLeads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Vehicle Interest</TableHead>
                    <TableHead>Name Quality</TableHead>
                    <TableHead>Vehicle Quality</TableHead>
                    <TableHead>AI Status</TableHead>
                    <TableHead>Data Quality</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const validation = validationStatuses.get(lead.id);
                    return (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedLeads.find(l => l.id === lead.id) !== undefined}
                            onChange={() => toggleLeadSelection(lead)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{lead.first_name} {lead.last_name}</div>
                            <div className="text-sm text-muted-foreground">{lead.email}</div>
                            {validation?.hasLearningData && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Previously Seen
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {lead.vehicle_interest || 'Not specified'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {!lead.ai_opt_in && validation ? (
                            <div className="flex items-center gap-2">
                              {getValidationIcon(validation.nameValidation, validation.nameConfidence)}
                              {getValidationBadge(validation.nameValidation, validation.nameConfidence)}
                              <span className="text-xs text-muted-foreground">
                                {Math.round(validation.nameConfidence * 100)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!lead.ai_opt_in && validation ? (
                            <div className="flex items-center gap-2">
                              {getValidationIcon(validation.vehicleValidation, validation.vehicleConfidence)}
                              {getValidationBadge(validation.vehicleValidation, validation.vehicleConfidence)}
                              <span className="text-xs text-muted-foreground">
                                {Math.round(validation.vehicleConfidence * 100)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.ai_opt_in ? (
                            <Badge className="bg-green-100 text-green-800">
                              {lead.ai_stage === 'scheduled' ? 'Active' : 'Enabled'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {getQualityBadge(getDataQualityScore(lead))}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{lead.ai_strategy_bucket || 'Not set'}</div>
                            <div className="text-muted-foreground">{lead.message_intensity}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.ai_opt_in ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAIToggle(lead.id, false)}
                            >
                              Disable AI
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handlePreviewOpen(lead.id)}
                            >
                              Enable AI with Preview
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Smart Bulk AI Opt-In</CardTitle>
              <p className="text-sm text-muted-foreground">
                Analyze and enable AI for multiple leads based on data quality assessment
              </p>
            </CardHeader>
            <CardContent>
              {selectedLeads.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="font-medium">{selectedLeads.length} leads selected for analysis</p>
                    <p className="text-sm text-muted-foreground">
                      Click the button below to analyze lead quality and get AI opt-in recommendations
                    </p>
                  </div>
                  <EnhancedBulkAIOptIn
                    selectedLeads={selectedLeads}
                    onComplete={() => {
                      clearSelection();
                      fetchData();
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No leads selected</p>
                  <p className="text-muted-foreground">
                    Go to the Lead Management tab and select leads to enable bulk AI opt-in
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Opt-In Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>AI Enabled</span>
                    <span className="font-medium">{aiStats.totalAIEnabled} leads</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(aiStats.totalAIEnabled / leads.length) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>AI Disabled</span>
                    <span className="font-medium">{leads.length - aiStats.totalAIEnabled} leads</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Quality Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['High', 'Medium', 'Poor'].map((quality) => {
                    const count = leads.filter(lead => {
                      const score = getDataQualityScore(lead);
                      return quality === 'High' ? score >= 75 : 
                             quality === 'Medium' ? score >= 50 && score < 75 : 
                             score < 50;
                    }).length;
                    
                    return (
                      <div key={quality} className="flex justify-between items-center">
                        <span>{quality} Quality</span>
                        <span className="font-medium">{count} leads</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced AI Preview Modal */}
      {previewLeadId && (
        <EnhancedAIPreview
          leadId={previewLeadId}
          leadName={
            (() => {
              const lead = leads.find(l => l.id === previewLeadId);
              return lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown Lead';
            })()
          }
          vehicleInterest={
            (() => {
              const lead = leads.find(l => l.id === previewLeadId);
              return lead?.vehicle_interest;
            })()
          }
          isOpen={!!previewLeadId}
          onClose={handlePreviewClose}
          onAIEnabled={handleAIEnabled}
          autoGenerate={true}
        />
      )}
    </div>
  );
};

export default AIOptInDashboardPage;