
import React from 'react';
import GlassCard from '@/components/ui/glass-card';
import { TrendingUp, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ChartsSection: React.FC = () => {
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
  );
};

export default ChartsSection;
