
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
        // Diagnostic crawl: broader discovery with focus on vehicle pages
        crawlerOptions = {
          limit: 15,
          includes: [
            '/used/',
            '/new/',
            'inventory',
            'vehicles'
          ],
          excludes: [
            // Only exclude clearly non-vehicle pages
            'javascript:', 'mailto:', 'tel:', '#',
            'contact', 'about', 'financing', 'service', 'parts',
            'careers', 'directions', 'hours', 'reviews'
          ]
        };
        console.log('🔍 Using DIAGNOSTIC mode - focused on vehicle pages');
      } else {
        // Production crawl: optimized for vehicle detail pages
        crawlerOptions = {
          limit: 50, // Increased to capture more vehicle pages
          includes: [
            '/used/', // Individual used vehicle detail pages
            '/new/',  // Individual new vehicle detail pages
            '/vehicles/',
            'inventory',
            '.htm' // Many vehicle pages end in .htm
          ],
          excludes: [
            // Exclude non-vehicle content but be less restrictive
            'javascript:', 'mailto:', 'tel:', '#',
            'contact', 'about', 'financing', 'service', 'parts',
            'careers', 'directions', 'hours', 'reviews', 'testimonials',
            'warranty', 'recall', 'accessories', 'body-shop', 'employment',
            'specials', 'offers', 'coupons', 'maintenance', 'blog'
          ]
        };
        console.log('🎯 Using PRODUCTION mode - optimized for vehicle detail pages');
      }

      console.log('Updated crawler options:', crawlerOptions);
      
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
            waitFor: 3000 // Increased wait time for JS to load vehicle data
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

        // Enhanced logging for vehicle page discovery
        if (statusData.data && statusData.data.length > 0) {
          console.log(`🚗 Found ${statusData.data.length} pages:`);
          let vehiclePageCount = 0;
          
          statusData.data.slice(0, 10).forEach((item, index) => {
            const isVehiclePage = item.url && (
              item.url.includes('/used/') || 
              item.url.includes('/new/') || 
              item.url.toLowerCase().includes('vehicle')
            );
            
            if (isVehiclePage) vehiclePageCount++;
            
            const pageType = isVehiclePage ? '🚗 VEHICLE' : '📄 OTHER';
            console.log(`  ${index + 1}. ${pageType}: ${item.url || 'URL not available'} (${item.content ? Math.round(item.content.length/1000) + 'k chars' : 'no content'})`);
          });
          
          console.log(`🎯 Vehicle pages found: ${vehiclePageCount}/${statusData.data.length}`);
          
          if (statusData.data.length > 10) {
            console.log(`  ... and ${statusData.data.length - 10} more pages`);
          }
        } else if (statusData.status === 'completed') {
          console.log('⚠️ DIAGNOSTIC: Crawl completed but NO PAGES FOUND - possible causes:');
          console.log('  - Website blocks crawlers (robots.txt, anti-bot)');
          console.log('  - Content requires JavaScript to load');
          console.log('  - Authentication required');
          console.log('  - URL structure doesn\'t match includes/excludes');
        }
      }

      // Enhanced diagnostic info with vehicle page analysis
      const diagnostic = {
        foundPages: statusData.data?.length || 0,
        sampleUrls: statusData.data?.slice(0, 3).map(item => item.url) || [],
        hasContent: statusData.data?.some(item => item.content && item.content.length > 100) || false,
        vehiclePages: statusData.data?.filter(item => 
          item.url && (item.url.includes('/used/') || item.url.includes('/new/'))
        ).length || 0
      };

      // Return the raw status data with enhanced diagnostic info
      return new Response(
        JSON.stringify({
          ...statusData,
          diagnostic
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
