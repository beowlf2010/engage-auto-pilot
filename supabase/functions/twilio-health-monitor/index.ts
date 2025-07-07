import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface TwilioHealthCheck {
  api_status: string;
  response_time_ms?: number;
  error_message?: string;
  account_status?: string;
  phone_number_valid?: boolean;
  success_rate: number;
}

async function performTwilioHealthCheck(): Promise<TwilioHealthCheck> {
  const startTime = Date.now();
  
  try {
    // Get Twilio credentials from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number']);

    if (!settings || settings.length === 0) {
      return {
        api_status: 'credentials_missing',
        error_message: 'Twilio credentials not configured',
        success_rate: 0
      };
    }

    const settingsMap = settings.reduce((acc: any, item: any) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    const accountSid = settingsMap.twilio_account_sid;
    const authToken = settingsMap.twilio_auth_token;
    const phoneNumber = settingsMap.twilio_phone_number;

    if (!accountSid || !authToken) {
      return {
        api_status: 'credentials_invalid',
        error_message: 'Missing Account SID or Auth Token',
        success_rate: 0
      };
    }

    // Test Twilio API with account status check
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.text();
      return {
        api_status: 'api_error',
        response_time_ms: responseTime,
        error_message: `HTTP ${response.status}: ${errorData}`,
        success_rate: 0
      };
    }

    const accountData = await response.json();
    
    // Validate phone number if provided
    let phoneNumberValid = true;
    if (phoneNumber) {
      try {
        const phoneResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
          {
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            }
          }
        );
        
        if (phoneResponse.ok) {
          const phoneData = await phoneResponse.json();
          phoneNumberValid = phoneData.incoming_phone_numbers && phoneData.incoming_phone_numbers.length > 0;
        } else {
          phoneNumberValid = false;
        }
      } catch (error) {
        console.warn('Phone number validation failed:', error);
        phoneNumberValid = false;
      }
    }

    return {
      api_status: 'healthy',
      response_time_ms: responseTime,
      account_status: accountData.status,
      phone_number_valid: phoneNumberValid,
      success_rate: 1.0
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Twilio health check failed:', error);
    
    return {
      api_status: 'connection_error',
      response_time_ms: responseTime,
      error_message: error.message,
      success_rate: 0
    };
  }
}

async function sendAlert(healthResult: TwilioHealthCheck) {
  try {
    // Get monitoring settings
    const { data: monitoringSettings } = await supabase
      .from('twilio_monitoring_settings')
      .select('*')
      .limit(1)
      .single();

    if (!monitoringSettings?.alert_phone_numbers?.length) {
      console.log('No alert phone numbers configured');
      return;
    }

    // Check if we should send an alert (rate limiting)
    const lastAlert = monitoringSettings.last_alert_sent;
    const now = new Date();
    const hoursSinceLastAlert = lastAlert ? 
      (now.getTime() - new Date(lastAlert).getTime()) / (1000 * 60 * 60) : 24;

    if (hoursSinceLastAlert < 1) {
      console.log('Alert rate limit: Not sending alert (last sent less than 1 hour ago)');
      return;
    }

    // Send SMS alert to configured numbers
    const alertMessage = `🚨 TWILIO API ALERT 🚨\n\nStatus: ${healthResult.api_status}\nError: ${healthResult.error_message || 'None'}\nTime: ${new Date().toLocaleString()}\n\nPlease check your Twilio configuration immediately.`;

    for (const phoneNumber of monitoringSettings.alert_phone_numbers) {
      try {
        await supabase.functions.invoke('send-sms', {
          body: {
            to: phoneNumber,
            message: alertMessage
          }
        });
        console.log(`Alert sent to ${phoneNumber}`);
      } catch (error) {
        console.error(`Failed to send alert to ${phoneNumber}:`, error);
      }
    }

    // Update last alert sent timestamp
    await supabase
      .from('twilio_monitoring_settings')
      .update({ last_alert_sent: now.toISOString() })
      .eq('id', monitoringSettings.id);

  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting Twilio health check...');

    // Check if monitoring is enabled
    const { data: monitoringSettings } = await supabase
      .from('twilio_monitoring_settings')
      .select('monitoring_enabled, failure_threshold')
      .limit(1)
      .single();

    if (!monitoringSettings?.monitoring_enabled) {
      console.log('Monitoring is disabled');
      return new Response(
        JSON.stringify({ status: 'monitoring_disabled' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Perform health check
    const healthResult = await performTwilioHealthCheck();
    
    // Log the result
    const { error: logError } = await supabase
      .from('twilio_health_logs')
      .insert([healthResult]);

    if (logError) {
      console.error('Failed to log health check result:', logError);
    }

    // Check if we need to send an alert
    if (healthResult.success_rate < (monitoringSettings.failure_threshold || 0.5)) {
      console.log('🚨 Health check failed, sending alert...');
      await sendAlert(healthResult);
    }

    // Cleanup old logs (keep last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabase
      .from('twilio_health_logs')
      .delete()
      .lt('created_at', sevenDaysAgo.toISOString());

    console.log(`✅ Health check completed: ${healthResult.api_status}`);

    return new Response(
      JSON.stringify({
        status: 'success',
        health: healthResult,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Health check function error:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
