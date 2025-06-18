
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

    const { action, url, jobId } = requestBody;
    console.log(`Firecrawl action: ${action}`, { url, jobId });

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
      // Start crawling the website
      const crawlResponse = await fetch('https://api.firecrawl.dev/v0/crawl', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          crawlerOptions: {
            limit: 100,
            includes: ['inventory', 'vehicles', 'new', 'used'],
            excludes: ['nav', 'header', 'footer', 'service', 'parts', 'contact']
          },
          pageOptions: {
            onlyMainContent: true
          }
        }),
      });

      const crawlData = await crawlResponse.json();
      console.log('Crawl initiated:', crawlData);

      // Check for successful response - either success: true or presence of jobId
      const isSuccessful = crawlData.success || crawlData.jobId;
      
      if (!isSuccessful) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: crawlData.error || 'Failed to start crawl'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId: crawlData.jobId 
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

      const statusData = await statusResponse.json() as FirecrawlStatusResponse;
      console.log('Crawl status:', statusData);

      return new Response(
        JSON.stringify(statusData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      console.error('Invalid action provided:', action);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action. Supported actions: test, crawl, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in firecrawl-scraper function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
