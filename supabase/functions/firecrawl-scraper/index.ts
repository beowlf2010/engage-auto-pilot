
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, url, jobId } = await req.json();

    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Firecrawl action: ${action}`, { url, jobId });

    if (action === 'test') {
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

      const testData = await testResponse.json() as FirecrawlCrawlResponse;
      console.log('API key test result:', testData);

      return new Response(
        JSON.stringify({ success: testData.success }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'crawl') {
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

      const crawlData = await crawlResponse.json() as FirecrawlCrawlResponse;
      console.log('Crawl initiated:', crawlData);

      if (!crawlData.success) {
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
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in firecrawl-scraper function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
