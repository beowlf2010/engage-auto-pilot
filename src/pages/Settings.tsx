import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Key, Phone, MessageSquare, Shield } from "lucide-react";

interface Setting {
  key: string;
  value: string;
  description: string;
}

const Settings = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  const settingsConfig = [
    {
      key: 'OPENAI_API_KEY',
      label: 'OpenAI API Key',
      icon: MessageSquare,
      description: 'Required for AI message generation',
      type: 'password',
      link: 'https://platform.openai.com/api-keys'
    },
    {
      key: 'TWILIO_ACCOUNT_SID',
      label: 'Twilio Account SID',
      icon: Phone,
      description: 'Your Twilio Account SID for SMS sending',
      type: 'text',
      link: 'https://console.twilio.com/'
    },
    {
      key: 'TWILIO_AUTH_TOKEN',
      label: 'Twilio Auth Token',
      icon: Shield,
      description: 'Your Twilio Auth Token for SMS sending',
      type: 'password',
      link: 'https://console.twilio.com/'
    },
    {
      key: 'TWILIO_PHONE_NUMBER',
      label: 'Twilio Phone Number',
      icon: Phone,
      description: 'Your Twilio phone number (e.g., +15551234567)',
      type: 'text',
      link: 'https://console.twilio.com/us1/develop/phone-numbers/manage/incoming'
    }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value, description')
        .in('key', settingsConfig.map(s => s.key));

      if (error) throw error;

      // Ensure all required settings exist
      const existingKeys = data?.map(s => s.key) || [];
      const allSettings = settingsConfig.map(config => {
        const existing = data?.find(s => s.key === config.key);
        return existing || { key: config.key, value: '', description: config.description };
      });

      setSettings(allSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.key === key ? { ...setting, value } : setting
      )
    );
  };

  const saveSetting = async (setting: Setting) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: setting.key,
          value: setting.value,
          description: setting.description
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${setting.key} updated successfully`,
      });
    } catch (error) {
      console.error('Error saving setting:', error);
      toast({
        title: "Error",
        description: `Failed to save ${setting.key}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAllSettings = async () => {
    setSaving(true);
    try {
      const updates = settings.map(setting => ({
        key: setting.key,
        value: setting.value,
        description: setting.description
      }));

      const { error } = await supabase
        .from('settings')
        .upsert(updates);

      if (error) throw error;

      toast({
        title: "Success",
        description: "All settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your API keys and credentials for SMS and AI functionality.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Enter your API keys and credentials to enable SMS and AI features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsConfig.map((config, index) => {
            const setting = settings.find(s => s.key === config.key);
            const Icon = config.icon;

            return (
              <div key={config.key}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor={config.key} className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                      <a 
                        href={config.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Get your {config.label} →
                      </a>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => setting && saveSetting(setting)}
                      disabled={saving || !setting?.value}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                  
                  <Input
                    id={config.key}
                    type={config.type}
                    value={setting?.value || ''}
                    onChange={(e) => updateSetting(config.key, e.target.value)}
                    placeholder={`Enter your ${config.label}`}
                    className="font-mono"
                  />
                </div>
                
                {index < settingsConfig.length - 1 && <Separator className="mt-6" />}
              </div>
            );
          })}

          <Separator />
          
          <div className="flex justify-end">
            <Button 
              onClick={saveAllSettings}
              disabled={saving}
              size="lg"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save All Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;