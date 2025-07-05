import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Phone, Save, TestTube, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TwilioSettingsProps {
  userRole: string;
}

const TwilioSettings: React.FC<TwilioSettingsProps> = ({ userRole }) => {
  const [settings, setSettings] = useState({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const canEdit = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number']);

      if (error) throw error;

      if (data) {
        const settingsMap = data.reduce((acc: any, item: any) => {
          acc[item.key] = item.value;
          return acc;
        }, {});

        setSettings({
          twilioAccountSid: settingsMap.twilio_account_sid || '',
          twilioAuthToken: settingsMap.twilio_auth_token || '',
          twilioPhoneNumber: settingsMap.twilio_phone_number || ''
        });
      }
    } catch (error) {
      console.error('Failed to load Twilio settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!canEdit) return;

    setLoading(true);
    try {
      const settingsToSave = [
        { key: 'twilio_account_sid', value: settings.twilioAccountSid },
        { key: 'twilio_auth_token', value: settings.twilioAuthToken },
        { key: 'twilio_phone_number', value: settings.twilioPhoneNumber }
      ];

      const { error } = await supabase
        .from('settings')
        .upsert(settingsToSave, { onConflict: 'key' });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Twilio settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save Twilio settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testTwilio = async () => {
    if (!settings.twilioAccountSid || !settings.twilioAuthToken || !settings.twilioPhoneNumber) {
      toast({
        title: "Missing Configuration",
        description: "Please fill in all Twilio settings before testing.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke('test-sms', {
        body: {
          to: settings.twilioPhoneNumber,
          message: 'Test message from AutoVantage - Twilio integration working!'
        }
      });

      if (error) throw error;

      toast({
        title: "Test Successful",
        description: "Twilio configuration is working correctly.",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Twilio test failed. Please check your configuration.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Phone className="h-5 w-5" />
          <span>Twilio Configuration</span>
        </CardTitle>
        <CardDescription>
          Configure Twilio settings for auto-dialing and SMS functionality
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!canEdit && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to modify Twilio settings. Contact your administrator.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="accountSid">Account SID</Label>
          <Input
            id="accountSid"
            type="password"
            value={settings.twilioAccountSid}
            onChange={(e) => setSettings(prev => ({ ...prev, twilioAccountSid: e.target.value }))}
            placeholder="AC..."
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="authToken">Auth Token</Label>
          <Input
            id="authToken"
            type="password"
            value={settings.twilioAuthToken}
            onChange={(e) => setSettings(prev => ({ ...prev, twilioAuthToken: e.target.value }))}
            placeholder="••••••••••••••••••••••••••••••••"
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Twilio Phone Number</Label>
          <Input
            id="phoneNumber"
            value={settings.twilioPhoneNumber}
            onChange={(e) => setSettings(prev => ({ ...prev, twilioPhoneNumber: e.target.value }))}
            placeholder="+1234567890"
            disabled={!canEdit}
          />
        </div>

        {canEdit && (
          <div className="flex space-x-2 pt-4">
            <Button onClick={saveSettings} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            
            <Button onClick={testTwilio} disabled={testing} variant="outline">
              <TestTube className="w-4 h-4 mr-2" />
              {testing ? 'Testing...' : 'Test Configuration'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TwilioSettings;