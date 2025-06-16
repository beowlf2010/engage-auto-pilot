
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Send, AlertTriangle } from 'lucide-react';
import { emailService } from '@/services/emailService';
import { useToast } from '@/hooks/use-toast';
import EmailComposer from '../../email/EmailComposer';

interface QuickEmailActionsProps {
  leadId: string;
  leadEmail?: string;
  leadFirstName?: string;
  leadLastName?: string;
  vehicleInterest?: string;
}

const QuickEmailActions = ({
  leadId,
  leadEmail,
  leadFirstName,
  leadLastName,
  vehicleInterest
}: QuickEmailActionsProps) => {
  const [showComposer, setShowComposer] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const { toast } = useToast();

  const handleQuickTest = async () => {
    if (!testEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address for the test",
        variant: "destructive",
      });
      return;
    }

    setTestLoading(true);
    try {
      await emailService.sendEmail({
        to: testEmail,
        subject: "Email System Test",
        html: `
          <h2>Email System Test</h2>
          <p>This is a test email from your CRM system.</p>
          <p><strong>Lead:</strong> ${leadFirstName} ${leadLastName}</p>
          <p><strong>Vehicle Interest:</strong> ${vehicleInterest || 'Not specified'}</p>
          <p>If you received this email, your email integration is working!</p>
        `,
        leadId
      });
      
      toast({
        title: "Test email sent",
        description: "Check the specified email address for the test message",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Test email failed",
        description: errorMessage,
        variant: "destructive",
      });
      console.error('Test email error:', error);
    } finally {
      setTestLoading(false);
    }
  };

  const extractDomain = (email: string) => {
    return email.split('@')[1] || '';
  };

  const testEmailDomain = testEmail ? extractDomain(testEmail) : '';
  const leadEmailDomain = leadEmail ? extractDomain(leadEmail) : '';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="w-4 h-4" />
            <span>Email Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowComposer(true)}
              className="flex-1"
              disabled={!leadEmail}
            >
              <Mail className="w-4 h-4 mr-2" />
              Compose Email
            </Button>
          </div>

          {!leadEmail && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No email address found for this lead. Add an email address to send emails.
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Email Test */}
          <div className="border-t pt-4">
            <Label htmlFor="quick_test_email" className="text-sm font-medium">
              Quick Email Test
            </Label>
            <div className="space-y-2 mt-2">
              <Input
                id="quick_test_email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="text-sm"
              />
              
              {testEmail && leadEmail && testEmailDomain !== leadEmailDomain && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Domain mismatch detected. If your Postmark account is pending approval, 
                    try using an email with the same domain as your configured sender address.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={handleQuickTest}
                disabled={testLoading || !testEmail}
                size="sm"
                className="w-full"
              >
                {testLoading ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="w-3 h-3 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <EmailComposer
        open={showComposer}
        onOpenChange={setShowComposer}
        leadId={leadId}
        leadEmail={leadEmail}
        leadFirstName={leadFirstName}
        leadLastName={leadLastName}
        vehicleInterest={vehicleInterest}
      />
    </>
  );
};

export default QuickEmailActions;
