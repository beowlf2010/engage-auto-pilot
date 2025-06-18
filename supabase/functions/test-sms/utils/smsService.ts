
interface SMSResult {
  success: boolean;
  message?: string;
  twilioMessageId?: string;
  status?: string;
  to?: string;
  from?: string;
  credentialsSource?: string;
  sentAt?: string;
  error?: string;
  twilioError?: any;
  statusCode?: number;
  debugInfo?: string;
}

export async function sendTestSMS(
  testPhoneNumber: string,
  accountSid: string,
  authToken: string,
  phoneNumber: string,
  source: string
): Promise<SMSResult> {
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const payload = new URLSearchParams({
    To: testPhoneNumber,
    From: phoneNumber,
    Body: `🔥 Test SMS from your CRM system sent at ${new Date().toLocaleString()}! This confirms your Twilio integration is working properly.`
  })
  
  console.log('📤 Sending to Twilio API:', {
    url: twilioUrl,
    to: testPhoneNumber,
    from: phoneNumber,
    messageLength: payload.get('Body')?.length || 0,
    accountSidStart: accountSid.substring(0, 6) + '...',
    credentialsSource: source
  });

  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload
  })

  console.log('📡 Twilio API response status:', response.status);
  const result = await response.json()
  console.log('📡 Twilio API full response:', JSON.stringify(result, null, 2));

  if (!response.ok) {
    console.error('❌ Twilio API error details:', {
      status: response.status,
      statusText: response.statusText,
      result: result,
      usedAccountSid: accountSid.substring(0, 6) + '...',
      usedPhoneNumber: phoneNumber,
      credentialsSource: source
    });
    
    let errorMessage = 'Failed to send test SMS';
    if (result.message) {
      errorMessage = result.message;
      
      // Add specific help for common errors
      if (result.code === 21211) {
        errorMessage += '. Please verify that your phone number is in E.164 format (e.g., +15551234567).';
      } else if (result.code === 21608) {
        errorMessage += '. Please verify your Twilio phone number in your Twilio Console.';
      }
    }
    
    return {
      success: false, 
      error: errorMessage,
      twilioError: result,
      statusCode: response.status,
      credentialsSource: source,
      debugInfo: `Using Phone Number: ${phoneNumber} from ${source}`
    }
  }

  console.log('✅ SUCCESS! Twilio SMS sent using', source.toUpperCase(), 'credentials:', result.sid);

  return {
    success: true,
    message: 'Test SMS sent successfully using your configured settings!',
    twilioMessageId: result.sid,
    status: result.status || 'queued',
    to: testPhoneNumber,
    from: phoneNumber,
    credentialsSource: source,
    sentAt: new Date().toISOString()
  }
}
