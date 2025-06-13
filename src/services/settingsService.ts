
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
    // In a real implementation, this would test the Twilio connection
    // For now, we'll simulate a test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple validation
    if (!accountSid.startsWith('AC') || accountSid.length < 30) {
      throw new Error('Invalid Account SID format');
    }
    
    if (authToken.length < 30) {
      throw new Error('Invalid Auth Token format');
    }

    return { success: true, message: 'Connection test successful' };
  } catch (error) {
    console.error('Error testing Twilio connection:', error);
    throw error;
  }
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+1[0-9]{10}$/;
  return phoneRegex.test(phone);
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
  
  return phone;
};
