
import React, { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LegalLinks } from "./LegalLinks";

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
}

export const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  checked,
  onChange,
  required = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [consentText, setConsentText] = useState(
    "I agree to receive texts and emails about vehicle offers. I can reply STOP to opt out."
  );

  useEffect(() => {
    // Optionally fetch dynamic consent copy from DB (future)
    // setConsentText(...)
  }, []);

  return (
    <div className="flex flex-col gap-2 my-2">
      <div className="flex items-start gap-2">
        <Checkbox checked={checked} onCheckedChange={onChange} required={required} />
        <Label className="text-sm leading-tight">
          {consentText}
          <span> </span>
          <LegalLinks />
        </Label>
      </div>
      {required && !checked && (
        <span className="text-xs text-red-500">Consent is required for follow-ups.</span>
      )}
    </div>
  );
};

export default ConsentCheckbox;
