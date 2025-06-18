
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FirecrawlCrawlResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}

interface FirecrawlStatusResponse {
  success: boolean;
  status?: string;
  completed?: number;
  total?: number;
  creditsUsed?: number;
  expiresAt?: string;
  data?: any[];
  error?: string;
}

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

serve(async (req) => {
  console.log('Firecrawl scraper function called with method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed:', requestBody);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, url, jobId, diagnosticMode } = requestBody;
    console.log(`Firecrawl action: ${action}`, { url, jobId, diagnosticMode });

    if (action === 'test') {
      console.log('Testing Firecrawl API key');
      // Test the API key with a simple crawl
      const testResponse = await fetch('https://api.firecrawl.dev/v0/crawl', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
          crawlerOptions: {
            limit: 1
          }
        }),
      });

      const testData = await testResponse.json();
      console.log('API key test result:', testData);

      // Firecrawl returns a jobId for successful requests, not success: true
      const isSuccessful = testData.jobId || testData.success;
      
      return new Response(
        JSON.stringify({ success: !!isSuccessful }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'crawl') {
      console.log('Starting crawl for URL:', url);
      console.log('Diagnostic mode:', diagnosticMode);
      
      let crawlerOptions;
      
      if (diagnosticMode) {
        // Diagnostic crawl: minimal restrictions, broad discovery
        crawlerOptions = {
          limit: 15, // Keep low to save credits
          includes: [], // No restrictions - see what's available
          excludes: [
            // Only exclude clearly non-content pages
            'javascript:', 'mailto:', 'tel:', '#'
          ]
        };
        console.log('🔍 Using DIAGNOSTIC mode - broad crawl with minimal restrictions');
      } else {
        // Production crawl: optimized for inventory
        crawlerOptions = {
          limit: 25,
          includes: [
            'new-inventory',
            'used-inventory', 
            'index.htm',
            'inventory',
            'vehicles'
          ],
          excludes: [
            'nav', 'header', 'footer', 'search', 'compare',
            'service', 'parts', 'contact', 'about', 'financing', 
            'specials', 'offers', 'coupons', 'maintenance',
            'careers', 'reviews', 'testimonials', 'directions',
            'hours', 'staff', 'management', 'history',
            'warranty', 'recall', 'accessories', 'body-shop'
          ]
        };
        console.log('🎯 Using PRODUCTION mode - optimized for inventory');
      }

      console.log('Crawler options:', crawlerOptions);
      
      // Start crawling the website
      const crawlResponse = await fetch('https://api.firecrawl.dev/v0/crawl', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          crawlerOptions,
          pageOptions: {
            onlyMainContent: true,
            includeHtml: false, // Reduce data size
            includeRawHtml: false,
            waitFor: 2000 // Wait 2 seconds for JS to load
          }
        }),
      });

      const crawlData = await crawlResponse.json();
      console.log('Crawl response status:', crawlResponse.status);
      console.log('Crawl response data:', crawlData);

      // Check for successful response - either success: true or presence of jobId
      const isSuccessful = crawlData.success || crawlData.jobId;
      
      if (!isSuccessful) {
        console.error('❌ Crawl failed:', crawlData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: crawlData.error || 'Failed to start crawl',
            details: crawlData
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Crawl started successfully with job ID:', crawlData.jobId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId: crawlData.jobId,
          mode: diagnosticMode ? 'diagnostic' : 'production'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'status') {
      console.log('Checking crawl status for job:', jobId);
      // Check crawl status
      const statusResponse = await fetch(`https://api.firecrawl.dev/v0/crawl/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const statusData = await statusResponse.json();
      console.log('📊 Raw Firecrawl status response:', statusData);

      // Enhanced logging for diagnostic purposes
      if (statusData.status) {
        const progress = statusData.total > 0 ? Math.round((statusData.completed / statusData.total) * 100) : 0;
        console.log(`🔄 Crawl Progress: ${statusData.completed}/${statusData.total} pages (${progress}%) - Status: ${statusData.status}`);
        
        if (statusData.creditsUsed) {
          console.log(`💳 Credits used so far: ${statusData.creditsUsed}`);
        }

        // Log discovered URLs for diagnostic purposes
        if (statusData.data && statusData.data.length > 0) {
          console.log(`📄 Found ${statusData.data.length} pages:`);
          statusData.data.slice(0, 5).forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.url || 'URL not available'} (${item.content ? Math.round(item.content.length/1000) + 'k chars' : 'no content'})`);
          });
          if (statusData.data.length > 5) {
            console.log(`  ... and ${statusData.data.length - 5} more pages`);
          }
        } else if (statusData.status === 'completed') {
          console.log('⚠️ DIAGNOSTIC: Crawl completed but NO PAGES FOUND - possible causes:');
          console.log('  - Website blocks crawlers (robots.txt, anti-bot)');
          console.log('  - Content requires JavaScript to load');
          console.log('  - Authentication required');
          console.log('  - URL structure doesn\'t match includes/excludes');
        }
      }

      // Return the raw status data with enhanced diagnostic info
      return new Response(
        JSON.stringify({
          ...statusData,
          diagnostic: {
            foundPages: statusData.data?.length || 0,
            sampleUrls: statusData.data?.slice(0, 3).map(item => item.url) || [],
            hasContent: statusData.data?.some(item => item.content && item.content.length > 100) || false
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'direct-test') {
      // Test specific URLs directly
      const { testUrls } = requestBody;
      console.log('🔍 Testing specific URLs directly:', testUrls);
      
      const results = [];
      for (const testUrl of testUrls) {
        try {
          const testResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: testUrl,
              pageOptions: {
                onlyMainContent: true,
                waitFor: 2000
              }
            }),
          });
          
          const testData = await testResponse.json();
          results.push({
            url: testUrl,
            success: testData.success,
            contentLength: testData.data?.content?.length || 0,
            error: testData.error
          });
          console.log(`URL test result for ${testUrl}:`, {
            success: testData.success,
            contentLength: testData.data?.content?.length || 0,
            hasContent: !!(testData.data?.content && testData.data.content.length > 100)
          });
        } catch (error) {
          results.push({
            url: testUrl,
            success: false,
            error: error.message
          });
          console.error(`Failed to test URL ${testUrl}:`, error);
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      console.error('Invalid action provided:', action);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action. Supported actions: test, crawl, status, direct-test' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Error in firecrawl-scraper function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
