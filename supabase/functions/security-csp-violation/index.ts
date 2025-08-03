import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { violation, timestamp, userAgent, url } = body;

    console.log('🚨 CSP Violation Report:', {
      violatedDirective: violation['violated-directive'],
      blockedUri: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      lineNumber: violation['line-number']
    });

    // Log to security audit table
    const { error: logError } = await supabase
      .from('security_audit_log')
      .insert({
        user_id: null, // CSP violations don't have user context
        action: 'csp_violation',
        resource_type: 'security',
        details: {
          violation: {
            violatedDirective: violation['violated-directive'],
            blockedUri: violation['blocked-uri'],
            sourceFile: violation['source-file'],
            lineNumber: violation['line-number'],
            columnNumber: violation['column-number'],
            scriptSample: violation['script-sample'],
            disposition: violation.disposition
          },
          context: {
            url,
            userAgent,
            timestamp
          }
        }
      });

    if (logError) {
      console.error('Failed to log CSP violation:', logError);
    }

    // Determine severity based on violation type
    const severity = violation['violated-directive'].includes('script-src') ? 'high' : 'medium';
    
    // Check if this is a critical violation requiring immediate attention
    const criticalViolations = ['script-src', 'object-src', 'frame-src'];
    const isCritical = criticalViolations.some(directive => 
      violation['violated-directive'].includes(directive)
    );

    if (isCritical) {
      console.warn('🚨 CRITICAL CSP VIOLATION - Potential XSS attempt blocked');
      
      // Could trigger additional security measures here:
      // - Rate limiting
      // - IP blocking
      // - Alert notifications
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'CSP violation logged',
      severity,
      critical: isCritical
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing CSP violation:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to process CSP violation',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});