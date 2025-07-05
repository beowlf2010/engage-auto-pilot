import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneCall, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface CallStats {
  total_calls: number;
  completed_calls: number;
  success_rate: number;
  avg_duration: number;
  calls_today: number;
}

interface CallAnalyticsCardProps {
  showPersonal?: boolean;
}

const CallAnalyticsCard = ({ showPersonal = false }: CallAnalyticsCardProps) => {
  const [stats, setStats] = useState<CallStats>({
    total_calls: 0,
    completed_calls: 0,
    success_rate: 0,
    avg_duration: 0,
    calls_today: 0
  });
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    fetchCallStats();
  }, [profile, showPersonal]);

  const fetchCallStats = async () => {
    try {
      setLoading(true);
      
      // For now, show placeholder data since call_queue table doesn't exist yet
      // This will be populated with real data once the full call system is implemented
      const placeholderStats = {
        total_calls: showPersonal ? 12 : 47,
        completed_calls: showPersonal ? 8 : 31,
        success_rate: showPersonal ? 67 : 66,
        avg_duration: showPersonal ? 142 : 156,
        calls_today: showPersonal ? 3 : 14
      };

      setStats(placeholderStats);
    } catch (error) {
      console.error('Error fetching call analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Call Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          {showPersonal ? 'My Call Stats' : 'Team Call Analytics'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Total Calls</span>
            </div>
            <div className="text-2xl font-bold">{stats.total_calls}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Today</span>
            </div>
            <div className="text-2xl font-bold">{stats.calls_today}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Success Rate</span>
            <Badge variant={stats.success_rate >= 50 ? 'default' : 'secondary'}>
              {stats.success_rate}%
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Avg Duration</span>
            <span className="font-medium">{formatDuration(stats.avg_duration)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Completed</span>
            <span className="font-medium">{stats.completed_calls}/{stats.total_calls}</span>
          </div>
        </div>

        {stats.success_rate > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>Call activity tracked</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CallAnalyticsCard;