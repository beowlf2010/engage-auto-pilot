
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const WebhookConfiguration = () => {
  const { toast } = useToast();
  const webhookUrl = 'https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/twilio-webhook';

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Webhook URL copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the URL",
        variant: "destructive"
      });
    }
  };

  const openTwilioConsole = () => {
    window.open('https://console.twilio.com/us1/develop/phone-numbers/manage/incoming', '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Webhook Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Twilio Webhook URL</h3>
          <p className="text-sm text-blue-800 mb-3">
            Configure this URL in your Twilio console to receive incoming SMS messages:
          </p>
          
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(webhookUrl)}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Setup Instructions:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Go to your Twilio Console → Phone Numbers → Manage → Active numbers</li>
            <li>Select the phone number you want to configure</li>
            <li>In the "Messaging" section, set the webhook URL above</li>
            <li>Set the HTTP method to "POST"</li>
            <li>Save the configuration</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <Button onClick={openTwilioConsole} className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Open Twilio Console
          </Button>
        </div>

        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>Important:</strong> Make sure your Twilio phone number is configured to send webhooks to the URL above. 
              Without this, incoming messages won't be processed by the system.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookConfiguration;
