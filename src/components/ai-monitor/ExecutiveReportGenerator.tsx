
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ExecutiveMetrics {
  totalMessages: number;
  responseRate: number;
  activeLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  qualityScore: number;
  pendingMessages: number;
  recentImprovements: string[];
}

const ExecutiveReportGenerator = () => {
  const [generating, setGenerating] = useState(false);
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);

  const generateExecutiveMetrics = async (): Promise<ExecutiveMetrics> => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get AI message analytics
    const { data: analytics } = await supabase
      .from('ai_message_analytics')
      .select('*')
      .gte('sent_at', thirtyDaysAgo.toISOString());

    // Get lead data
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('ai_opt_in', true);

    // Get quality scores
    const { data: qualityScores } = await supabase
      .from('conversation_quality_scores')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get feedback data
    const { data: feedback } = await supabase
      .from('ai_message_feedback')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Calculate metrics
    const totalMessages = analytics?.length || 0;
    const responsesReceived = analytics?.filter(a => a.responded_at).length || 0;
    const responseRate = totalMessages > 0 ? (responsesReceived / totalMessages) * 100 : 0;
    
    const activeLeads = leads?.filter(l => l.ai_opt_in && !l.ai_sequence_paused).length || 0;
    const pendingMessages = leads?.filter(l => l.next_ai_send_at && new Date(l.next_ai_send_at) <= new Date()).length || 0;

    const conversions = feedback?.filter(f => f.conversion_outcome === 'appointment_booked' || f.conversion_outcome === 'test_drive_scheduled').length || 0;
    const conversionRate = totalMessages > 0 ? (conversions / totalMessages) * 100 : 0;

    const avgResponseTime = analytics?.reduce((sum, a) => sum + (a.response_time_hours || 0), 0) / (responsesReceived || 1);
    
    const qualityScore = qualityScores?.reduce((sum, q) => sum + q.overall_score, 0) / (qualityScores?.length || 1);

    const recentImprovements = [
      `${responseRate.toFixed(1)}% response rate achieved`,
      `${activeLeads} leads actively engaged`,
      `${conversions} successful conversions this month`
    ];

    return {
      totalMessages,
      responseRate,
      activeLeads,
      conversionRate,
      avgResponseTime,
      qualityScore,
      pendingMessages,
      recentImprovements
    };
  };

  const generateExecutiveReport = async (format: 'pdf' | 'excel') => {
    setGenerating(true);

    try {
      const executiveMetrics = await generateExecutiveMetrics();
      setMetrics(executiveMetrics);

      // Generate report content
      const reportData = {
        title: 'AI Performance Executive Summary',
        generatedAt: new Date().toLocaleDateString(),
        period: 'Last 30 Days',
        metrics: executiveMetrics,
        keyInsights: [
          `AI system is actively managing ${executiveMetrics.activeLeads} leads`,
          `Response rate of ${executiveMetrics.responseRate.toFixed(1)}% exceeds industry average`,
          `${executiveMetrics.conversionRate.toFixed(1)}% of AI conversations result in appointments`,
          `Average response time: ${executiveMetrics.avgResponseTime.toFixed(1)} hours`
        ],
        recommendations: [
          'Continue current AI engagement strategy',
          'Monitor and optimize response timing',
          'Expand AI coverage to additional lead sources',
          'Review quality scores monthly for continuous improvement'
        ]
      };

      if (format === 'excel') {
        await generateExcelReport(reportData);
      } else {
        await generatePDFReport(reportData);
      }

      toast({
        title: "Executive Report Generated",
        description: `AI Performance report downloaded as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error generating executive report:', error);
      toast({
        title: "Error",
        description: "Failed to generate executive report",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateExcelReport = async (data: any) => {
    // Create CSV content for Excel compatibility
    const csvContent = [
      ['AI Performance Executive Summary'],
      ['Generated:', data.generatedAt],
      ['Period:', data.period],
      [''],
      ['KEY METRICS'],
      ['Total Messages Sent', data.metrics.totalMessages],
      ['Response Rate', `${data.metrics.responseRate.toFixed(1)}%`],
      ['Active Leads', data.metrics.activeLeads],
      ['Conversion Rate', `${data.metrics.conversionRate.toFixed(1)}%`],
      ['Avg Response Time (hours)', data.metrics.avgResponseTime.toFixed(1)],
      ['Quality Score', data.metrics.qualityScore.toFixed(1)],
      ['Pending Messages', data.metrics.pendingMessages],
      [''],
      ['KEY INSIGHTS'],
      ...data.keyInsights.map((insight: string) => [insight]),
      [''],
      ['RECOMMENDATIONS'],
      ...data.recommendations.map((rec: string) => [rec])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Performance_Executive_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generatePDFReport = async (data: any) => {
    // For now, generate as formatted text - in production would use jsPDF
    const pdfContent = `
AI PERFORMANCE EXECUTIVE SUMMARY
Generated: ${data.generatedAt}
Period: ${data.period}

KEY METRICS
• Total Messages Sent: ${data.metrics.totalMessages}
• Response Rate: ${data.metrics.responseRate.toFixed(1)}%
• Active Leads: ${data.metrics.activeLeads}
• Conversion Rate: ${data.metrics.conversionRate.toFixed(1)}%
• Average Response Time: ${data.metrics.avgResponseTime.toFixed(1)} hours
• Quality Score: ${data.metrics.qualityScore.toFixed(1)}/100
• Pending Messages: ${data.metrics.pendingMessages}

KEY INSIGHTS
${data.keyInsights.map((insight: string) => `• ${insight}`).join('\n')}

RECOMMENDATIONS
${data.recommendations.map((rec: string) => `• ${rec}`).join('\n')}
    `;

    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Performance_Executive_Report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card data-testid="executive-report">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Executive AI Performance Report</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Generate a comprehensive AI performance report for management review. 
          Includes key metrics, insights, and strategic recommendations.
        </div>

        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalMessages}</div>
              <div className="text-xs text-muted-foreground">Messages Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.responseRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Response Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.activeLeads}</div>
              <div className="text-xs text-muted-foreground">Active Leads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.conversionRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Conversion Rate</div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={() => generateExecutiveReport('excel')} 
            disabled={generating}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            {generating ? 'Generating...' : 'Download Excel Report'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => generateExecutiveReport('pdf')} 
            disabled={generating}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            {generating ? 'Generating...' : 'Download PDF Report'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Report includes last 30 days of AI performance data, quality metrics, and strategic recommendations.
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutiveReportGenerator;
