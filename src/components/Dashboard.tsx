
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
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DashboardProps {
  user: {
    role: string;
    firstName: string;
    id: string;
  };
}

const Dashboard = ({ user }: DashboardProps) => {
  // Fetch real dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats', user.id, user.role],
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
          conversationsQuery = conversationsQuery.eq('lead_id', '00000000-0000-0000-0000-000000000000'); // No results
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
          unreadQuery = unreadQuery.eq('lead_id', '00000000-0000-0000-0000-000000000000'); // No results
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
        conversionRate: 23.5, // Keep mock for now - would need sales data to calculate
        monthlyRevenue: user.role === "sales" ? 87500 : 324000, // Keep mock for now
        avgResponseTime: "2.4 min" // Keep mock for now
      };
    },
    enabled: !!user.id
  });

  // Fetch inventory stats for managers/admins
  const { data: inventoryStats } = useQuery({
    queryKey: ['dashboard-inventory-stats'],
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
        .eq('status', 'sold');

      return {
        totalVehicles: totalVehicles || 0,
        availableVehicles: availableVehicles || 0,
        soldVehicles: soldVehicles || 0
      };
    },
    enabled: ["manager", "admin"].includes(user.role)
  });

  // Use real stats or fallback to 0
  const stats = dashboardStats || {
    totalLeads: 0,
    activeConversations: 0,
    unreadMessages: 0,
    aiOptInCount: 0,
    aiResponseRate: 0,
    conversionRate: 0,
    monthlyRevenue: 0,
    avgResponseTime: "0 min"
  };

  const recentActivity = [
    {
      id: 1,
      type: "message",
      description: "Sarah Johnson replied about financing options",
      time: "2 min ago",
      urgent: true
    },
    {
      id: 2,
      type: "lead",
      description: "New lead: Mike Chen interested in Model Y",
      time: "15 min ago",
      urgent: false
    },
    {
      id: 3,
      type: "ai",
      description: "AI follow-up sent to 12 leads",
      time: "1 hour ago",
      urgent: false
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-1">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-slate-600 text-lg">
            Here&#39;s what&#39;s happening with your leads today
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
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
              <Clock className="w-3 h-3 mr-1" />
              Avg response: {stats.avgResponseTime}
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
              <TrendingUp className="w-3 h-3 mr-1" />
              +8.5% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Management Section for Managers/Admins */}
      {["manager", "admin"].includes(user.role) && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Inventory Management</h2>
            <Link to="/inventory-dashboard">
              <Button variant="outline" className="flex items-center space-x-2 font-semibold px-4 py-2 rounded-lg shadow-sm">
                <Eye className="w-4 h-4" />
                <span>View Full Dashboard</span>
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {inventoryStats && (
              <>
                <Card className="hover:shadow-xl shadow border-2 border-slate-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-semibold text-slate-700">
                      Total Inventory
                    </CardTitle>
                    <Package className="h-5 w-5 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{inventoryStats.totalVehicles}</div>
                    <Link to="/inventory-dashboard" className="text-xs text-blue-600 hover:underline font-medium">
                      View details →
                    </Link>
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
                    <Link to="/rpo-insights" className="text-xs text-blue-600 hover:underline font-medium">
                      View analytics →
                    </Link>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 hover:shadow-lg border-2 border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">Upload Inventory</h3>
                  <p className="text-sm text-slate-600">Import new vehicle data</p>
                </div>
                <Link to="/upload-inventory-report">
                  <Button size="sm" className="flex items-center space-x-2 font-semibold rounded-lg shadow-sm">
                    <Car className="w-4 h-4" />
                    <span>Upload</span>
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-lg border-2 border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">RPO Insights</h3>
                  <p className="text-sm text-slate-600">Analyze options performance</p>
                </div>
                <Link to="/rpo-insights">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 font-semibold rounded-lg shadow-sm">
                    <BarChart3 className="w-4 h-4" />
                    <span>View</span>
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* AI Performance & Recent Activity */}
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
                <Mail className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <div className="text-base font-semibold text-slate-900">{stats.activeConversations}</div>
                <div className="text-xs text-slate-600">Active Chats</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="hover:shadow-lg border-2 border-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.urgent ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">{activity.description}</p>
                    <p className="text-xs text-slate-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
