
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Globe, Car, Download, Settings, AlertCircle, Database } from 'lucide-react';
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
  const [apiKey, setApiKey] = useState(FirecrawlService.getApiKey() || '');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapingResult, setScrapingResult] = useState<any>(null);
  const [processedResult, setProcessedResult] = useState<any>(null);
  
  const dealershipUrl = 'https://www.jasonpilgerchevrolet.com/';

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive"
      });
      return;
    }

    setIsTestingKey(true);
    try {
      const isValid = await FirecrawlService.testApiKey(apiKey);
      if (isValid) {
        FirecrawlService.saveApiKey(apiKey);
        setKeyValid(true);
        toast({
          title: "Success",
          description: "Firecrawl API key saved and validated successfully"
        });
      } else {
        setKeyValid(false);
        toast({
          title: "Error",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      setKeyValid(false);
      toast({
        title: "Error",
        description: "Failed to validate API key",
        variant: "destructive"
      });
    } finally {
      setIsTestingKey(false);
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
        setProgress(prev => Math.min(prev + 5, 45));
      }, 500);

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
      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Firecrawl API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle className="w-4 h-4" />
            <span>You need a Firecrawl API key to scrape your website. Get one at <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">firecrawl.dev</a></span>
          </div>
          
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter your Firecrawl API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleSaveApiKey}
              disabled={isTestingKey || !apiKey.trim()}
              variant="outline"
            >
              {isTestingKey ? 'Testing...' : 'Save & Test'}
            </Button>
          </div>

          {keyValid !== null && (
            <div className="flex items-center gap-2">
              <Badge variant={keyValid ? "default" : "destructive"}>
                {keyValid ? "✓ API Key Valid" : "✗ Invalid API Key"}
              </Badge>
            </div>
          )}
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
            disabled={isScraping || isProcessing || !keyValid}
            className="w-full"
          >
            <Database className="w-4 h-4 mr-2" />
            {isScraping || isProcessing ? 'Processing...' : 'Scrape & Import Vehicle Inventory'}
          </Button>

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
