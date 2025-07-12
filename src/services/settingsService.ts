
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
// Direct SMS test function to isolate the issue
export const testDirectSMS = async () => {
  try {
    console.log('📱 [testDirectSMS] Testing direct SMS sending with enhanced debugging...');
    
    // Test with a more realistic phone number format
    const testPayload = {
      to: '+12345678900', // Changed to a more standard test format
      body: 'Test SMS from CRM system - Enhanced debugging',
      conversationId: null
    };
    
    console.log('📱 [testDirectSMS] Enhanced payload:', testPayload);
    
    const startTime = Date.now();
    const response = await supabase.functions.invoke('send-sms', {
      body: testPayload
    });
    const duration = Date.now() - startTime;
    
    console.log('📱 [testDirectSMS] Function invoke completed in:', duration, 'ms');
    console.log('📱 [testDirectSMS] Full response object:', response);
    
    // Check if we got data or error
    if (response.error) {
      console.error('❌ [testDirectSMS] Supabase invoke error:', {
        message: response.error.message,
        details: response.error.details,
        hint: response.error.hint,
        code: response.error.code,
        status: response.error.status,
        context: response.error.context
      });
      
      // Log the actual response body if available
      if (response.error.context?.res?.body) {
        console.error('❌ [testDirectSMS] Response body:', response.error.context.res.body);
      }
      
      return {
        success: false,
        error: response.error.message || 'Edge Function invocation failed',
        details: response.error
      };
    }
    
    if (response.data) {
      console.log('✅ [testDirectSMS] Success! Response data:', response.data);
      return response.data;
    }
    
    // Handle case where no error but also no data
    console.warn('⚠️ [testDirectSMS] No error but also no data received');
    return {
      success: false,
      error: 'No data received from Edge Function',
      rawResponse: response
    };
    
  } catch (error) {
    console.error('❌ [testDirectSMS] Caught error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: error
    });
    
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error
    };
  }
};

// Test simple edge function to isolate issues
export const testSimpleFunction = async () => {
  try {
    console.log('🧪 [testSimpleFunction] Testing simple edge function');
    
    const testPayload = {
      test: 'data',
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 [testSimpleFunction] Payload:', testPayload);
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('test-simple', {
      body: testPayload
    });
    const duration = Date.now() - startTime;
    
    console.log('🧪 [testSimpleFunction] Function invoke completed in:', duration, 'ms');
    console.log('🧪 [testSimpleFunction] Raw response data:', data);
    console.log('🧪 [testSimpleFunction] Raw response error:', error);

    if (error) {
      console.error('❌ [testSimpleFunction] Supabase function error:', error);
      throw error;
    }

    console.log('✅ [testSimpleFunction] Success! Response data:', data);
    return data;
  } catch (error) {
    console.error('❌ [testSimpleFunction] Caught error:', error);
    throw error;
  }
};

export const testAIAutomation = async () => {
  try {
    console.log('🤖 [testAIAutomation] Starting manual AI automation test');
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('ai-automation', {
      body: { 
        source: 'manual_test',
        priority: 'normal',
        enhanced: true 
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

// Test function-to-function SMS communication
export const testFunctionCommunication = async () => {
  try {
    console.log('🧪 [testFunctionCommunication] Testing function-to-function SMS communication');
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('ai-automation', {
      body: { 
        test_endpoint: 'test-sms-communication'
      }
    });
    const duration = Date.now() - startTime;
    
    console.log('🧪 [testFunctionCommunication] Function invoke completed in:', duration, 'ms');
    console.log('🧪 [testFunctionCommunication] Raw response data:', data);
    console.log('🧪 [testFunctionCommunication] Raw response error:', error);

    if (error) {
      console.error('❌ [testFunctionCommunication] Supabase function error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status: error.status
      });
      return {
        success: false,
        error: error.message,
        details: error
      };
    }

    console.log('✅ [testFunctionCommunication] Success! Response data:', data);
    return data;
  } catch (error) {
    console.error('❌ [testFunctionCommunication] Caught error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: error
    });
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
};

// Debug AI automation step by step
export const debugAIAutomation = async () => {
  try {
    console.log('🔍 [debugAIAutomation] Starting step-by-step debugging');
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('debug-ai-automation', {
      body: {}
    });
    const duration = Date.now() - startTime;
    
    console.log('🔍 [debugAIAutomation] Function invoke completed in:', duration, 'ms');
    console.log('🔍 [debugAIAutomation] Raw response data:', data);
    console.log('🔍 [debugAIAutomation] Raw response error:', error);

    if (error) {
      console.error('❌ [debugAIAutomation] Supabase function error:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }

    console.log('✅ [debugAIAutomation] Debug completed:', data);
    return data;
  } catch (error) {
    console.error('❌ [debugAIAutomation] Caught error:', error);
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
};

// Test the AI conversation function directly
export const testAIConversation = async () => {
  console.log('🔧 [DEBUG] Starting direct AI conversation test...');
  
  try {
    const { data, error } = await supabase.functions.invoke('test-ai-conversation', {
      body: { test: true }
    });

    console.log('🔧 [DEBUG] AI conversation test response:', { data, error });
    
    if (error) {
      console.error('🔧 [DEBUG] AI conversation test failed:', error);
      return { success: false, error: error.message, details: error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('🔧 [DEBUG] Critical error in AI conversation test:', error);
    return { success: false, error: error.message, stack: error.stack };
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
