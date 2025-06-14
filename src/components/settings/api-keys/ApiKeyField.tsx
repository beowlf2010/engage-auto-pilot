
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ApiKeyFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  type?: string;
  description: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onUpdate: () => void;
}

const ApiKeyField = ({
  id,
  label,
  placeholder,
  value,
  type = "password",
  description,
  isLoading,
  onChange,
  onUpdate
}: ApiKeyFieldProps) => {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex space-x-2 mt-1">
        <Input 
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        <Button 
          variant="outline"
          onClick={onUpdate}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
        </Button>
      </div>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
};

export default ApiKeyField;
