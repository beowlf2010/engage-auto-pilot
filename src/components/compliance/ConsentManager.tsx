
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentCheckbox } from "./ConsentCheckbox";
import { useCompliance } from "@/hooks/useCompliance";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "@/hooks/use-toast";
import { Shield, MessageSquare } from "lucide-react";

interface ConsentManagerProps {
  leadId: string;
  leadName: string;
  phoneNumber: string;
  onConsentGranted: () => void;
}

export const ConsentManager: React.FC<ConsentManagerProps> = ({
  leadId,
  leadName,
  phoneNumber,
  onConsentGranted
}) => {
  const [consentChecked, setConsentChecked] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { storeConsent } = useCompliance();
  const { profile } = useAuth();

  const handleRecordConsent = async () => {
    if (!consentChecked) return;

    setIsRecording(true);
    try {
      await storeConsent({
        leadId,
        channel: "sms",
        method: "manual_entry",
        consentText: `I agree to receive text messages about vehicle offers at ${phoneNumber}. I can reply STOP to opt out.`,
        capturedBy: profile?.id || null,
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      toast({
        title: "Consent recorded",
        description: "SMS consent has been recorded successfully. You can now send messages.",
      });
      
      onConsentGranted();
    } catch (error) {
      toast({
        title: "Failed to record consent",
        description: "There was an error recording consent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Shield className="w-5 h-5" />
          SMS Consent Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-700">
          Before sending messages to <strong>{leadName}</strong> at <strong>{phoneNumber}</strong>, 
          you need to record their SMS consent for compliance purposes.
        </p>
        
        <ConsentCheckbox
          checked={consentChecked}
          onChange={setConsentChecked}
          required={true}
        />
        
        <Button
          onClick={handleRecordConsent}
          disabled={!consentChecked || isRecording}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {isRecording ? "Recording Consent..." : "Record Consent & Enable Messaging"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConsentManager;
