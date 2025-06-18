
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
    const { data, error } = await supabase.functions.invoke('test-sms', {
      body: { testPhoneNumber }
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending test SMS:', error);
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
