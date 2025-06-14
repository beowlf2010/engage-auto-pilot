
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SettingsUpdateRequest {
  settingType: string;
  value: string;
}

export const updateTelnyxSettings = async (settingType: string, value: string) => {
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

export const testTelnyxConnection = async (apiKey: string, messagingProfileId: string) => {
  try {
    // Test the Telnyx connection by making a simple API call
    const response = await fetch('https://api.telnyx.com/v2/messaging_profiles', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.detail || 'Invalid Telnyx credentials');
    }

    const data = await response.json();
    const profileExists = data.data?.some((profile: any) => profile.id === messagingProfileId);
    
    if (!profileExists) {
      throw new Error('Messaging Profile ID not found in your Telnyx account');
    }

    return { success: true, message: 'Telnyx connection test successful' };
  } catch (error) {
    console.error('Error testing Telnyx connection:', error);
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
