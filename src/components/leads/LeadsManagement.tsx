import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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
    if (temp >= 80) return 'text-red-600 bg-red-50 border-red-200';
    if (temp >= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (temp >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lead Management</h1>
          <p className="text-muted-foreground">Manage and track your automotive sales leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-primary">
            <Users className="h-3 w-3 mr-1" />
            {leads.length} Total Leads
          </Badge>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search leads by name, email, or vehicle interest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('all')}
          >
            All
          </Button>
          <Button
            variant={selectedFilter === 'hot' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('hot')}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            🔥 Hot
          </Button>
          <Button
            variant={selectedFilter === 'warm' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('warm')}
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            ⚡ Warm
          </Button>
          <Button
            variant={selectedFilter === 'ai_enabled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('ai_enabled')}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
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
          {leads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {lead.first_name} {lead.last_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={`text-xs ${getTemperatureColor(lead.lead_temperature)}`}>
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
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      AI Enabled
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {lead.message_intensity}
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleContactLead(lead.id, 'Call')}
                    className="flex-1"
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleContactLead(lead.id, 'Message')}
                    className="flex-1"
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Message
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleContactLead(lead.id, 'Email')}
                    className="flex-1"
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
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