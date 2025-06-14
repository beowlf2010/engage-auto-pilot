
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface TelnyxProfileFieldProps {
  value: string;
  isLoading: boolean;
  isTesting: boolean;
  onChange: (value: string) => void;
  onUpdate: () => void;
  onTest: () => void;
}

const TelnyxProfileField = ({
  value,
  isLoading,
  isTesting,
  onChange,
  onUpdate,
  onTest
}: TelnyxProfileFieldProps) => {
  return (
    <div>
      <Label htmlFor="telnyx_profile">Telnyx Messaging Profile ID</Label>
      <div className="flex space-x-2 mt-1">
        <Input 
          id="telnyx_profile"
          placeholder="12345678-1234-1234-1234-123456789012" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={onUpdate}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
          </Button>
          <Button 
            variant="outline" 
            onClick={onTest}
            disabled={isTesting}
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-1">Messaging profile ID from your Telnyx account</p>
    </div>
  );
};

export default TelnyxProfileField;
