
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
      console.log('Starting vehicle inventory scrape via edge function:', dealershipUrl);
      
      // Step 1: Start the crawl
      const { data: crawlData, error: crawlError } = await supabase.functions.invoke('firecrawl-scraper', {
        body: { 
          action: 'crawl',
          url: dealershipUrl
        }
      });

      if (crawlError) {
        console.error('Edge function error during crawl:', crawlError);
        throw new Error(`Edge function error: ${crawlError.message || 'Unknown error'}`);
      }

      if (!crawlData?.success) {
        console.error('Crawl failed:', crawlData);
        throw new Error(crawlData?.error || 'Failed to start crawl');
      }

      const jobId = crawlData.jobId;
      console.log('Crawl started with job ID:', jobId);

      // Step 2: Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const { data: statusData, error: statusError } = await supabase.functions.invoke('firecrawl-scraper', {
          body: { 
            action: 'status',
            jobId: jobId
          }
        });

        if (statusError) {
          console.error('Edge function error during status check:', statusError);
          throw new Error(`Status check error: ${statusError.message || 'Unknown error'}`);
        }

        // Fix: Check for presence of status field instead of success field
        if (!statusData || !statusData.status) {
          console.error('Invalid status response:', statusData);
          throw new Error('Invalid status response from crawl service');
        }

        console.log(`Crawl status: ${statusData.status}, completed: ${statusData.completed}/${statusData.total}`);

        if (statusData.status === 'completed') {
          console.log('Crawl completed successfully');
          return { 
            success: true,
            data: statusData
          };
        }

        if (statusData.status === 'failed') {
          throw new Error('Crawl failed');
        }

        attempts++;
      }

      throw new Error('Crawl timed out');

    } catch (error) {
      console.error('Error during vehicle inventory scrape:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape website'
      };
    }
  }
}
