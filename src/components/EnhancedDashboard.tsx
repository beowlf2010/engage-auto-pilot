
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  DollarSign,
  Clock,
  Target,
  Phone,
  Mail,
  Car,
  Package,
  BarChart3,
  Eye,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface EnhancedDashboardProps {
  user: {
    role: string;
    firstName: string;
    id: string;
  };
}

const EnhancedDashboard = ({ user }: EnhancedDashboardProps) => {
  // Auto-refresh every 30 seconds
  const { data: dashboardStats, refetch } = useQuery({
    queryKey: ['enhanced-dashboard-stats', user.id, user.role],
    queryFn: async () => {
      // Get leads count based on user role
      let leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true });
      
      if (user.role === 'sales') {
        leadsQuery = leadsQuery.eq('salesperson_id', user.id);
      }
      
      const { count: totalLeads } = await leadsQuery;

      // Get conversations count
      let conversationsQuery = supabase
        .from('conversations')
        .select('lead_id, direction', { count: 'exact' })
        .eq('direction', 'in');

      if (user.role === 'sales') {
        const { data: userLeads } = await supabase
          .from('leads')
          .select('id')
          .eq('salesperson_id', user.id);
        
        const leadIds = userLeads?.map(lead => lead.id) || [];
        if (leadIds.length > 0) {
          conversationsQuery = conversationsQuery.in('lead_id', leadIds);
        } else {
          conversationsQuery = conversationsQuery.eq('lead_id', '00000000-0000-0000-0000-000000000000');
        }
      }

      const { count: activeConversations } = await conversationsQuery;

      // Get unread messages count
      let unreadQuery = supabase
        .from('conversations')
        .select('lead_id', { count: 'exact', head: true })
        .eq('direction', 'in')
        .is('read_at', null);

      if (user.role === 'sales') {
        const { data: userLeads } = await supabase
          .from('leads')
          .select('id')
          .eq('salesperson_id', user.id);
        
        const leadIds = userLeads?.map(lead => lead.id) || [];
        if (leadIds.length > 0) {
          unreadQuery = unreadQuery.in('lead_id', leadIds);
        } else {
          unreadQuery = unreadQuery.eq('lead_id', '00000000-0000-0000-0000-000000000000');
        }
      }

      const { count: unreadMessages } = await unreadQuery;

      // Get AI opt-in count
      let aiOptInQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ai_opt_in', true);

      if (user.role === 'sales') {
        aiOptInQuery = aiOptInQuery.eq('salesperson_id', user.id);
      }

      const { count: aiOptInCount } = await aiOptInQuery;

      // Get real financial data from deals table
      let dealsQuery = supabase
        .from('deals')
        .select('total_profit, sale_amount, upload_date')
        .gte('upload_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const { data: monthlyDeals } = await dealsQuery;
      
      const monthlyRevenue = monthlyDeals?.reduce((sum, deal) => sum + (deal.sale_amount || 0), 0) || 0;
      const monthlyProfit = monthlyDeals?.reduce((sum, deal) => sum + (deal.total_profit || 0), 0) || 0;

      // Calculate AI response rate
      const aiResponseRate = totalLeads && totalLeads > 0 
        ? Math.round((aiOptInCount || 0) / totalLeads * 100) 
        : 0;

      return {
        totalLeads: totalLeads || 0,
        activeConversations: activeConversations || 0,
        unreadMessages: unreadMessages || 0,
        aiOptInCount: aiOptInCount || 0,
        aiResponseRate,
        monthlyRevenue: Math.round(monthlyRevenue),
        monthlyProfit: Math.round(monthlyProfit),
        dealCount: monthlyDeals?.length || 0
      };
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    enabled: !!user.id
  });

  // Get real recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['dashboard-recent-activity', user.id, user.role],
    queryFn: async () => {
      const activities = [];
      
      // Get recent messages
      let messagesQuery = supabase
        .from('conversations')
        .select(`
          id, body, direction, sent_at, ai_generated,
          leads!inner(first_name, last_name)
        `)
        .eq('direction', 'in')
        .order('sent_at', { ascending: false })
        .limit(3);

      if (user.role === 'sales') {
        messagesQuery = messagesQuery.eq('leads.salesperson_id', user.id);
      }

      const { data: recentMessages } = await messagesQuery;
      
      recentMessages?.forEach(msg => {
        activities.push({
          id: `msg-${msg.id}`,
          type: 'message',
          description: `${msg.leads.first_name} ${msg.leads.last_name} replied: "${msg.body.substring(0, 50)}${msg.body.length > 50 ? '...' : ''}"`,
          time: getTimeAgo(msg.sent_at),
          urgent: !msg.ai_generated
        });
      });

      // Get recent leads
      let leadsQuery = supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (user.role === 'sales') {
        leadsQuery = leadsQuery.eq('salesperson_id', user.id);
      }

      const { data: recentLeads } = await leadsQuery;
      
      recentLeads?.forEach(lead => {
        activities.push({
          id: `lead-${lead.id}`,
          type: 'lead',
          description: `New lead: ${lead.first_name} ${lead.last_name} interested in ${lead.vehicle_interest}`,
          time: getTimeAgo(lead.created_at),
          urgent: false
        });
      });

      // Sort by time and return top 5
      return activities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5);
    },
    refetchInterval: 60000, // Refresh every minute
    enabled: !!user.id
  });

  // Inventory stats for managers/admins
  const { data: inventoryStats } = useQuery({
    queryKey: ['enhanced-dashboard-inventory-stats'],
    queryFn: async () => {
      if (!["manager", "admin"].includes(user.role)) return null;

      const { count: totalVehicles } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true });

      const { count: availableVehicles } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

      const { count: soldVehicles } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sold')
        .gte('sold_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Get average inventory price
      const { data: avgPriceData } = await supabase
        .from('inventory')
        .select('price')
        .eq('status', 'available')
        .not('price', 'is', null);

      const avgPrice = avgPriceData?.length 
        ? Math.round(avgPriceData.reduce((sum, item) => sum + (item.price || 0), 0) / avgPriceData.length)
        : 0;

      return {
        totalVehicles: totalVehicles || 0,
        availableVehicles: availableVehicles || 0,
        soldVehicles: soldVehicles || 0,
        avgPrice
      };
    },
    refetchInterval: 60000,
    enabled: ["manager", "admin"].includes(user.role)
  });

  // Helper function to format time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Use real stats or fallback to 0
  const stats = dashboardStats || {
    totalLeads: 0,
    activeConversations: 0,
    unreadMessages: 0,
    aiOptInCount: 0,
    aiResponseRate: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    dealCount: 0
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-1">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-slate-600 text-lg">
            Here's what's happening with your leads today
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
          <div className="text-sm text-slate-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-2xl shadow-lg border-2 border-slate-100 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">
              Total Leads
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalLeads}</div>
            <p className="text-xs text-blue-600 flex items-center mt-1">
              <MessageSquare className="w-3 h-3 mr-1" />
              {stats.unreadMessages} unread messages
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-2xl shadow-lg border-2 border-slate-100 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">
              Active Conversations
            </CardTitle>
            <MessageSquare className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.activeConversations}</div>
            <p className="text-xs text-blue-600 flex items-center mt-1">
              <Target className="w-3 h-3 mr-1" />
              {stats.aiOptInCount} AI enabled
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-2xl shadow-lg border-2 border-slate-100 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">
              AI Opt-in Rate
            </CardTitle>
            <Target className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.aiResponseRate}%</div>
            <Progress value={stats.aiResponseRate} className="mt-2" />
            <p className="text-xs text-slate-500 mt-1">{stats.aiOptInCount} leads opted in</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-2xl shadow-lg border-2 border-slate-100 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              ${stats.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <Car className="w-3 h-3 mr-1" />
              {stats.dealCount} deals this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Management Section for Managers/Admins */}
      {["manager", "admin"].includes(user.role) && inventoryStats && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Inventory Overview</h2>
            <Link to="/inventory-dashboard">
              <Button variant="outline" className="flex items-center space-x-2 font-semibold px-4 py-2 rounded-lg shadow-sm">
                <Eye className="w-4 h-4" />
                <span>View Full Dashboard</span>
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="hover:shadow-xl shadow border-2 border-slate-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold text-slate-700">
                  Total Inventory
                </CardTitle>
                <Package className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{inventoryStats.totalVehicles}</div>
                <p className="text-xs text-slate-500">Total vehicles</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl shadow border-2 border-slate-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold text-slate-700">
                  Available
                </CardTitle>
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{inventoryStats.availableVehicles}</div>
                <p className="text-xs text-slate-500">Ready for sale</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl shadow border-2 border-slate-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold text-slate-700">
                  Sold This Month
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{inventoryStats.soldVehicles}</div>
                <p className="text-xs text-slate-500">Monthly sales</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl shadow border-2 border-slate-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold text-slate-700">
                  Avg Price
                </CardTitle>
                <DollarSign className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  ${inventoryStats.avgPrice.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500">Average inventory</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Real Activity Feed and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Performance */}
        <Card className="hover:shadow-lg border-2 border-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg font-bold text-slate-900">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>AI Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-700 font-medium">Opt-in Rate</span>
                <span className="font-semibold text-slate-900">{stats.aiResponseRate}%</span>
              </div>
              <Progress value={stats.aiResponseRate} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg shadow">
                <Phone className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <div className="text-base font-semibold text-slate-900">{stats.aiOptInCount}</div>
                <div className="text-xs text-slate-600">AI Enabled</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg shadow">
                <MessageSquare className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <div className="text-base font-semibold text-slate-900">{stats.activeConversations}</div>
                <div className="text-xs text-slate-600">Active Chats</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real Recent Activity */}
        <Card className="hover:shadow-lg border-2 border-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.urgent ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{activity.description}</p>
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
