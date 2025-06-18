
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, Calendar as CalendarIcon, FileText, BarChart3, TrendingUp, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ReportConfig {
  type: 'performance' | 'quality' | 'compliance' | 'conversion' | 'training';
  format: 'pdf' | 'excel' | 'csv';
  dateRange: { from: Date; to: Date };
  filters: string[];
}

const ReportsExportPanel = () => {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    type: 'performance',
    format: 'excel',
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    },
    filters: []
  });
  const [generating, setGenerating] = useState(false);
  const [scheduledReports, setScheduledReports] = useState([
    {
      id: '1',
      name: 'Weekly Performance Summary',
      type: 'performance',
      schedule: 'weekly',
      lastGenerated: new Date(),
      nextGeneration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      name: 'Monthly Quality Review',
      type: 'quality',
      schedule: 'monthly',
      lastGenerated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      nextGeneration: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000)
    }
  ]);

  const generateReport = async () => {
    setGenerating(true);
    
    try {
      // Fetch data based on report type and date range
      const data = await fetchReportData();
      
      // Generate report based on format
      switch (reportConfig.format) {
        case 'csv':
          downloadCSV(data);
          break;
        case 'excel':
          await generateExcelReport(data);
          break;
        case 'pdf':
          await generatePDFReport(data);
          break;
      }
      
      toast({
        title: "Report Generated",
        description: `${reportConfig.type} report downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const fetchReportData = async () => {
    const { from, to } = reportConfig.dateRange;
    
    switch (reportConfig.type) {
      case 'performance':
        return await fetchPerformanceData(from, to);
      case 'quality':
        return await fetchQualityData(from, to);
      case 'compliance':
        return await fetchComplianceData(from, to);
      case 'conversion':
        return await fetchConversionData(from, to);
      case 'training':
        return await fetchTrainingData(from, to);
      default:
        return [];
    }
  };

  const fetchPerformanceData = async (from: Date, to: Date) => {
    const { data, error } = await supabase
      .from('ai_message_analytics')
      .select('*')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString());
    
    if (error) throw error;
    return data || [];
  };

  const fetchQualityData = async (from: Date, to: Date) => {
    const { data, error } = await supabase
      .from('conversation_quality_scores')
      .select('*')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString());
    
    if (error) throw error;
    return data || [];
  };

  const fetchComplianceData = async (from: Date, to: Date) => {
    const { data, error } = await supabase
      .from('compliance_violations')
      .select('*')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString());
    
    if (error) throw error;
    return data || [];
  };

  const fetchConversionData = async (from: Date, to: Date) => {
    const { data, error } = await supabase
      .from('lead_conversion_predictions')
      .select('*')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString());
    
    if (error) throw error;
    return data || [];
  };

  const fetchTrainingData = async (from: Date, to: Date) => {
    const { data, error } = await supabase
      .from('training_recommendations')
      .select('*')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString());
    
    if (error) throw error;
    return data || [];
  };

  const downloadCSV = (data: any[]) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportConfig.type}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateExcelReport = async (data: any[]) => {
    // Mock Excel generation - in real implementation, use a library like xlsx
    const csvContent = data.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportConfig.type}_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generatePDFReport = async (data: any[]) => {
    // Mock PDF generation - in real implementation, use a library like jsPDF
    toast({
      title: "PDF Generation",
      description: "PDF reports will be available soon",
    });
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return <BarChart3 className="w-4 h-4" />;
      case 'quality': return <TrendingUp className="w-4 h-4" />;
      case 'compliance': return <FileText className="w-4 h-4" />;
      case 'conversion': return <TrendingUp className="w-4 h-4" />;
      case 'training': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Reports & Export</h2>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select 
                value={reportConfig.type} 
                onValueChange={(value: any) => setReportConfig(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performance Analytics</SelectItem>
                  <SelectItem value="quality">Quality Metrics</SelectItem>
                  <SelectItem value="compliance">Compliance Report</SelectItem>
                  <SelectItem value="conversion">Conversion Analysis</SelectItem>
                  <SelectItem value="training">Training Recommendations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Format</label>
              <Select 
                value={reportConfig.format} 
                onValueChange={(value: any) => setReportConfig(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Date From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(reportConfig.dateRange.from, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={reportConfig.dateRange.from}
                    onSelect={(date) => date && setReportConfig(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, from: date } 
                    }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium">Date To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(reportConfig.dateRange.to, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={reportConfig.dateRange.to}
                    onSelect={(date) => date && setReportConfig(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, to: date } 
                    }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button 
            onClick={generateReport} 
            disabled={generating}
            className="w-full md:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduledReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getReportTypeIcon(report.type)}
                  <div>
                    <h4 className="font-medium">{report.name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>Schedule: {report.schedule}</span>
                      <Badge variant="outline">{report.type}</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="text-right text-sm">
                  <div className="text-muted-foreground">
                    Last: {format(report.lastGenerated, 'MMM dd')}
                  </div>
                  <div className="text-muted-foreground">
                    Next: {format(report.nextGeneration, 'MMM dd')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Exports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" onClick={() => {
              setReportConfig({ ...reportConfig, type: 'performance', format: 'excel' });
              generateReport();
            }}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Performance (Excel)
            </Button>
            
            <Button variant="outline" onClick={() => {
              setReportConfig({ ...reportConfig, type: 'quality', format: 'csv' });
              generateReport();
            }}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Quality (CSV)
            </Button>
            
            <Button variant="outline" onClick={() => {
              setReportConfig({ ...reportConfig, type: 'compliance', format: 'pdf' });
              generateReport();
            }}>
              <FileText className="w-4 h-4 mr-2" />
              Compliance (PDF)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsExportPanel;
