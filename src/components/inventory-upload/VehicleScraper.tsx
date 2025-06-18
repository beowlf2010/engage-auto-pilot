import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Globe, Car, Database, CheckCircle, AlertCircle, Target, Clock, Search, Bug } from 'lucide-react';
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
  const [isTestingUrls, setIsTestingUrls] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapingResult, setScrapingResult] = useState<any>(null);
  const [processedResult, setProcessedResult] = useState<any>(null);
  const [directUrlResults, setDirectUrlResults] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [diagnosticMode, setDiagnosticMode] = useState(true); // Start in diagnostic mode
  
  const dealershipUrl = 'https://www.jasonpilgerchevrolet.com/';
  const inventoryUrls = [
    'https://www.jasonpilgerchevrolet.com/new-inventory/index.htm',
    'https://www.jasonpilgerchevrolet.com/used-inventory/index.htm'
  ];

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

  const handleTestDirectUrls = async () => {
    setIsTestingUrls(true);
    setDirectUrlResults(null);
    
    try {
      console.log('🔍 Testing specific inventory URLs...');
      const result = await FirecrawlService.testDirectUrls(inventoryUrls);
      
      if (result.success) {
        setDirectUrlResults(result.results);
        console.log('✅ Direct URL test completed:', result.results);
        
        const accessibleUrls = result.results?.filter(r => r.success && r.contentLength > 100) || [];
        
        toast({
          title: "URL Test Complete",
          description: `${accessibleUrls.length} of ${inventoryUrls.length} inventory URLs are accessible with content`,
          variant: accessibleUrls.length > 0 ? "default" : "destructive"
        });
      } else {
        toast({
          title: "URL Test Failed",
          description: result.error || "Failed to test inventory URLs",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing URLs:', error);
      toast({
        title: "Error",
        description: "Failed to test inventory URLs",
        variant: "destructive"
      });
    } finally {
      setIsTestingUrls(false);
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
    setDirectUrlResults(null);
    
    const mode = diagnosticMode ? 'DIAGNOSTIC' : 'PRODUCTION';
    setCurrentStep(`Starting ${mode.toLowerCase()} crawl...`);

    try {
      console.log(`🎯 Starting ${mode} website scraping...`);
      
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 45));
      }, 2000);

      const scrapingResponse = await FirecrawlService.scrapeVehicleInventory(dealershipUrl, diagnosticMode);
      clearInterval(progressInterval);
      setProgress(50);

      if (!scrapingResponse.success) {
        throw new Error(scrapingResponse.error || 'Failed to scrape website');
      }

      setScrapingResult(scrapingResponse.data);
      setCurrentStep(`${mode} crawl completed successfully!`);
      console.log(`✅ ${mode} website scraping completed`);

      if (diagnosticMode) {
        // In diagnostic mode, just show results
        setProgress(100);
        setCurrentStep('Diagnostic complete - review results below');
        
        const foundPages = scrapingResponse.data?.diagnostic?.foundPages || 0;
        toast({
          title: "Diagnostic Complete",
          description: `Found ${foundPages} accessible pages. ${foundPages === 0 ? 'Try testing specific URLs next.' : 'Switch to production mode to process vehicles.'}`,
          variant: foundPages > 0 ? "default" : "destructive"
        });
      } else {
        // In production mode, continue with processing
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
          description: `Successfully processed ${processedData.processedCount} vehicles from your crawl`
        });

        onScrapingComplete?.({
          ...scrapingResponse.data,
          processedVehicles: processedData.processedCount,
          skippedPages: processedData.skippedCount
        });
      }

    } catch (error) {
      console.error('Error in scrape and process:', error);
      setCurrentStep('Error occurred during processing');
      toast({
        title: "Error",
        description: error.message || "Failed to scrape and process website",
        variant: "destructive"
      });
    } finally {
      setIsScraping(false);
      setIsProcessing(false);
      if (!diagnosticMode) {
        setProgress(0);
        setCurrentStep('');
      }
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

      {/* Diagnostic Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Diagnostic Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <Bug className="w-4 h-4" />
              <span className="font-medium">Troubleshooting Mode</span>
            </div>
            <p className="text-blue-700 text-sm mb-3">
              Use these tools to identify why the crawl returned 0 pages and find the best approach for your website.
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={handleTestDirectUrls}
                disabled={isTestingUrls || connectionStatus === 'error'}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Search className="w-4 h-4 mr-2" />
                {isTestingUrls ? 'Testing URLs...' : 'Test Specific Inventory URLs'}
              </Button>
              
              {directUrlResults && (
                <div className="mt-3 space-y-2">
                  <h5 className="font-medium text-sm">Direct URL Test Results:</h5>
                  {directUrlResults.map((result, index) => (
                    <div key={index} className="text-xs p-2 bg-white rounded border">
                      <div className="flex items-center justify-between">
                        <span className="truncate flex-1">{result.url.split('/').pop()}</span>
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-red-600" />
                          )}
                          <span className="text-gray-500">
                            {result.contentLength > 0 ? `${Math.round(result.contentLength/1000)}k chars` : 'No content'}
                          </span>
                        </div>
                      </div>
                      {result.error && (
                        <p className="text-red-600 text-xs mt-1">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Scraper */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {diagnosticMode ? <Bug className="w-5 h-5" /> : <Target className="w-5 h-5" />}
            {diagnosticMode ? 'Diagnostic Crawler' : 'Production Inventory Scraper'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-sm">
                {diagnosticMode ? 'Diagnostic Mode' : 'Production Mode'}
              </div>
              <div className="text-xs text-gray-600">
                {diagnosticMode 
                  ? 'Broad discovery crawl to identify accessible pages (15 page limit)'
                  : 'Optimized crawl for vehicle inventory processing (25 page limit)'
                }
              </div>
            </div>
            <Switch
              checked={!diagnosticMode}
              onCheckedChange={(checked) => setDiagnosticMode(!checked)}
              disabled={isScraping}
            />
          </div>

          <div className={`p-4 rounded-lg border ${diagnosticMode ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {diagnosticMode ? <Bug className="w-4 h-4 text-blue-600" /> : <Target className="w-4 h-4 text-green-600" />}
              <span className={`font-medium ${diagnosticMode ? 'text-blue-800' : 'text-green-800'}`}>
                {diagnosticMode ? 'Diagnostic Configuration' : 'Production Configuration'}
              </span>
            </div>
            <p className={`text-sm mb-2 ${diagnosticMode ? 'text-blue-700' : 'text-green-700'}`}>{dealershipUrl}</p>
            <div className={`grid grid-cols-2 gap-4 text-xs ${diagnosticMode ? 'text-blue-600' : 'text-green-600'}`}>
              <div>
                <span className="font-medium">Page Limit:</span> {diagnosticMode ? '15' : '25'}
              </div>
              <div>
                <span className="font-medium">Filters:</span> {diagnosticMode ? 'Minimal' : 'Inventory optimized'}
              </div>
            </div>
            <p className={`text-xs mt-2 ${diagnosticMode ? 'text-blue-600' : 'text-green-600'}`}>
              {diagnosticMode 
                ? '🔍 Discovers what pages are accessible without strict filtering'
                : '🎯 Targets inventory pages while excluding non-vehicle content'
              }
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
                  {isScraping && !isProcessing && (diagnosticMode ? 'Running diagnostic crawl...' : 'Scraping inventory pages...')}
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
            {isScraping || isProcessing 
              ? 'Processing...' 
              : diagnosticMode 
                ? 'Start Diagnostic Crawl' 
                : 'Start Production Inventory Scrape'
            }
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
                  {diagnosticMode ? <Bug className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                  {diagnosticMode ? 'Diagnostic Results' : 'Scraping Results'}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className={`p-3 rounded ${scrapingResult.completed > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className={`font-medium ${scrapingResult.completed > 0 ? 'text-green-800' : 'text-red-800'}`}>
                      Pages Found
                    </div>
                    <div className={scrapingResult.completed > 0 ? 'text-green-600' : 'text-red-600'}>
                      {scrapingResult.completed || 0}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="font-medium text-blue-800">Credits Used</div>
                    <div className="text-blue-600">{scrapingResult.creditsUsed || 0}</div>
                  </div>
                </div>
                
                {diagnosticMode && scrapingResult.diagnostic && (
                  <div className="space-y-2">
                    <div className={`p-3 rounded ${scrapingResult.diagnostic.foundPages > 0 ? 'bg-green-100' : 'bg-amber-100'}`}>
                      <div className={`text-sm font-medium ${scrapingResult.diagnostic.foundPages > 0 ? 'text-green-800' : 'text-amber-800'}`}>
                        Diagnostic Summary
                      </div>
                      <div className={`text-xs ${scrapingResult.diagnostic.foundPages > 0 ? 'text-green-700' : 'text-amber-700'}`}>
                        {scrapingResult.diagnostic.foundPages > 0 ? (
                          <>
                            ✅ Found {scrapingResult.diagnostic.foundPages} accessible pages with {scrapingResult.diagnostic.hasContent ? 'content' : 'minimal content'}
                            <br />
                            💡 Switch to Production Mode to process vehicle inventory
                          </>
                        ) : (
                          <>
                            ⚠️ No pages discovered - website may require authentication, use JavaScript, or block crawlers
                            <br />
                            💡 Try testing specific URLs above to identify the issue
                          </>
                        )}
                      </div>
                    </div>
                    
                    {scrapingResult.diagnostic.sampleUrls.length > 0 && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-sm font-medium text-gray-800 mb-1">Sample Discovered URLs:</div>
                        {scrapingResult.diagnostic.sampleUrls.map((url, index) => (
                          <div key={index} className="text-xs text-gray-600 truncate">{url}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!diagnosticMode && (
                  <div className="bg-amber-50 p-3 rounded">
                    <div className="text-amber-800 text-sm">
                      💡 Production mode completed - {scrapingResult.completed > 0 ? 'found pages for processing' : 'no inventory pages found'}
                    </div>
                  </div>
                )}
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
