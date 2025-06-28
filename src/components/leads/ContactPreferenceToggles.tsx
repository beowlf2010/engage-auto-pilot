
import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PhoneOff, MailX, FileX } from "lucide-react";
import { Lead } from "@/types/lead";

interface ContactPreferenceTogglesProps {
  lead: Lead;
  onDoNotContactChange?: (leadId: string, field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => void;
  canEdit: boolean;
}

const ContactPreferenceToggles: React.FC<ContactPreferenceTogglesProps> = ({
  lead,
  onDoNotContactChange,
  canEdit
}) => {
  const handleToggle = (field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => {
    if (onDoNotContactChange && canEdit) {
      onDoNotContactChange(lead.id, field, value);
    }
  };

  return (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center space-x-1">
        <PhoneOff className="w-3 h-3 text-gray-400" />
        <Switch
          checked={lead.doNotCall || false}
          onCheckedChange={(checked) => handleToggle('doNotCall', checked)}
          disabled={!canEdit}
          className="scale-75"
        />
      </div>
      
      <div className="flex items-center space-x-1">
        <MailX className="w-3 h-3 text-gray-400" />
        <Switch
          checked={lead.doNotEmail || false}
          onCheckedChange={(checked) => handleToggle('doNotEmail', checked)}
          disabled={!canEdit}
          className="scale-75"
        />
      </div>
      
      <div className="flex items-center space-x-1">
        <FileX className="w-3 h-3 text-gray-400" />
        <Switch
          checked={lead.doNotMail || false}
          onCheckedChange={(checked) => handleToggle('doNotMail', checked)}
          disabled={!canEdit}
          className="scale-75"
        />
      </div>
      
      {(lead.doNotCall || lead.doNotEmail || lead.doNotMail) && (
        <Badge variant="outline" className="text-xs mt-1">
          DNC
        </Badge>
      )}
    </div>
  );
};

export default ContactPreferenceToggles;
