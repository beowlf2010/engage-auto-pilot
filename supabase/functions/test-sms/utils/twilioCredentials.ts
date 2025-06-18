
interface TwilioCredentials {
  accountSid: string | null;
  authToken: string | null;
  phoneNumber: string | null;
  source: 'database' | 'environment' | 'none';
}

export async function getTwilioSecrets(supabase: any): Promise<TwilioCredentials> {
  console.log('🔍 Fetching Twilio credentials - checking database first...');
  
  // First check database settings
  const { data: settings, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'])

  if (error) {
    console.error('❌ Database error:', error);
  } else {
    console.log('📊 Retrieved settings from database:', settings?.map(s => ({ key: s.key, hasValue: !!s.value })));
  }

  const settingsMap: Record<string, string> = {}
  settings?.forEach(setting => {
    settingsMap[setting.key] = setting.value
  })

  const dbAccountSid = settingsMap['TWILIO_ACCOUNT_SID']
  const dbAuthToken = settingsMap['TWILIO_AUTH_TOKEN']
  const dbPhoneNumber = settingsMap['TWILIO_PHONE_NUMBER']

  console.log('📊 Database settings parsed:', {
    hasDbAccountSid: !!dbAccountSid,
    hasDbAuthToken: !!dbAuthToken,
    hasDbPhoneNumber: !!dbPhoneNumber,
    dbAccountSidStart: dbAccountSid ? dbAccountSid.substring(0, 6) + '...' : 'none',
    dbPhoneNumber: dbPhoneNumber || 'none'
  });

  // If we have complete database settings, use them
  if (dbAccountSid && dbAuthToken && dbPhoneNumber) {
    console.log('✅ Using DATABASE credentials (from Settings UI)');
    return { 
      accountSid: dbAccountSid, 
      authToken: dbAuthToken, 
      phoneNumber: dbPhoneNumber,
      source: 'database'
    }
  }

  // Fall back to environment variables only if database is incomplete
  console.log('⚠️ Database credentials incomplete, checking environment variables...');
  const envAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const envAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const envPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')
  
  console.log('🔍 Environment check:', {
    hasEnvAccountSid: !!envAccountSid,
    hasEnvAuthToken: !!envAuthToken,
    hasEnvPhoneNumber: !!envPhoneNumber,
    envAccountSidStart: envAccountSid ? envAccountSid.substring(0, 6) + '...' : 'none',
    envPhoneNumber: envPhoneNumber || 'none'
  });

  if (envAccountSid && envAuthToken && envPhoneNumber) {
    console.log('⚠️ Using ENVIRONMENT VARIABLES as fallback');
    return { 
      accountSid: envAccountSid, 
      authToken: envAuthToken, 
      phoneNumber: envPhoneNumber,
      source: 'environment'
    }
  }

  console.log('❌ No complete Twilio credentials found in database or environment');
  return { 
    accountSid: null, 
    authToken: null, 
    phoneNumber: null,
    source: 'none'
  }
}
