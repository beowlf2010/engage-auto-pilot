import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎤 [VOICEMAIL-TWIML] Generating TwiML for voicemail drop');
    
    const url = new URL(req.url);
    const message = url.searchParams.get('message') || 'This is a test voicemail message.';
    
    console.log('📝 Voicemail message:', message);

    // Generate TwiML for voicemail drop
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" rate="slow" language="en-US">${message}</Say>
    <Pause length="1"/>
    <Hangup/>
</Response>`;

    console.log('✅ Generated TwiML for voicemail');

    return new Response(twiml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml'
      }
    });

  } catch (error) {
    console.error('💥 CRITICAL ERROR in voicemail-twiml function:', error);
    
    // Return basic TwiML even on error
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Hello, this is a voicemail from your car dealership. Please call us back when you have a chance. Thank you.</Say>
    <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml'
      }
    });
  }
});