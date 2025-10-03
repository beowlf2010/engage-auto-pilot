import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, Search, Filter, MessageCircle, Phone, 
  Mail, Calendar, TrendingUp, AlertTriangle,
  Thermometer, Zap, Target, Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AIOptInButton from '@/components/leads/management/AIOptInButton';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  vehicle_interest: string;
  source: string;
  status: string;
  lead_temperature: number;
  ai_opt_in: boolean;
  last_reply_at: string | null;
  message_intensity: string;
  ai_strategy_bucket: string;
  created_at: string;
}

const LeadsManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['leads', searchTerm, selectedFilter],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`
          id, first_name, last_name, email, phone, vehicle_interest,
          source, status, lead_temperature, ai_opt_in, last_reply_at,
          message_intensity, ai_strategy_bucket, created_at
        `)
        .order('created_at', { ascending: false });

      // Apply search filter
      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,vehicle_interest.ilike.%${searchTerm}%`);
      }

      // Apply status filter
      if (selectedFilter !== 'all') {
        if (selectedFilter === 'hot') {
          query = query.gte('lead_temperature', 70);
        } else if (selectedFilter === 'warm') {
          query = query.gte('lead_temperature', 40).lt('lead_temperature', 70);
        } else if (selectedFilter === 'cold') {
          query = query.lt('lead_temperature', 40);
        } else if (selectedFilter === 'ai_enabled') {
          query = query.eq('ai_opt_in', true);
        } else if (selectedFilter === 'needs_attention') {
          query = query.lt('lead_temperature', 50).is('last_reply_at', null);
        }
      }

      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return data as Lead[];
    },
    staleTime: 30000, // 30 seconds
  });

  const getTemperatureColor = (temp: number) => {
    if (temp >= 80) return 'gradient'; // Hot leads get gradient badge
    if (temp >= 60) return 'warning'; // Warm leads
    if (temp >= 40) return 'secondary'; // Medium leads
    return 'outline'; // Cold leads
  };

  const getTemperatureIcon = (temp: number) => {
    if (temp >= 80) return <TrendingUp className="h-3 w-3" />;
    if (temp >= 60) return <Target className="h-3 w-3" />;
    if (temp >= 40) return <Clock className="h-3 w-3" />;
    return <AlertTriangle className="h-3 w-3" />;
  };

  const handleContactLead = useCallback((leadId: string, method: string) => {
    toast({
      title: "Contact Action",
      description: `${method} contact initiated for lead ${leadId}`,
    });
  }, [toast]);

  const handleAIOptInChange = useCallback(() => {
    // Invalidate and refetch the leads query to get updated data
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    toast({
      title: "AI Enabled",
      description: "AI messaging has been enabled for this lead",
    });
  }, [queryClient, toast]);

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Error loading leads: {error.message}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/5 via-background to-transparent -z-10 pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Lead Management
          </h1>
          <p className="text-muted-foreground">Manage and track your automotive sales leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="glass" className="shadow-[var(--shadow-elegant)]">
            <Users className="h-3 w-3 mr-1" />
            {leads.length} Total Leads
          </Badge>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search leads by name, email, or vehicle interest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card/60 backdrop-blur-xl border-border/30 focus:shadow-[var(--shadow-glow)] transition-shadow"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedFilter === 'all' ? 'gradient' : 'glass'}
            size="sm"
            onClick={() => setSelectedFilter('all')}
          >
            All
          </Button>
          <Button
            variant={selectedFilter === 'hot' ? 'gradient' : 'glass'}
            size="sm"
            onClick={() => setSelectedFilter('hot')}
          >
            🔥 Hot
          </Button>
          <Button
            variant={selectedFilter === 'warm' ? 'gradient' : 'glass'}
            size="sm"
            onClick={() => setSelectedFilter('warm')}
          >
            ⚡ Warm
          </Button>
          <Button
            variant={selectedFilter === 'ai_enabled' ? 'gradient' : 'glass'}
            size="sm"
            onClick={() => setSelectedFilter('ai_enabled')}
          >
            <Zap className="h-3 w-3 mr-1" />
            AI Enabled
          </Button>
        </div>
      </div>

      {/* Leads Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No leads found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start by importing leads or creating new ones'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead, index) => (
            <Card 
              key={lead.id} 
              variant="floating"
              className="hover:shadow-[var(--shadow-floating)] transition-all duration-300 hover:-translate-y-1 group animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {lead.first_name} {lead.last_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={getTemperatureColor(lead.lead_temperature)} className="text-xs">
                      {getTemperatureIcon(lead.lead_temperature)}
                      {lead.lead_temperature}°
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Vehicle Interest</p>
                  <p className="text-sm text-muted-foreground">{lead.vehicle_interest}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Source: {lead.source}</span>
                  <span>Status: {lead.status}</span>
                </div>

                <div className="flex items-center gap-2">
                  {lead.ai_opt_in && (
                    <Badge variant="gradient" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      AI Enabled
                    </Badge>
                  )}
                  <Badge variant="glass" className="text-xs">
                    {lead.message_intensity}
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => handleContactLead(lead.id, 'Call')}
                    className="flex-1 hover:scale-105 transition-transform"
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => handleContactLead(lead.id, 'Message')}
                    className="flex-1 hover:scale-105 transition-transform"
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Message
                  </Button>
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => handleContactLead(lead.id, 'Email')}
                    className="flex-1 hover:scale-105 transition-transform"
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                </div>

                {/* AI Opt-In Section */}
                <div className="pt-2">
                  <AIOptInButton
                    lead={lead}
                    onAIOptInChange={handleAIOptInChange}
                  />
                </div>

                {lead.last_reply_at && (
                  <p className="text-xs text-muted-foreground">
                    Last reply: {new Date(lead.last_reply_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeadsManagement;