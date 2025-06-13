
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface KPI {
  date: string;
  leads_created: number;
  messages_sent: number;
  replies_in: number;
  cars_sold: number;
  gross_profit: number;
}

interface SalespersonStats {
  salesperson_id: string;
  salesperson_name: string;
  leads: number;
}

const SalesDashboard = () => {
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [nextAIDue, setNextAIDue] = useState(0);
  const { profile } = useAuth();

  const fetchKPIs = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching KPIs:', error);
      return;
    }

    setKpis(data);
  };

  const fetchNextAIDue = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .eq('salesperson_id', profile.id)
      .lt('next_ai_send_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching next AI due:', error);
      return;
    }

    setNextAIDue(data?.length || 0);
  };

  useEffect(() => {
    if (profile) {
      fetchKPIs();
      fetchNextAIDue();
    }
  }, [profile]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>My Leads Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{kpis?.leads_created || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Replies Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{kpis?.replies_in || 0}</div>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Next AI Due</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-600">{nextAIDue}</div>
          <p className="text-sm text-slate-600 mt-1">leads with overdue AI messages</p>
        </CardContent>
      </Card>
    </div>
  );
};

const ManagerDashboard = () => {
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [teamStats, setTeamStats] = useState<SalespersonStats[]>([]);

  const fetchKPIs = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching KPIs:', error);
      return;
    }

    setKpis(data);
  };

  const fetchTeamStats = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        salesperson_id,
        profiles (
          first_name,
          last_name
        )
      `)
      .not('salesperson_id', 'is', null);

    if (error) {
      console.error('Error fetching team stats:', error);
      return;
    }

    // Group by salesperson
    const grouped = data?.reduce((acc: any, lead) => {
      const id = lead.salesperson_id;
      const profile = lead.profiles as any;
      const name = profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown';
      
      if (!acc[id]) {
        acc[id] = {
          salesperson_id: id,
          salesperson_name: name,
          leads: 0
        };
      }
      acc[id].leads++;
      return acc;
    }, {});

    setTeamStats(Object.values(grouped || {}));
  };

  useEffect(() => {
    fetchKPIs();
    fetchTeamStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Team Leads Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.leads_created || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Msgs Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.messages_sent || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Replies In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.replies_in || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="salesperson_name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="leads" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export { SalesDashboard, ManagerDashboard };
