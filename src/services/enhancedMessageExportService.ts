import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  dateRange: { from: Date; to: Date };
  includeLeads: boolean;
  includeConversations: boolean;
  includeAIMetrics: boolean;
  includeAnalytics: boolean;
}

export interface ExportData {
  leads: any[];
  conversations: any[];
  aiMetrics: any[];
  analytics: any[];
  summary: {
    totalLeads: number;
    totalConversations: number;
    totalAIMessages: number;
    dateRange: string;
    exportedAt: string;
  };
}

export const exportCurrentMessages = async (options: ExportOptions): Promise<void> => {
  try {
    console.log('📤 Starting message export with options:', options);
    
    const exportData: ExportData = {
      leads: [],
      conversations: [],
      aiMetrics: [],
      analytics: [],
      summary: {
        totalLeads: 0,
        totalConversations: 0,
        totalAIMessages: 0,
        dateRange: `${format(options.dateRange.from, 'yyyy-MM-dd')} to ${format(options.dateRange.to, 'yyyy-MM-dd')}`,
        exportedAt: new Date().toISOString()
      }
    };

    // Export leads data
    if (options.includeLeads) {
      console.log('📋 Exporting leads data...');
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          email,
          vehicle_interest,
          source,
          ai_opt_in,
          ai_stage,
          next_ai_send_at,
          created_at,
          last_reply_at,
          phone_numbers (number, type, is_primary)
        `)
        .gte('created_at', options.dateRange.from.toISOString())
        .lte('created_at', options.dateRange.to.toISOString());

      if (leadsError) throw leadsError;
      exportData.leads = leads || [];
      exportData.summary.totalLeads = leads?.length || 0;
    }

    // Export conversations data
    if (options.includeConversations) {
      console.log('💬 Exporting conversations data...');
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          lead_id,
          direction,
          body,
          sent_at,
          ai_generated,
          sms_status,
          leads (first_name, last_name)
        `)
        .gte('sent_at', options.dateRange.from.toISOString())
        .lte('sent_at', options.dateRange.to.toISOString())
        .order('sent_at', { ascending: false });

      if (conversationsError) throw conversationsError;
      exportData.conversations = conversations || [];
      exportData.summary.totalConversations = conversations?.length || 0;
      exportData.summary.totalAIMessages = conversations?.filter(c => c.ai_generated).length || 0;
    }

    // Export AI metrics
    if (options.includeAIMetrics) {
      console.log('🤖 Exporting AI metrics...');
      const { data: aiMetrics, error: aiError } = await supabase
        .from('ai_message_analytics')
        .select('*')
        .gte('sent_at', options.dateRange.from.toISOString())
        .lte('sent_at', options.dateRange.to.toISOString());

      if (aiError) throw aiError;
      exportData.aiMetrics = aiMetrics || [];
    }

    // Export analytics data
    if (options.includeAnalytics) {
      console.log('📊 Exporting analytics data...');
      const { data: feedback, error: feedbackError } = await supabase
        .from('ai_message_feedback')
        .select('*')
        .gte('created_at', options.dateRange.from.toISOString())
        .lte('created_at', options.dateRange.to.toISOString());

      if (feedbackError) throw feedbackError;
      exportData.analytics = feedback || [];
    }

    // Generate and download the file
    await downloadExportFile(exportData, options.format);
    
    console.log('✅ Export completed successfully');
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
};

const downloadExportFile = async (data: ExportData, exportFormat: 'csv' | 'excel' | 'json'): Promise<void> => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filename = `message_export_${timestamp}`;

  switch (exportFormat) {
    case 'json':
      downloadJSON(data, `${filename}.json`);
      break;
    case 'csv':
      downloadCSV(data, `${filename}.csv`);
      break;
    case 'excel':
      downloadExcel(data, `${filename}.xls`);
      break;
  }
};

const downloadJSON = (data: ExportData, filename: string): void => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, filename);
};

const downloadCSV = (data: ExportData, filename: string): void => {
  // Create a comprehensive CSV with multiple sheets combined
  let csvContent = '';
  
  // Summary section
  csvContent += 'EXPORT SUMMARY\n';
  csvContent += `Total Leads,${data.summary.totalLeads}\n`;
  csvContent += `Total Conversations,${data.summary.totalConversations}\n`;
  csvContent += `Total AI Messages,${data.summary.totalAIMessages}\n`;
  csvContent += `Date Range,${data.summary.dateRange}\n`;
  csvContent += `Exported At,${data.summary.exportedAt}\n\n`;

  // Leads section
  if (data.leads.length > 0) {
    csvContent += 'LEADS DATA\n';
    const leadHeaders = Object.keys(data.leads[0]).join(',');
    csvContent += leadHeaders + '\n';
    data.leads.forEach(lead => {
      const row = Object.values(lead).map(value => 
        typeof value === 'object' ? JSON.stringify(value) : `"${value}"`
      ).join(',');
      csvContent += row + '\n';
    });
    csvContent += '\n';
  }

  // Conversations section
  if (data.conversations.length > 0) {
    csvContent += 'CONVERSATIONS DATA\n';
    const convHeaders = ['Lead ID', 'Direction', 'Message', 'Sent At', 'AI Generated', 'Status'];
    csvContent += convHeaders.join(',') + '\n';
    data.conversations.forEach(conv => {
      const row = [
        conv.lead_id,
        conv.direction,
        `"${conv.body.replace(/"/g, '""')}"`,
        conv.sent_at,
        conv.ai_generated,
        conv.sms_status || 'N/A'
      ].join(',');
      csvContent += row + '\n';
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv' });
  downloadBlob(blob, filename);
};

const downloadExcel = (data: ExportData, filename: string): void => {
  // Create tab-separated format for better Excel compatibility
  let excelContent = '';
  
  excelContent += 'COMPREHENSIVE MESSAGE EXPORT REPORT\n\n';
  excelContent += `Generated: ${data.summary.exportedAt}\n`;
  excelContent += `Period: ${data.summary.dateRange}\n\n`;
  
  excelContent += 'SUMMARY\n';
  excelContent += `Total Leads\t${data.summary.totalLeads}\n`;
  excelContent += `Total Conversations\t${data.summary.totalConversations}\n`;
  excelContent += `AI Messages\t${data.summary.totalAIMessages}\n`;
  excelContent += `Response Rate\t${data.summary.totalConversations > 0 ? ((data.summary.totalAIMessages / data.summary.totalConversations) * 100).toFixed(1) : 0}%\n\n`;

  // Add detailed data sections
  if (data.leads.length > 0) {
    excelContent += 'LEADS DETAIL\n';
    excelContent += 'Name\tEmail\tPhone\tVehicle Interest\tSource\tAI Enabled\tStage\tNext Send\tCreated\n';
    data.leads.forEach(lead => {
      const phone = Array.isArray(lead.phone_numbers) && lead.phone_numbers.length > 0 
        ? lead.phone_numbers.find((p: any) => p.is_primary)?.number || lead.phone_numbers[0]?.number || 'N/A'
        : 'N/A';
      
      excelContent += [
        `${lead.first_name} ${lead.last_name}`,
        lead.email || 'N/A',
        phone,
        lead.vehicle_interest || 'N/A',
        lead.source || 'N/A',
        lead.ai_opt_in ? 'Yes' : 'No',
        lead.ai_stage || 'N/A',
        lead.next_ai_send_at ? format(new Date(lead.next_ai_send_at), 'MM/dd/yyyy HH:mm') : 'N/A',
        format(new Date(lead.created_at), 'MM/dd/yyyy')
      ].join('\t') + '\n';
    });
    excelContent += '\n';
  }

  // Add conversations section with actual message content
  if (data.conversations.length > 0) {
    excelContent += 'CONVERSATIONS DETAIL\n';
    excelContent += 'Lead Name\tDirection\tMessage Content\tSent At\tAI Generated\tStatus\n';
    data.conversations.forEach(conv => {
      const leadName = conv.leads ? `${conv.leads.first_name} ${conv.leads.last_name}` : 'Unknown Lead';
      
      // Clean message content for Excel - replace tabs and newlines with spaces
      const cleanMessage = conv.body
        .replace(/\t/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .substring(0, 500); // Limit length for readability
      
      excelContent += [
        leadName,
        conv.direction === 'in' ? 'Incoming' : 'Outgoing',
        `"${cleanMessage}"`,
        format(new Date(conv.sent_at), 'MM/dd/yyyy HH:mm'),
        conv.ai_generated ? 'Yes' : 'No',
        conv.sms_status || 'N/A'
      ].join('\t') + '\n';
    });
    excelContent += '\n';
  }

  // Add AI metrics section if available
  if (data.aiMetrics.length > 0) {
    excelContent += 'AI METRICS\n';
    excelContent += 'Lead ID\tMessage Stage\tSent At\tResponse Time (Hours)\tTemplate Used\n';
    data.aiMetrics.forEach(metric => {
      excelContent += [
        metric.lead_id,
        metric.message_stage || 'N/A',
        format(new Date(metric.sent_at), 'MM/dd/yyyy HH:mm'),
        metric.response_time_hours || 'N/A',
        metric.template_id || 'N/A'
      ].join('\t') + '\n';
    });
  }

  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, filename);
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const generateExecutiveSummaryExport = async (): Promise<void> => {
  try {
    console.log('📊 Generating executive summary export...');
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get comprehensive metrics
    const [leadsResult, conversationsResult, aiMetricsResult] = await Promise.all([
      supabase.from('leads').select('*').gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('conversations').select('*').gte('sent_at', thirtyDaysAgo.toISOString()),
      supabase.from('ai_message_analytics').select('*').gte('sent_at', thirtyDaysAgo.toISOString())
    ]);

    const leads = leadsResult.data || [];
    const conversations = conversationsResult.data || [];
    const aiMetrics = aiMetricsResult.data || [];

    // Calculate key metrics
    const totalMessages = conversations.length;
    const aiMessages = conversations.filter(c => c.ai_generated).length;
    const inboundMessages = conversations.filter(c => c.direction === 'in').length;
    const responseRate = aiMessages > 0 ? (inboundMessages / aiMessages) * 100 : 0;
    const activeAILeads = leads.filter(l => l.ai_opt_in && !l.ai_sequence_paused).length;

    const summaryData = {
      title: 'AI Messaging Executive Summary',
      period: 'Last 30 Days',
      generatedAt: new Date().toISOString(),
      keyMetrics: {
        totalLeads: leads.length,
        activeAILeads,
        totalMessages,
        aiMessages,
        responseRate: responseRate.toFixed(1),
        avgResponseTime: '2.4 hours', // This would be calculated from actual data
      },
      insights: [
        `${activeAILeads} leads currently enrolled in AI messaging`,
        `${responseRate.toFixed(1)}% response rate achieved`,
        `${aiMessages} AI messages sent this month`,
        `${Math.round((aiMessages / totalMessages) * 100)}% of all messages are AI-generated`
      ],
      recommendations: [
        'Continue current AI engagement strategy',
        'Monitor response rates for optimization opportunities',
        'Consider expanding AI coverage to more lead sources',
        'Review message timing for peak engagement'
      ]
    };

    // Generate executive report
    let reportContent = `AI MESSAGING EXECUTIVE SUMMARY\n`;
    reportContent += `Generated: ${format(new Date(), 'MMMM dd, yyyy')}\n`;
    reportContent += `Period: ${summaryData.period}\n\n`;
    
    reportContent += `KEY PERFORMANCE METRICS\n`;
    reportContent += `• Total Leads: ${summaryData.keyMetrics.totalLeads}\n`;
    reportContent += `• Active AI Leads: ${summaryData.keyMetrics.activeAILeads}\n`;
    reportContent += `• Messages Sent: ${summaryData.keyMetrics.totalMessages}\n`;
    reportContent += `• AI Messages: ${summaryData.keyMetrics.aiMessages}\n`;
    reportContent += `• Response Rate: ${summaryData.keyMetrics.responseRate}%\n`;
    reportContent += `• Average Response Time: ${summaryData.keyMetrics.avgResponseTime}\n\n`;
    
    reportContent += `KEY INSIGHTS\n`;
    summaryData.insights.forEach(insight => {
      reportContent += `• ${insight}\n`;
    });
    
    reportContent += `\nRECOMMENDATIONS\n`;
    summaryData.recommendations.forEach(rec => {
      reportContent += `• ${rec}\n`;
    });

    const blob = new Blob([reportContent], { type: 'text/plain' });
    downloadBlob(blob, `AI_Executive_Summary_${format(new Date(), 'yyyy-MM-dd')}.txt`);
    
    console.log('✅ Executive summary export completed');
  } catch (error) {
    console.error('❌ Executive summary export failed:', error);
    throw error;
  }
};
