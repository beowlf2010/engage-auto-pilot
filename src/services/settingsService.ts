
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SettingsUpdateRequest {
  settingType: string;
  value: string;
}

export const updateTwilioSettings = async (settingType: string, value: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('update-settings', {
      body: { settingType, value }
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

export const testTwilioConnection = async (accountSid: string, authToken: string) => {
  try {
    // Test the Twilio connection by making a simple API call
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Invalid Twilio credentials');
    }

    const data = await response.json();
    
    if (data.status !== 'active') {
      throw new Error('Twilio account is not active');
    }

    return { success: true, message: 'Twilio connection test successful' };
  } catch (error) {
    console.error('Error testing Twilio connection:', error);
    throw error;
  }
};

export const sendTestSMS = async (testPhoneNumber: string) => {
  try {
    console.log('🔍 [sendTestSMS] Starting test SMS with phone:', testPhoneNumber);
    
    // Format the phone number first
    const formattedPhone = formatPhoneNumber(testPhoneNumber);
    console.log('🔍 [sendTestSMS] Formatted phone:', formattedPhone);
    
    // Validate the phone number
    const isValid = validatePhoneNumber(formattedPhone);
    console.log('🔍 [sendTestSMS] Phone validation result:', isValid);
    
    if (!isValid) {
      throw new Error(`Invalid phone number format: ${formattedPhone}`);
    }

    const payload = { 
      to: formattedPhone, 
      message: 'Test SMS from your CRM system. If you received this, your Twilio configuration is working correctly!' 
    };
    console.log('🔍 [sendTestSMS] Calling supabase.functions.invoke with payload:', payload);
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('test-sms', {
      body: payload
    });
    const duration = Date.now() - startTime;
    
    console.log('🔍 [sendTestSMS] Function invoke completed in:', duration, 'ms');
    console.log('🔍 [sendTestSMS] Raw response data:', data);
    console.log('🔍 [sendTestSMS] Raw response error:', error);

    if (error) {
      console.error('❌ [sendTestSMS] Supabase function error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status: error.status
      });
      throw error;
    }

    console.log('✅ [sendTestSMS] Success! Response data:', data);
    return data;
  } catch (error) {
    console.error('❌ [sendTestSMS] Caught error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: error
    });
    throw error;
  }
};

// Add manual AI automation test function
export const testAIAutomation = async () => {
  try {
    console.log('🤖 [testAIAutomation] Starting manual AI automation test');
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('ai-automation', {
      body: { 
        source: 'manual_test',
        priority: 'normal',
        enhanced: false 
      }
    });
    const duration = Date.now() - startTime;
    
    console.log('🤖 [testAIAutomation] Function invoke completed in:', duration, 'ms');
    console.log('🤖 [testAIAutomation] Raw response data:', data);
    console.log('🤖 [testAIAutomation] Raw response error:', error);

    if (error) {
      console.error('❌ [testAIAutomation] Supabase function error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status: error.status
      });
      throw error;
    }

    console.log('✅ [testAIAutomation] Success! Response data:', data);
    return data;
  } catch (error) {
    console.error('❌ [testAIAutomation] Caught error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: error
    });
    throw error;
  }
};

export const validatePhoneNumber = (phone: string): boolean => {
  // More flexible validation
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle 10-digit numbers - add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Handle 11-digit numbers starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If already formatted with +, keep it
  if (phone.startsWith('+')) {
    return phone;
  }
  
  return phone;
};
