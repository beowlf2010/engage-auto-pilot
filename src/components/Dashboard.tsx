
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
  };
}

const Dashboard = ({ user }: DashboardProps) => {
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

  // Mock data - in real app this would come from API
  const stats = {
    totalLeads: user.role === "sales" ? 45 : 187,
    activeConversations: user.role === "sales" ? 12 : 43,
    conversionRate: 23.5,
    monthlyRevenue: user.role === "sales" ? 87500 : 324000,
    aiResponseRate: 89,
    avgResponseTime: "2.4 min"
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-slate-600 mt-1">
            Here's what's happening with your leads today
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
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Leads
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats.totalLeads}</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Active Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats.activeConversations}</div>
            <p className="text-xs text-blue-600 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Avg response: {stats.avgResponseTime}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Conversion Rate
            </CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats.conversionRate}%</div>
            <Progress value={stats.conversionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              ${stats.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8.5% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Management Section for Managers/Admins */}
      {["manager", "admin"].includes(user.role) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Inventory Management</h2>
            <Link to="/inventory-dashboard">
              <Button variant="outline" className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>View Full Dashboard</span>
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {inventoryStats && (
              <>
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Total Inventory
                    </CardTitle>
                    <Package className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-800">{inventoryStats.totalVehicles}</div>
                    <Link to="/inventory-dashboard" className="text-xs text-blue-600 hover:underline">
                      View details →
                    </Link>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Available
                    </CardTitle>
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{inventoryStats.availableVehicles}</div>
                    <p className="text-xs text-slate-500">Ready for sale</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Sold This Month
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-800">{inventoryStats.soldVehicles}</div>
                    <Link to="/rpo-insights" className="text-xs text-blue-600 hover:underline">
                      View analytics →
                    </Link>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-800">Upload Inventory</h3>
                  <p className="text-sm text-slate-600">Import new vehicle data</p>
                </div>
                <Link to="/upload-inventory-report">
                  <Button size="sm" className="flex items-center space-x-2">
                    <Car className="w-4 h-4" />
                    <span>Upload</span>
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-800">RPO Insights</h3>
                  <p className="text-sm text-slate-600">Analyze options performance</p>
                </div>
                <Link to="/rpo-insights">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>AI Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Response Rate</span>
                <span className="font-medium">{stats.aiResponseRate}%</span>
              </div>
              <Progress value={stats.aiResponseRate} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Phone className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <div className="text-sm font-medium text-slate-800">127</div>
                <div className="text-xs text-slate-500">SMS Sent Today</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Mail className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <div className="text-sm font-medium text-slate-800">89</div>
                <div className="text-xs text-slate-500">Replies Received</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
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
