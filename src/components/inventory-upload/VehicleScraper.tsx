
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Globe, Car, Database, CheckCircle, AlertCircle, Target, Clock } from 'lucide-react';
import { FirecrawlService } from '@/utils/FirecrawlService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

interface VehicleScraperProps {
  onScrapingComplete?: (data: any) => void;
}

const VehicleScraper: React.FC<VehicleScraperProps> = ({ onScrapingComplete }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [isScraping, setIsScraping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapingResult, setScrapingResult] = useState<any>(null);
  const [processedResult, setProcessedResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  
  const dealershipUrl = 'https://www.jasonpilgerchevrolet.com/';

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const isValid = await FirecrawlService.testApiKey();
      if (isValid) {
        setConnectionStatus('connected');
        toast({
          title: "Connection successful",
          description: "Firecrawl API is properly configured and working"
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Connection failed",
          description: "Unable to connect to Firecrawl API. Please check your configuration.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionStatus('error');
      toast({
        title: "Connection failed",
        description: "Failed to test Firecrawl API connection",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleScrapeAndProcess = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to scrape inventory",
        variant: "destructive"
      });
      return;
    }

    setIsScraping(true);
    setProgress(0);
    setScrapingResult(null);
    setProcessedResult(null);
    setCurrentStep('Initializing optimized crawl...');

    try {
      // Step 1: Scrape the website with optimized settings
      console.log('🎯 Starting optimized website scraping for inventory pages...');
      setCurrentStep('Starting optimized crawl (targeting new/used inventory pages)...');
      
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 45));
      }, 2000);

      const scrapingResponse = await FirecrawlService.scrapeVehicleInventory(dealershipUrl);
      clearInterval(progressInterval);
      setProgress(50);

      if (!scrapingResponse.success) {
        throw new Error(scrapingResponse.error || 'Failed to scrape website');
      }

      setScrapingResult(scrapingResponse.data);
      setCurrentStep('Website scraping completed successfully!');
      console.log('✅ Optimized website scraping completed');

      // Step 2: Process the scraped data
      console.log('🔄 Processing scraped vehicle data...');
      setCurrentStep('Processing vehicle data and importing to database...');
      setIsProcessing(true);
      setProgress(60);

      const { data: processedData, error: processingError } = await supabase.functions.invoke('process-scraped-inventory', {
        body: {
          scrapedData: scrapingResponse.data,
          userId: user.id
        }
      });

      if (processingError) {
        throw processingError;
      }

      setProgress(100);
      setProcessedResult(processedData);
      setCurrentStep('Processing completed successfully!');
      
      console.log('✅ Vehicle data processing completed:', processedData);

      toast({
        title: "Success",
        description: `Successfully processed ${processedData.processedCount} vehicles from your optimized website crawl`
      });

      onScrapingComplete?.({
        ...scrapingResponse.data,
        processedVehicles: processedData.processedCount,
        skippedPages: processedData.skippedCount
      });

    } catch (error) {
      console.error('Error in scrape and process:', error);
      setCurrentStep('Error occurred during processing');
      toast({
        title: "Error",
        description: error.message || "Failed to scrape and process vehicle inventory",
        variant: "destructive"
      });
    } finally {
      setIsScraping(false);
      setIsProcessing(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Firecrawl API Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <Badge variant="default">Connected</Badge>
                </>
              )}
              {connectionStatus === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <Badge variant="destructive">Connection Failed</Badge>
                </>
              )}
              {connectionStatus === 'unknown' && (
                <>
                  <AlertCircle className="w-4 h-4 text-gray-600" />
                  <Badge variant="outline">Not Tested</Badge>
                </>
              )}
            </div>
            
            <Button 
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              variant="outline"
              size="sm"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <p>Firecrawl API is configured via Supabase Edge Function secrets.</p>
            <p>Contact your administrator if the connection test fails.</p>
          </div>
        </CardContent>
      </Card>

      {/* Optimized Website Scraping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Optimized Inventory Scraper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <Target className="w-4 h-4" />
              <span className="font-medium">Optimized Configuration</span>
            </div>
            <p className="text-green-700 text-sm mb-2">{dealershipUrl}</p>
            <div className="grid grid-cols-2 gap-4 text-xs text-green-600">
              <div>
                <span className="font-medium">Target Pages:</span> 25 max
              </div>
              <div>
                <span className="font-medium">Focus:</span> new-inventory, used-inventory
              </div>
            </div>
            <p className="text-green-600 text-xs mt-2">
              🎯 Optimized to specifically target your new and used vehicle inventory pages while excluding non-vehicle content to save credits
            </p>
          </div>

          {(isScraping || isProcessing) && (
            <div className="space-y-3">
              {currentStep && (
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Clock className="w-4 h-4" />
                  <span>{currentStep}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>
                  {isScraping && !isProcessing && 'Scraping inventory pages...'}
                  {isProcessing && 'Processing vehicle data...'}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <Button
            onClick={handleScrapeAndProcess}
            disabled={isScraping || isProcessing || connectionStatus === 'error'}
            className="w-full"
          >
            <Database className="w-4 h-4 mr-2" />
            {isScraping || isProcessing ? 'Processing...' : 'Start Optimized Inventory Scrape'}
          </Button>

          {connectionStatus === 'error' && (
            <div className="bg-red-50 p-3 rounded text-red-700 text-sm">
              Please test the connection first to ensure Firecrawl API is properly configured.
            </div>
          )}

          {scrapingResult && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Optimized Scraping Results
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-green-50 p-3 rounded">
                    <div className="font-medium text-green-800">Pages Scraped</div>
                    <div className="text-green-600">{scrapingResult.completed || 0}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="font-medium text-blue-800">Credits Used</div>
                    <div className="text-blue-600">{scrapingResult.creditsUsed || 0}</div>
                  </div>
                </div>
                <div className="bg-amber-50 p-3 rounded">
                  <div className="text-amber-800 text-sm">
                    💡 Credits saved by targeting only inventory pages instead of crawling entire website
                  </div>
                </div>
              </div>
            </>
          )}

          {processedResult && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Processing Results</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-green-50 p-3 rounded">
                    <div className="font-medium text-green-800">Vehicles Added</div>
                    <div className="text-green-600">{processedResult.processedCount || 0}</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <div className="font-medium text-orange-800">Pages Skipped</div>
                    <div className="text-orange-600">{processedResult.skippedCount || 0}</div>
                  </div>
                </div>
                
                <div className="bg-green-100 p-3 rounded">
                  <div className="text-green-800 text-sm">
                    ✅ Vehicle inventory has been successfully imported and is now available for AI responses!
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VehicleScraper;
