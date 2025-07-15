import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OptimizedLoading } from '@/components/ui/OptimizedLoading';
import EnhancedBulkAIOptIn from '@/components/leads/EnhancedBulkAIOptIn';
import EnhancedAIPreview from '@/components/leads/EnhancedAIPreview';
import HideLeadButton from '@/components/leads/HideLeadButton';
import ShowHiddenLeadsToggle from '@/components/leads/ShowHiddenLeadsToggle';
import { toast } from '@/hooks/use-toast';
import { getBatchValidationStatuses, type OptimizedValidationStatus, getCachedValidationStatus } from '@/services/optimizedValidationService';
import { EmergencyControlCard } from '@/components/emergency/EmergencyControlCard';

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
  is_hidden?: boolean;
}

interface AIStats {
  totalLeads: number;
  aiEnabled: number;
  responseRate: number;
}

// Smart cache for validation results with TTL
class ValidationCache {
  private cache = new Map<string, { result: OptimizedValidationStatus; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set(leadId: string, result: OptimizedValidationStatus) {
    this.cache.set(leadId, { result, timestamp: Date.now() });
  }

  get(leadId: string): OptimizedValidationStatus | null {
    const cached = this.cache.get(leadId);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.result;
    }
    this.cache.delete(leadId);
    return null;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

const AIOptInDashboardPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [validationLoading, setValidationLoading] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiStatusFilter, setAIStatusFilter] = useState('all');
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [validationStatuses, setValidationStatuses] = useState<Map<string, OptimizedValidationStatus>>(new Map());
  
  // Smart cache and refs for optimization
  const validationCache = useRef(new ValidationCache());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Optimized data fetching with progressive loading
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🚀 [AI OPT-IN DASHBOARD] Starting progressive data fetch...');

      // Cancel any ongoing validation requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, vehicle_interest, ai_opt_in, ai_stage, last_reply_at, status, created_at, ai_strategy_bucket, message_intensity, is_hidden')
        .neq('status', 'lost')
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      const enrichedLeads = leadsData?.map(lead => ({
        ...lead,
        is_hidden: lead.is_hidden || false
      })) || [];

      setLeads(enrichedLeads);
      console.log(`✅ [AI OPT-IN DASHBOARD] Loaded ${enrichedLeads.length} leads`);
      
      // Load validation data progressively in background
      loadValidationDataAsync(enrichedLeads);

    } catch (error) {
      console.error('❌ [AI OPT-IN DASHBOARD] Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Progressive validation loading with smart caching
  const loadValidationDataAsync = useCallback(async (leadsToValidate: Lead[]) => {
    try {
      setValidationLoading(true);
      console.log('🔍 [AI OPT-IN DASHBOARD] Starting background validation...');

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // First, check cache for existing validations
      const cachedResults = new Map<string, OptimizedValidationStatus>();
      const leadsNeedingValidation: Lead[] = [];

      leadsToValidate.forEach(lead => {
        const cached = validationCache.current.get(lead.id);
        if (cached) {
          cachedResults.set(lead.id, cached);
        } else {
          leadsNeedingValidation.push(lead);
        }
      });

      console.log(`📊 [VALIDATION CACHE] Using ${cachedResults.size} cached results, validating ${leadsNeedingValidation.length} new leads`);

      // Update UI with cached results immediately
      if (cachedResults.size > 0) {
        setValidationStatuses(prev => new Map([...prev, ...cachedResults]));
      }

      // Batch validate remaining leads if any
      if (leadsNeedingValidation.length > 0) {
        const validationStatusMap = await getBatchValidationStatuses(leadsNeedingValidation);
        
        // Store in cache
        validationStatusMap.forEach((status, leadId) => {
          validationCache.current.set(leadId, status);
        });

        // Update state with new results
        setValidationStatuses(prev => new Map([...prev, ...validationStatusMap]));
        console.log(`✅ [AI OPT-IN DASHBOARD] Completed validation for ${validationStatusMap.size} leads`);
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ [AI OPT-IN DASHBOARD] Error in background validation:', error);
      }
    } finally {
      setValidationLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      validationCache.current.clear();
    };
  }, []);

  // Optimized filtering with memoized search terms
  const normalizedSearchTerm = useMemo(() => 
    searchTerm.toLowerCase().trim(), 
    [searchTerm]
  );

  const filteredLeads = useMemo(() => {
    if (leads.length === 0) return [];
    
    return leads.filter(lead => {
      // Optimized search matching
      if (normalizedSearchTerm) {
        const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();
        const email = lead.email?.toLowerCase() || '';
        const vehicle = lead.vehicle_interest?.toLowerCase() || '';
        
        if (!fullName.includes(normalizedSearchTerm) && 
            !email.includes(normalizedSearchTerm) && 
            !vehicle.includes(normalizedSearchTerm)) {
          return false;
        }
      }

      // AI filter matching
      if (aiStatusFilter !== 'all') {
        switch (aiStatusFilter) {
          case 'enabled':
            if (!lead.ai_opt_in) return false;
            break;
          case 'disabled':
            if (lead.ai_opt_in) return false;
            break;
          case 'active':
            if (!lead.ai_opt_in || lead.ai_stage !== 'scheduled') return false;
            break;
          case 'paused':
            if (!lead.ai_opt_in || lead.ai_stage !== 'paused') return false;
            break;
        }
      }

      // Hidden filter
      if (!showHidden && lead.is_hidden) return false;

      return true;
    });
  }, [leads, normalizedSearchTerm, aiStatusFilter, showHidden]);

  // Memoized callbacks to prevent unnecessary re-renders
  const toggleLeadSelection = useCallback((lead: Lead) => {
    setSelectedLeads(prev => 
      prev.find(l => l.id === lead.id)
        ? prev.filter(l => l.id !== lead.id)
        : [...prev, lead]
    );
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedLeads(filteredLeads);
  }, [filteredLeads]);

  const clearSelection = useCallback(() => {
    setSelectedLeads([]);
  }, []);

  const handleAIToggle = useCallback(async (leadId: string, enable: boolean) => {
    try {
      // Optimistic update
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, ai_opt_in: enable, ai_stage: enable ? 'scheduled' : null }
          : lead
      ));

      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: enable,
          ai_stage: enable ? 'scheduled' : null
        })
        .eq('id', leadId);

      if (error) throw error;

      // Clear cache for this lead since AI status changed
      if (validationCache.current.get(leadId)) {
        validationCache.current.clear();
      }

      toast({
        title: "Success",
        description: `AI ${enable ? 'enabled' : 'disabled'} for lead`,
      });
    } catch (error) {
      // Revert optimistic update on error
      await fetchData();
      toast({
        title: "Error", 
        description: "Failed to update AI status",
        variant: "destructive"
      });
    }
  }, [fetchData]);

  const handlePreviewOpen = useCallback((leadId: string) => {
    setPreviewLeadId(leadId);
  }, []);

  const handlePreviewClose = useCallback(() => {
    setPreviewLeadId(null);
  }, []);

  const handleAIEnabled = useCallback(() => {
    fetchData(); // Refresh data after AI is enabled
  }, [fetchData]);

  const handleToggleHidden = useCallback(async (leadId: string, hidden: boolean) => {
    // Update local state optimistically
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, is_hidden: hidden } : lead
    ));
    
    // No need to refresh all data, just this lead's state is already updated
  }, []);

  // Memoized computations
  const hiddenCount = useMemo(() => 
    leads.filter(lead => lead.is_hidden).length, 
    [leads]
  );

  const aiStats = useMemo(() => {
    const totalLeads = leads.length;
    const aiEnabled = leads.filter(lead => lead.ai_opt_in).length;
    const activeSequences = leads.filter(lead => 
      lead.ai_opt_in && lead.ai_stage === 'scheduled'
    ).length;
    
    return {
      totalLeads,
      aiEnabled,
      responseRate: aiEnabled > 0 ? Math.round((activeSequences / aiEnabled) * 100) : 0
    };
  }, [leads]);

  // Memoized utility functions with smart validation fetching
  const getValidationStatus = useCallback((leadId: string) => {
    // First check current state
    const status = validationStatuses.get(leadId);
    if (status) return status;
    
    // Then check cache
    const cached = getCachedValidationStatus(leadId, validationStatuses);
    if (cached) return cached;
    
    // Return null if not available - UI will show loading state
    return null;
  }, [validationStatuses]);

  const getValidationIcon = useCallback((isValid: boolean, confidence: number) => {
    const threshold = 0.6;
    if (isValid && confidence >= threshold) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    return <XCircle className="w-4 h-4 text-amber-600" />;
  }, []);

  const getValidationBadge = useCallback((isValid: boolean, confidence: number) => {
    const threshold = 0.6;
    if (isValid && confidence >= threshold) {
      return <Badge className="bg-green-100 text-green-800">Pass</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-800">Review</Badge>;
  }, []);

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
        <div className="flex items-center gap-2">
          {validationLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading validations...
            </div>
          )}
          <Button onClick={fetchData} variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Emergency Control and Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <EmergencyControlCard />
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              Active leads in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI-Enabled Leads</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats.aiEnabled}</div>
            <p className="text-xs text-muted-foreground">
              {aiStats.totalLeads > 0 ? Math.round((aiStats.aiEnabled / aiStats.totalLeads) * 100) : 0}% of total leads
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

          {/* Show Hidden Leads Toggle */}
          <ShowHiddenLeadsToggle 
            showHidden={showHidden}
            onToggle={setShowHidden}
            hiddenCount={hiddenCount}
          />

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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const validation = getValidationStatus(lead.id);
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
                          ) : !lead.ai_opt_in && validationLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-xs text-muted-foreground">Loading...</span>
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
                          ) : !lead.ai_opt_in && validationLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-xs text-muted-foreground">Loading...</span>
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
                          <div className="flex items-center gap-2">
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
                            <HideLeadButton
                              leadId={lead.id}
                              isHidden={!!lead.is_hidden}
                              onToggleHidden={handleToggleHidden}
                            />
                          </div>
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