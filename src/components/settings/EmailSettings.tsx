
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { emailService } from '@/services/emailService';
import { useToast } from '@/hooks/use-toast';
import { Mail, Save, Settings, FileText } from 'lucide-react';
import EmailTemplateManager from '../email/EmailTemplateManager';

interface EmailSettingsProps {
  userRole: string;
}

const EmailSettings = ({ userRole }: EmailSettingsProps) => {
  const [settings, setSettings] = useState({
    signature: '',
    default_from_name: '',
    default_from_email: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const emailSettings = await emailService.getEmailSettings();
      if (emailSettings) {
        setSettings({
          signature: emailSettings.signature || '',
          default_from_name: emailSettings.default_from_name || '',
          default_from_email: emailSettings.default_from_email || ''
        });
      }
    } catch (error) {
      console.error('Failed to load email settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await emailService.upsertEmailSettings({
        user_id: '', // This will be handled by the service
        ...settings
      });
      toast({
        title: "Settings saved",
        description: "Your email settings have been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save email settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Email Settings</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Templates</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Email Configuration (Postmark)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Postmark Integration</h4>
                <p className="text-sm text-blue-700">
                  This system uses Postmark for email delivery, which supports both sending and receiving emails. 
                  Make sure your Postmark server is configured with a verified sender signature.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="from_name">Default From Name</Label>
                  <Input
                    id="from_name"
                    value={settings.default_from_name}
                    onChange={(e) => setSettings(prev => ({ ...prev, default_from_name: e.target.value }))}
                    placeholder="Your Name"
                  />
                  <p className="text-xs text-gray-500">
                    This name will appear as the sender in your emails
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from_email">Default From Email</Label>
                  <Input
                    id="from_email"
                    type="email"
                    value={settings.default_from_email}
                    onChange={(e) => setSettings(prev => ({ ...prev, default_from_email: e.target.value }))}
                    placeholder="your.email@dealership.com"
                  />
                  <p className="text-xs text-gray-500">
                    Make sure this email is verified as a sender signature in Postmark
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Email Signature</Label>
                <Textarea
                  id="signature"
                  value={settings.signature}
                  onChange={(e) => setSettings(prev => ({ ...prev, signature: e.target.value }))}
                  placeholder="Best regards,&#10;Your Name&#10;Your Title&#10;Dealership Name&#10;Phone: (555) 123-4567"
                  className="min-h-[120px]"
                />
                <p className="text-xs text-gray-500">
                  This signature will be automatically added to your emails
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailSettings;
