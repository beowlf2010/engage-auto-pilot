import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Phone, Save, TestTube, AlertCircle, Activity, Shield, Bell, Trash2 } from 'lucide-react';
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
  const [monitoringSettings, setMonitoringSettings] = useState({
    monitoring_enabled: true,
    check_interval_minutes: 15,
    failure_threshold: 0.5,
    alert_phone_numbers: [],
    alert_emails: []
  });
  const [healthLogs, setHealthLogs] = useState([]);
  const [currentStatus, setCurrentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [newAlertPhone, setNewAlertPhone] = useState('');
  const { toast } = useToast();

  const canEdit = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    loadSettings();
    loadMonitoringSettings();
    loadHealthStatus();
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

  const loadMonitoringSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('twilio_monitoring_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setMonitoringSettings(data);
      }
    } catch (error) {
      console.error('Failed to load monitoring settings:', error);
    }
  };

  const loadHealthStatus = async () => {
    try {
      // Get latest health logs
      const { data: logs, error: logsError } = await supabase
        .from('twilio_health_logs')
        .select('*')
        .order('check_timestamp', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;

      setHealthLogs(logs || []);
      
      // Set current status from most recent log
      if (logs && logs.length > 0) {
        setCurrentStatus(logs[0]);
      }
    } catch (error) {
      console.error('Failed to load health status:', error);
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

      // Trigger immediate health check
      await triggerHealthCheck();
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

  const saveMonitoringSettings = async () => {
    if (!canEdit) return;

    try {
      const { error } = await supabase
        .from('twilio_monitoring_settings')
        .upsert([monitoringSettings], { onConflict: 'id' });

      if (error) throw error;

      toast({
        title: "Monitoring Settings Saved",
        description: "Twilio monitoring configuration updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save monitoring settings.",
        variant: "destructive",
      });
    }
  };

  const triggerHealthCheck = async () => {
    try {
      await supabase.functions.invoke('twilio-health-monitor');
      setTimeout(() => loadHealthStatus(), 2000); // Refresh status after check
    } catch (error) {
      console.error('Failed to trigger health check:', error);
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

      // Refresh health status after test
      setTimeout(() => loadHealthStatus(), 1000);
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

  const addAlertPhone = () => {
    if (newAlertPhone && !monitoringSettings.alert_phone_numbers.includes(newAlertPhone)) {
      setMonitoringSettings(prev => ({
        ...prev,
        alert_phone_numbers: [...prev.alert_phone_numbers, newAlertPhone]
      }));
      setNewAlertPhone('');
    }
  };

  const removeAlertPhone = (phone: string) => {
    setMonitoringSettings(prev => ({
      ...prev,
      alert_phone_numbers: prev.alert_phone_numbers.filter(p => p !== phone)
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      healthy: { variant: 'default', text: 'Healthy', className: 'bg-green-500' },
      api_error: { variant: 'destructive', text: 'API Error', className: 'bg-red-500' },
      credentials_missing: { variant: 'destructive', text: 'No Credentials', className: 'bg-red-500' },
      credentials_invalid: { variant: 'destructive', text: 'Invalid Credentials', className: 'bg-red-500' },
      connection_error: { variant: 'destructive', text: 'Connection Error', className: 'bg-orange-500' },
      unknown: { variant: 'secondary', text: 'Unknown', className: 'bg-gray-500' }
    };

    const config = statusMap[status] || statusMap.unknown;
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5" />
              <span>Twilio Configuration</span>
            </div>
            {currentStatus && (
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                {getStatusBadge(currentStatus.api_status)}
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Configure Twilio settings for SMS functionality with automated monitoring
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="health">Health Status</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
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
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Monitoring Configuration</span>
              </CardTitle>
              <CardDescription>
                Set up automated health monitoring and failure alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Monitoring</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically check Twilio API health every {monitoringSettings.check_interval_minutes} minutes
                  </p>
                </div>
                <Switch
                  checked={monitoringSettings.monitoring_enabled}
                  onCheckedChange={(checked) => 
                    setMonitoringSettings(prev => ({ ...prev, monitoring_enabled: checked }))
                  }
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label>Failure Threshold (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={monitoringSettings.failure_threshold}
                  onChange={(e) => 
                    setMonitoringSettings(prev => ({ 
                      ...prev, 
                      failure_threshold: parseFloat(e.target.value) 
                    }))
                  }
                  placeholder="0.5"
                  disabled={!canEdit}
                />
                <p className="text-sm text-muted-foreground">
                  Send alerts when success rate falls below this threshold (0.0 - 1.0)
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <Label>Alert Phone Numbers</Label>
                </div>
                
                <div className="flex space-x-2">
                  <Input
                    placeholder="+1234567890"
                    value={newAlertPhone}
                    onChange={(e) => setNewAlertPhone(e.target.value)}
                    disabled={!canEdit}
                  />
                  <Button onClick={addAlertPhone} disabled={!canEdit || !newAlertPhone}>
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {monitoringSettings.alert_phone_numbers.map((phone, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span>{phone}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAlertPhone(phone)}
                        disabled={!canEdit}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {canEdit && (
                <Button onClick={saveMonitoringSettings}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Monitoring Settings
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>API Health Status</span>
                </div>
                <Button onClick={triggerHealthCheck} size="sm" disabled={!canEdit}>
                  Check Now
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStatus && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Current Status</Label>
                    {getStatusBadge(currentStatus.api_status)}
                  </div>
                  <div className="space-y-2">
                    <Label>Response Time</Label>
                    <p className="text-sm">{currentStatus.response_time_ms || 'N/A'}ms</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Last Check</Label>
                    <p className="text-sm">
                      {new Date(currentStatus.check_timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {currentStatus?.error_message && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {currentStatus.error_message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Recent Health Checks</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {healthLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(log.api_status)}
                        <span className="text-sm">
                          {new Date(log.check_timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.response_time_ms}ms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TwilioSettings;