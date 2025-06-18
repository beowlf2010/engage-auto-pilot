
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, TestTube } from "lucide-react";

interface TwilioAccountSidFieldProps {
  value: string;
  isLoading: boolean;
  isTesting: boolean;
  onChange: (value: string) => void;
  onUpdate: () => void;
  onTest: () => void;
}

const TwilioAccountSidField = ({
  value,
  isLoading,
  isTesting,
  onChange,
  onUpdate,
  onTest
}: TwilioAccountSidFieldProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="twilio_account_sid">Twilio Account SID</Label>
      <div className="flex space-x-2">
        <Input
          id="twilio_account_sid"
          type="text"
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={onUpdate}
          disabled={!value.trim() || isLoading}
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save"
          )}
        </Button>
        <Button
          onClick={onTest}
          disabled={!value.trim() || isTesting}
          variant="outline"
          size="sm"
        >
          {isTesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <TestTube className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-sm text-slate-600">
        Your Twilio Account SID for SMS services
      </p>
    </div>
  );
};

export default TwilioAccountSidField;
