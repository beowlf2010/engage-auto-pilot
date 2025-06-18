
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Globe, Car, Database, CheckCircle, AlertCircle } from 'lucide-react';
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

    try {
      // Step 1: Scrape the website
      console.log('🌐 Starting website scraping...');
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
      console.log('✅ Website scraping completed');

      // Step 2: Process the scraped data
      console.log('🔄 Processing scraped vehicle data...');
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
      
      console.log('✅ Vehicle data processing completed:', processedData);

      toast({
        title: "Success",
        description: `Successfully processed ${processedData.processedCount} vehicles from your website`
      });

      onScrapingComplete?.({
        ...scrapingResponse.data,
        processedVehicles: processedData.processedCount,
        skippedPages: processedData.skippedCount
      });

    } catch (error) {
      console.error('Error in scrape and process:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to scrape and process vehicle inventory",
        variant: "destructive"
      });
    } finally {
      setIsScraping(false);
      setIsProcessing(false);
      setProgress(0);
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

      {/* Website Scraping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Website Inventory Scraper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <Car className="w-4 h-4" />
              <span className="font-medium">Target Website</span>
            </div>
            <p className="text-blue-700 text-sm">{dealershipUrl}</p>
            <p className="text-blue-600 text-xs mt-1">
              This will extract all vehicle listings from your dealership website and add them to your inventory
            </p>
          </div>

          {(isScraping || isProcessing) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {isScraping && !isProcessing && 'Scraping website...'}
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
            {isScraping || isProcessing ? 'Processing...' : 'Scrape & Import Vehicle Inventory'}
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
                <h4 className="font-medium">Scraping Results</h4>
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
