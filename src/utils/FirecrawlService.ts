
import { supabase } from '@/integrations/supabase/client';

interface ErrorResponse {
  success: false;
  error: string;
}

interface CrawlStatusResponse {
  success: true;
  status: string;
  completed: number;
  total: number;
  creditsUsed: number;
  expiresAt: string;
  data: any[];
  diagnostic?: {
    foundPages: number;
    sampleUrls: string[];
    hasContent: boolean;
  };
}

type CrawlResponse = CrawlStatusResponse | ErrorResponse;

export class FirecrawlService {
  // Keep these methods for backward compatibility but they won't be used
  private static API_KEY_STORAGE_KEY = 'firecrawl_api_key';

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    console.log('API key saved to localStorage (note: edge function uses Supabase secrets)');
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static async testApiKey(apiKey?: string): Promise<boolean> {
    try {
      console.log('Testing Firecrawl API key via edge function');
      
      const { data, error } = await supabase.functions.invoke('firecrawl-scraper', {
        body: { action: 'test' }
      });

      if (error) {
        console.error('Error testing API key:', error);
        return false;
      }

      console.log('Test API key response:', data);
      return data?.success === true;
    } catch (error) {
      console.error('Error testing Firecrawl API key:', error);
      return false;
    }
  }

  static async testDirectUrls(urls: string[]): Promise<{ success: boolean; results?: any[]; error?: string }> {
    try {
      console.log('🔍 Testing specific URLs directly:', urls);
      
      const { data, error } = await supabase.functions.invoke('firecrawl-scraper', {
        body: { 
          action: 'direct-test',
          testUrls: urls
        }
      });

      if (error) {
        console.error('❌ Error testing direct URLs:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Direct URL test results:', data);
      return data;
    } catch (error) {
      console.error('❌ Error during direct URL testing:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to test URLs'
      };
    }
  }

  static async scrapeVehicleInventory(dealershipUrl: string, diagnosticMode: boolean = false): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const mode = diagnosticMode ? 'DIAGNOSTIC' : 'PRODUCTION';
      console.log(`🚀 Starting ${mode} crawl for:`, dealershipUrl);
      
      // Step 1: Start the crawl
      const { data: crawlData, error: crawlError } = await supabase.functions.invoke('firecrawl-scraper', {
        body: { 
          action: 'crawl',
          url: dealershipUrl,
          diagnosticMode
        }
      });

      if (crawlError) {
        console.error('❌ Edge function error during crawl:', crawlError);
        throw new Error(`Edge function error: ${crawlError.message || 'Unknown error'}`);
      }

      if (!crawlData?.success) {
        console.error('❌ Crawl failed:', crawlData);
        throw new Error(crawlData?.error || 'Failed to start crawl');
      }

      const jobId = crawlData.jobId;
      const crawlMode = crawlData.mode || mode.toLowerCase();
      console.log(`✅ ${mode} crawl started with job ID:`, jobId);

      // Step 2: Poll for completion with enhanced progress tracking
      let attempts = 0;
      const maxAttempts = diagnosticMode ? 24 : 36; // Shorter timeout for diagnostic
      let lastLoggedProgress = -1;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const { data: statusData, error: statusError } = await supabase.functions.invoke('firecrawl-scraper', {
          body: { 
            action: 'status',
            jobId: jobId
          }
        });

        if (statusError) {
          console.error('❌ Edge function error during status check:', statusError);
          throw new Error(`Status check error: ${statusError.message || 'Unknown error'}`);
        }

        if (!statusData || !statusData.status) {
          console.error('❌ Invalid status response:', statusData);
          throw new Error('Invalid status response from crawl service');
        }

        // Enhanced progress logging with diagnostic info
        const progress = statusData.total > 0 ? Math.round((statusData.completed / statusData.total) * 100) : 0;
        
        if (progress !== lastLoggedProgress) {
          console.log(`📊 ${mode} Crawl Progress: ${statusData.completed}/${statusData.total} pages (${progress}%) - Status: ${statusData.status}`);
          if (statusData.creditsUsed) {
            console.log(`💳 Credits used: ${statusData.creditsUsed}`);
          }
          if (statusData.diagnostic) {
            console.log(`🔍 Diagnostic: Found ${statusData.diagnostic.foundPages} pages, has content: ${statusData.diagnostic.hasContent}`);
            if (statusData.diagnostic.sampleUrls.length > 0) {
              console.log(`📄 Sample URLs:`, statusData.diagnostic.sampleUrls);
            }
          }
          lastLoggedProgress = progress;
        }

        if (statusData.status === 'completed') {
          console.log(`🎉 ${mode} crawl completed!`);
          console.log(`📈 Final stats: ${statusData.completed} pages crawled, ${statusData.creditsUsed} credits used`);
          
          // Enhanced diagnostic output
          if (diagnosticMode) {
            console.log('🔍 DIAGNOSTIC RESULTS:');
            console.log(`  - Pages discovered: ${statusData.diagnostic?.foundPages || statusData.data?.length || 0}`);
            console.log(`  - Has content: ${statusData.diagnostic?.hasContent || false}`);
            if (statusData.data && statusData.data.length > 0) {
              console.log('📄 All discovered pages:');
              statusData.data.forEach((item, index) => {
                console.log(`  ${index + 1}. ${item.url || 'URL not available'} (${item.content ? Math.round(item.content.length/1000) + 'k chars' : 'no content'})`);
              });
            } else {
              console.log('⚠️ NO PAGES DISCOVERED - Possible issues:');
              console.log('  - Website uses JavaScript to load content');
              console.log('  - Anti-bot protection blocking crawler');
              console.log('  - Authentication required');
              console.log('  - robots.txt blocking access');
            }
          }
          
          return { 
            success: true,
            data: {
              ...statusData,
              mode: crawlMode,
              diagnostic: statusData.diagnostic
            }
          };
        }

        if (statusData.status === 'failed') {
          console.error('❌ Crawl failed');
          throw new Error('Crawl failed');
        }

        attempts++;
      }

      // Timeout handling
      console.warn(`⏰ ${mode} crawl timed out after ${maxAttempts * 5} seconds`);
      throw new Error(`Crawl timed out. ${diagnosticMode ? 'Try testing specific URLs directly.' : 'Try diagnostic mode first.'}`);

    } catch (error) {
      console.error(`❌ Error during ${diagnosticMode ? 'diagnostic' : 'production'} crawl:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape website'
      };
    }
  }
}
