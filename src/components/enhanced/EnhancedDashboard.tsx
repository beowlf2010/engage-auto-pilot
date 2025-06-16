import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AnimatedStatCard from '@/components/ui/animated-stat-card';
import GlassCard from '@/components/ui/glass-card';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  DollarSign,
  Car,
  Clock,
  Target,
  BarChart3
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface EnhancedDashboardProps {
  user: any;
}

const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({ user }) => {
  const navigate = useNavigate();

  // Sample data for charts
  const performanceData = [
    { name: 'Jan', leads: 120, sales: 45 },
    { name: 'Feb', leads: 140, sales: 52 },
    { name: 'Mar', leads: 160, sales: 61 },
    { name: 'Apr', leads: 180, sales: 68 },
    { name: 'May', leads: 200, sales: 75 },
    { name: 'Jun', leads: 220, sales: 82 }
  ];

  const leadStatusData = [
    { name: 'New', value: 45, color: '#3B82F6' },
    { name: 'Contacted', value: 30, color: '#F59E0B' },
    { name: 'Qualified', value: 20, color: '#10B981' },
    { name: 'Negotiating', value: 15, color: '#8B5CF6' }
  ];

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
      {/* Header Section */}
      <div className="relative">
        <GlassCard opacity="medium" className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome back, {user.firstName}! 👋
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                Here's what's happening with your dealership today
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                <BarChart3 className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedStatCard
          title="Total Leads"
          value="1,247"
          icon={Users}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          trend={{ value: 12.5, isPositive: true }}
        />
        <AnimatedStatCard
          title="Active Conversations"
          value="89"
          icon={MessageSquare}
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
          trend={{ value: 8.2, isPositive: true }}
        />
        <AnimatedStatCard
          title="Sales This Month"
          value="$127,500"
          icon={DollarSign}
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          trend={{ value: 15.3, isPositive: true }}
        />
        <AnimatedStatCard
          title="Inventory Count"
          value="342"
          icon={Car}
          gradient="bg-gradient-to-br from-orange-500 to-red-500"
          trend={{ value: 3.1, isPositive: false }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Chart */}
        <GlassCard opacity="medium" className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <TrendingUp className="h-6 w-6 mr-2 text-blue-600" />
            Performance Overview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: 'none', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="leads" 
                stroke="#3B82F6" 
                fillOpacity={1} 
                fill="url(#leadsGradient)"
                strokeWidth={3}
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="#10B981" 
                fillOpacity={1} 
                fill="url(#salesGradient)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Lead Status Distribution */}
        <GlassCard opacity="medium" className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <Target className="h-6 w-6 mr-2 text-purple-600" />
            Lead Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {leadStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: 'none', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <GlassCard opacity="medium" className="p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <Clock className="h-6 w-6 mr-2 text-green-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-blue-200"
            onClick={() => navigate('/leads')}
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold text-gray-800">View All Leads</h4>
              <p className="text-sm text-gray-600 mt-2">Manage your lead pipeline</p>
            </CardContent>
          </Card>

          <Card 
            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-green-200"
            onClick={() => navigate('/smart-inbox')}
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold text-gray-800">Smart Inbox</h4>
              <p className="text-sm text-gray-600 mt-2">AI-powered conversations</p>
            </CardContent>
          </Card>

          <Card 
            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-purple-200"
            onClick={() => navigate('/inventory')}
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Car className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold text-gray-800">Inventory</h4>
              <p className="text-sm text-gray-600 mt-2">Manage vehicle inventory</p>
            </CardContent>
          </Card>
        </div>
      </GlassCard>
    </div>
  );
};

export default EnhancedDashboard;
