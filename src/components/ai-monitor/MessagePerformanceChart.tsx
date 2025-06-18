
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceData {
  date: string;
  messagesSent: number;
  responsesReceived: number;
  responseRate: number;
}

const MessagePerformanceChart = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14); // Last 14 days

      const { data: analyticsData, error } = await supabase
        .from('ai_message_analytics')
        .select('sent_at, responded_at')
        .gte('sent_at', startDate.toISOString())
        .lte('sent_at', endDate.toISOString())
        .order('sent_at');

      if (error) throw error;

      // Group by date
      const dataByDate = new Map<string, { sent: number; responded: number }>();
      
      // Initialize all dates in range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dataByDate.set(dateKey, { sent: 0, responded: 0 });
      }

      // Count messages and responses
      analyticsData?.forEach(item => {
        const dateKey = item.sent_at.split('T')[0];
        const dayData = dataByDate.get(dateKey);
        if (dayData) {
          dayData.sent++;
          if (item.responded_at) {
            dayData.responded++;
          }
        }
      });

      // Convert to chart data
      const chartData: PerformanceData[] = Array.from(dataByDate.entries()).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        messagesSent: data.sent,
        responsesReceived: data.responded,
        responseRate: data.sent > 0 ? Math.round((data.responded / data.sent) * 100) : 0
      }));

      setPerformanceData(chartData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading performance data...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Response Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Response Rate Trend (Last 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'responseRate' ? `${value}%` : value,
                  name === 'responseRate' ? 'Response Rate' : name
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="responseRate" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Message Volume */}
      <Card>
        <CardHeader>
          <CardTitle>Message Volume & Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="messagesSent" fill="#8884d8" name="Messages Sent" />
              <Bar dataKey="responsesReceived" fill="#82ca9d" name="Responses Received" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData.reduce((sum, day) => sum + day.messagesSent, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Last 14 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData.reduce((sum, day) => sum + day.responsesReceived, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Last 14 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData.length > 0 
                ? Math.round(performanceData.reduce((sum, day) => sum + day.responseRate, 0) / performanceData.length)
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">Last 14 days</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MessagePerformanceChart;
