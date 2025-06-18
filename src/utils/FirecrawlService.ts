
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
      // The edge function now correctly returns success: true/false
      return data?.success === true;
    } catch (error) {
      console.error('Error testing Firecrawl API key:', error);
      return false;
    }
  }

  static async scrapeVehicleInventory(dealershipUrl: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log('🚀 Starting optimized vehicle inventory scrape for:', dealershipUrl);
      
      // Step 1: Start the crawl
      const { data: crawlData, error: crawlError } = await supabase.functions.invoke('firecrawl-scraper', {
        body: { 
          action: 'crawl',
          url: dealershipUrl
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
      console.log('✅ Optimized crawl started with job ID:', jobId);

      // Step 2: Poll for completion with enhanced progress tracking
      let attempts = 0;
      const maxAttempts = 36; // 3 minutes max (5 sec intervals)
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

        // Check for presence of status field instead of success field
        if (!statusData || !statusData.status) {
          console.error('❌ Invalid status response:', statusData);
          throw new Error('Invalid status response from crawl service');
        }

        // Enhanced progress logging
        const progress = statusData.total > 0 ? Math.round((statusData.completed / statusData.total) * 100) : 0;
        
        // Only log progress updates when there's a meaningful change
        if (progress !== lastLoggedProgress) {
          console.log(`📊 Crawl Progress: ${statusData.completed}/${statusData.total} pages (${progress}%) - Status: ${statusData.status}`);
          if (statusData.creditsUsed) {
            console.log(`💳 Credits used: ${statusData.creditsUsed}`);
          }
          lastLoggedProgress = progress;
        }

        if (statusData.status === 'completed') {
          console.log('🎉 Crawl completed successfully!');
          console.log(`📈 Final stats: ${statusData.completed} pages crawled, ${statusData.creditsUsed} credits used`);
          
          // Log some sample URLs if available
          if (statusData.data && statusData.data.length > 0) {
            console.log('📄 Sample crawled pages:');
            statusData.data.slice(0, 5).forEach((item, index) => {
              console.log(`  ${index + 1}. ${item.url || 'URL not available'}`);
            });
          }
          
          return { 
            success: true,
            data: statusData
          };
        }

        if (statusData.status === 'failed') {
          console.error('❌ Crawl failed');
          throw new Error('Crawl failed');
        }

        attempts++;
      }

      // Timeout handling with partial results
      console.warn('⏰ Crawl timed out after 3 minutes');
      throw new Error(`Crawl timed out after ${maxAttempts * 5} seconds. Try reducing the scope or check your website's accessibility.`);

    } catch (error) {
      console.error('❌ Error during vehicle inventory scrape:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape website'
      };
    }
  }
}
