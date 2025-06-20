
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, Calendar as CalendarIcon, FileText, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { exportCurrentMessages, generateExecutiveSummaryExport, type ExportOptions } from '@/services/enhancedMessageExportService';
import { toast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

const EnhancedMessageExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    },
    includeLeads: true,
    includeConversations: true,
    includeAIMetrics: true,
    includeAnalytics: false
  });

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      await exportCurrentMessages(exportOptions);
      
      toast({
        title: "Export Completed",
        description: `Message data exported successfully as ${exportOptions.format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export message data",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExecutiveSummary = async () => {
    setIsExporting(true);
    
    try {
      await generateExecutiveSummaryExport();
      
      toast({
        title: "Executive Summary Generated",
        description: "Management report downloaded successfully",
      });
    } catch (error) {
      console.error('Executive summary failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate executive summary",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Executive Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Generate a comprehensive management report with key metrics, insights, and recommendations.
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Includes:</strong> Lead conversion metrics, AI performance data, response rates, 
              engagement analytics, and strategic recommendations for the last 30 days.
            </div>
          </div>

          <Button 
            onClick={handleExecutiveSummary}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <LoadingSpinner size="sm" text="Generating..." />
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Executive Summary
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Detailed Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Detailed Data Export</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Export comprehensive message data with customizable options for analysis and reporting.
          </div>

          {/* Export Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select 
              value={exportOptions.format} 
              onValueChange={(value: any) => setExportOptions(prev => ({ ...prev, format: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx) - Recommended</SelectItem>
                <SelectItem value="csv">CSV (.csv) - For analysis</SelectItem>
                <SelectItem value="json">JSON (.json) - For developers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(exportOptions.dateRange.from, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={exportOptions.dateRange.from}
                    onSelect={(date) => date && setExportOptions(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, from: date } 
                    }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(exportOptions.dateRange.to, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={exportOptions.dateRange.to}
                    onSelect={(date) => date && setExportOptions(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, to: date } 
                    }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Data Sections */}
          <div className="space-y-3">
            <Label>Include Data Sections</Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeLeads"
                  checked={exportOptions.includeLeads}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeLeads: !!checked }))
                  }
                />
                <Label htmlFor="includeLeads">Leads Data (contact info, preferences, AI settings)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeConversations"
                  checked={exportOptions.includeConversations}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeConversations: !!checked }))
                  }
                />
                <Label htmlFor="includeConversations">Conversations (all messages, timestamps, status)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAIMetrics"
                  checked={exportOptions.includeAIMetrics}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeAIMetrics: !!checked }))
                  }
                />
                <Label htmlFor="includeAIMetrics">AI Performance Metrics</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAnalytics"
                  checked={exportOptions.includeAnalytics}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeAnalytics: !!checked }))
                  }
                />
                <Label htmlFor="includeAnalytics">Analytics & Feedback Data</Label>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleExport}
            disabled={isExporting || (!exportOptions.includeLeads && !exportOptions.includeConversations && !exportOptions.includeAIMetrics && !exportOptions.includeAnalytics)}
            className="w-full"
          >
            {isExporting ? (
              <LoadingSpinner size="sm" text="Exporting..." />
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Data ({exportOptions.format.toUpperCase()})
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground">
            Export includes data from {format(exportOptions.dateRange.from, 'MMM dd')} to {format(exportOptions.dateRange.to, 'MMM dd, yyyy')}. 
            Large exports may take a few moments to process.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedMessageExport;
