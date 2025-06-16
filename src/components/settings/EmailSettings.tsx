
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { emailService } from '@/services/emailService';
import { useToast } from '@/hooks/use-toast';
import { Mail, Save, Settings, FileText, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
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
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
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

  const handleTestEmail = async () => {
    if (!testEmail || !settings.default_from_email) {
      toast({
        title: "Missing information",
        description: "Please configure your default from email and enter a test email address",
        variant: "destructive",
      });
      return;
    }

    setTestEmailLoading(true);
    try {
      await emailService.sendEmail({
        to: testEmail,
        subject: "Postmark Test Email",
        html: `
          <h2>Email Configuration Test</h2>
          <p>This is a test email to verify your Postmark configuration.</p>
          <p><strong>From:</strong> ${settings.default_from_name} &lt;${settings.default_from_email}&gt;</p>
          <p><strong>To:</strong> ${testEmail}</p>
          <p>If you received this email, your Postmark integration is working correctly!</p>
          <hr>
          ${settings.signature ? `<div style="margin-top: 20px;">${settings.signature.replace(/\n/g, '<br>')}</div>` : ''}
        `,
      });
      
      toast({
        title: "Test email sent",
        description: "Check your inbox for the test email",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Test email failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const extractDomain = (email: string) => {
    return email.split('@')[1] || '';
  };

  const testEmailDomain = testEmail ? extractDomain(testEmail) : '';
  const fromEmailDomain = settings.default_from_email ? extractDomain(settings.default_from_email) : '';
  const domainMismatch = testEmail && settings.default_from_email && testEmailDomain !== fromEmailDomain;

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
          <div className="space-y-6">
            {/* Postmark Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Postmark Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Postmark Integration Active:</strong> This system uses Postmark for reliable email delivery. 
                    Make sure your account is approved and sender signatures are verified.
                    <Button 
                      variant="link" 
                      className="h-auto p-0 ml-2" 
                      onClick={() => window.open('https://account.postmarkapp.com/servers', '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Postmark Dashboard
                    </Button>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="from_name">Default From Name</Label>
                    <Input
                      id="from_name"
                      value={settings.default_from_name}
                      onChange={(e) => setSettings(prev => ({ ...prev, default_from_name: e.target.value }))}
                      placeholder="Your Name or Business Name"
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
                      placeholder="noreply@yourdomain.com"
                    />
                    <p className="text-xs text-gray-500">
                      <strong>Important:</strong> This email must be verified in Postmark as a sender signature
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signature">Email Signature</Label>
                  <Textarea
                    id="signature"
                    value={settings.signature}
                    onChange={(e) => setSettings(prev => ({ ...prev, signature: e.target.value }))}
                    placeholder="Best regards,&#10;Your Name&#10;Your Title&#10;Company Name&#10;Phone: (555) 123-4567"
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

            {/* Email Testing Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Test Email Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!settings.default_from_email && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Please configure your default from email address before testing.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="test_email">Test Email Address</Label>
                  <Input
                    id="test_email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                  />
                </div>

                {domainMismatch && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Domain Mismatch Warning:</strong> Your test email domain ({testEmailDomain}) 
                      doesn't match your from email domain ({fromEmailDomain}). 
                      If your Postmark account is pending approval, this test may fail. 
                      Try using an email address with the same domain as your from address.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleTestEmail} 
                    disabled={testEmailLoading || !settings.default_from_email || !testEmail}
                    className="flex-1"
                  >
                    {testEmailLoading ? (
                      <>Sending Test...</>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Test Email
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Note:</strong> If your Postmark account is pending approval:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Test emails must be sent to the same domain as your from address</li>
                    <li>Check your Postmark account status in the dashboard</li>
                    <li>Verify your sender signatures are confirmed</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailSettings;
