import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { HeatMapGrid } from 'react-grid-heatmap';
import { 
  Thermometer, TrendingUp, TrendingDown, Users, Search, 
  Filter, Calendar, Download, Target, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const AITemperaturePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [sortBy, setSortBy] = useState('temperature');

  // Fetch leads with calculated temperatures
  const { data: leadsWithTemp = [], isLoading } = useQuery({
    queryKey: ['leads-temperature'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          conversations(id, direction, sent_at, body),
          ai_lead_scores(score, engagement_level, conversion_probability)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate temperature for each lead
      const leadsWithTemperature = data.map(lead => {
        const conversations = lead.conversations || [];
        const latestInbound = conversations
          .filter(c => c.direction === 'in')
          .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];
        
        const daysSinceLastReply = latestInbound 
          ? Math.floor((Date.now() - new Date(latestInbound.sent_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        const messageCount = conversations.length;
        const responseRate = conversations.filter(c => c.direction === 'in').length / 
                            Math.max(conversations.filter(c => c.direction === 'out').length, 1);
        
        // Temperature calculation (0-100)
        let temperature = 50; // Base temperature
        
        // Adjust based on response timing
        if (daysSinceLastReply <= 1) temperature += 30;
        else if (daysSinceLastReply <= 3) temperature += 20;
        else if (daysSinceLastReply <= 7) temperature += 10;
        else if (daysSinceLastReply > 14) temperature -= 25;
        
        // Adjust based on engagement
        if (messageCount > 10) temperature += 15;
        else if (messageCount > 5) temperature += 10;
        
        // Adjust based on response rate
        if (responseRate > 0.7) temperature += 20;
        else if (responseRate > 0.4) temperature += 10;
        else if (responseRate < 0.2) temperature -= 15;
        
        // Include AI lead score if available
        const aiScore = lead.ai_lead_scores?.[0];
        if (aiScore) {
          temperature += (aiScore.score - 50) * 0.5;
        }
        
        // Keep within bounds
        temperature = Math.max(0, Math.min(100, Math.round(temperature)));
        
        return {
          ...lead,
          temperature,
          daysSinceLastReply,
          messageCount,
          responseRate,
          aiScore: aiScore?.score || 0,
          engagementLevel: aiScore?.engagement_level || 'unknown'
        };
      });

      return leadsWithTemperature;
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const getTemperatureColor = (temp: number) => {
    if (temp >= 80) return 'bg-red-500';
    if (temp >= 60) return 'bg-orange-500';
    if (temp >= 40) return 'bg-yellow-500';
    if (temp >= 20) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getTemperatureLabel = (temp: number) => {
    if (temp >= 80) return 'Hot';
    if (temp >= 60) return 'Warm';
    if (temp >= 40) return 'Cool';
    if (temp >= 20) return 'Cold';
    return 'Frozen';
  };

  const getTemperatureBadgeVariant = (temp: number) => {
    if (temp >= 80) return 'destructive';
    if (temp >= 60) return 'secondary';
    if (temp >= 40) return 'outline';
    return 'outline';
  };

  // Filter and sort leads
  const filteredLeads = leadsWithTemp
    .filter(lead => {
      const matchesSearch = searchTerm === '' || 
        `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.vehicle_interest?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = temperatureFilter === 'all' ||
        (temperatureFilter === 'hot' && lead.temperature >= 80) ||
        (temperatureFilter === 'warm' && lead.temperature >= 60 && lead.temperature < 80) ||
        (temperatureFilter === 'cool' && lead.temperature >= 40 && lead.temperature < 60) ||
        (temperatureFilter === 'cold' && lead.temperature < 40);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'temperature':
          return b.temperature - a.temperature;
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name':
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        default:
          return 0;
      }
    });

  // Temperature distribution
  const temperatureDistribution = {
    hot: leadsWithTemp.filter(l => l.temperature >= 80).length,
    warm: leadsWithTemp.filter(l => l.temperature >= 60 && l.temperature < 80).length,
    cool: leadsWithTemp.filter(l => l.temperature >= 40 && l.temperature < 60).length,
    cold: leadsWithTemp.filter(l => l.temperature < 40).length,
  };

  // Heatmap data for temperature by day of week and hour
  const heatmapData = leadsWithTemp.reduce((acc, lead) => {
    const lastReply = lead.conversations?.filter(c => c.direction === 'in')?.[0];
    if (lastReply) {
      const date = new Date(lastReply.sent_at);
      const hour = date.getHours();
      const day = date.getDay();
      
      if (!acc[day]) acc[day] = {};
      if (!acc[day][hour]) acc[day][hour] = [];
      acc[day][hour].push(lead.temperature);
    }
    return acc;
  }, {} as Record<number, Record<number, number[]>>);

  const avgTemperature = leadsWithTemp.length > 0 
    ? Math.round(leadsWithTemp.reduce((sum, lead) => sum + lead.temperature, 0) / leadsWithTemp.length)
    : 0;

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
          <h1 className="text-3xl font-bold tracking-tight">Lead Temperature</h1>
          <p className="text-muted-foreground">
            AI-powered lead scoring with visual temperature indicators
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Temperature Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Temperature</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTemperature}°</div>
            <p className="text-xs text-muted-foreground">
              {getTemperatureLabel(avgTemperature)} overall
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{temperatureDistribution.hot}</div>
            <p className="text-xs text-muted-foreground">80°+ temperature</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warm Leads</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{temperatureDistribution.warm}</div>
            <p className="text-xs text-muted-foreground">60-79° temperature</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cool Leads</CardTitle>
            <Users className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{temperatureDistribution.cool}</div>
            <p className="text-xs text-muted-foreground">40-59° temperature</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cold Leads</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{temperatureDistribution.cold}</div>
            <p className="text-xs text-muted-foreground">Below 40° temperature</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Temperature Analysis</CardTitle>
          <CardDescription>
            Real-time temperature scoring based on engagement and AI insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Temperatures</SelectItem>
                <SelectItem value="hot">Hot (80°+)</SelectItem>
                <SelectItem value="warm">Warm (60-79°)</SelectItem>
                <SelectItem value="cool">Cool (40-59°)</SelectItem>
                <SelectItem value="cold">Cold (0-39°)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temperature">Temperature</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-8">
                <Thermometer className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No leads found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No leads match your current filters
                </p>
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <div key={lead.id} className="p-4 border rounded-lg hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg",
                          getTemperatureColor(lead.temperature)
                        )}>
                          {lead.temperature}°
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                          <Badge variant={getTemperatureBadgeVariant(lead.temperature)} className="text-xs">
                            {getTemperatureLabel(lead.temperature)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-semibold">
                          {lead.first_name} {lead.last_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {lead.vehicle_interest}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Messages: {lead.messageCount}</span>
                          <span>•</span>
                          <span>Response Rate: {(lead.responseRate * 100).toFixed(1)}%</span>
                          {lead.aiScore > 0 && (
                            <>
                              <span>•</span>
                              <span>AI Score: {lead.aiScore}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2">
                        {lead.daysSinceLastReply < 7 && (
                          <Badge variant="secondary">Active</Badge>
                        )}
                        {lead.temperature >= 80 && (
                          <Badge variant="destructive">Priority</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last reply: {lead.daysSinceLastReply === 999 ? 'Never' : 
                        `${lead.daysSinceLastReply} days ago`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  {lead.temperature >= 80 && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">
                        High priority lead - consider immediate follow-up
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AITemperaturePage;
