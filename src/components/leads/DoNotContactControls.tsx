
import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PhoneOff, MailX, MessageSquareOff } from "lucide-react";
import { Lead } from "@/types/lead";

interface DoNotContactControlsProps {
  lead: Lead;
  onDoNotContactChange?: (leadId: string, field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => void;
  canEdit: boolean;
  size?: 'sm' | 'md';
}

const DoNotContactControls = ({ 
  lead, 
  onDoNotContactChange, 
  canEdit, 
  size = 'md' 
}: DoNotContactControlsProps) => {
  const hasRestrictions = lead.doNotCall || lead.doNotEmail || lead.doNotMail;

  if (!canEdit && !hasRestrictions) {
    return null;
  }

  if (!canEdit && hasRestrictions) {
    return (
      <div className="flex items-center gap-1">
        {lead.doNotCall && <PhoneOff className="w-3 h-3 text-red-500" />}
        {lead.doNotEmail && <MailX className="w-3 h-3 text-red-500" />}
        {lead.doNotMail && <MessageSquareOff className="w-3 h-3 text-red-500" />}
      </div>
    );
  }

  if (!canEdit) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant={hasRestrictions ? "destructive" : "outline"} 
          size={size === 'sm' ? 'sm' : 'default'}
          className={size === 'sm' ? 'h-8 w-8 p-0' : ''}
        >
          {hasRestrictions ? (
            <div className="flex items-center gap-1">
              {size === 'md' && 'DNC'}
              {lead.doNotCall && <PhoneOff className="w-3 h-3" />}
              {lead.doNotEmail && <MailX className="w-3 h-3" />}
              {lead.doNotMail && <MessageSquareOff className="w-3 h-3" />}
            </div>
          ) : (
            size === 'sm' ? <PhoneOff className="w-4 h-4" /> : 'DNC'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Contact Restrictions</h4>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="doNotCall"
                checked={lead.doNotCall}
                onCheckedChange={(checked) => 
                  onDoNotContactChange?.(lead.id.toString(), 'doNotCall', checked as boolean)
                }
              />
              <label htmlFor="doNotCall" className="text-sm flex items-center gap-2">
                <PhoneOff className="w-4 h-4" />
                Do not call
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="doNotEmail"
                checked={lead.doNotEmail}
                onCheckedChange={(checked) => 
                  onDoNotContactChange?.(lead.id.toString(), 'doNotEmail', checked as boolean)
                }
              />
              <label htmlFor="doNotEmail" className="text-sm flex items-center gap-2">
                <MailX className="w-4 h-4" />
                Do not email
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="doNotMail"
                checked={lead.doNotMail}
                onCheckedChange={(checked) => 
                  onDoNotContactChange?.(lead.id.toString(), 'doNotMail', checked as boolean)
                }
              />
              <label htmlFor="doNotMail" className="text-sm flex items-center gap-2">
                <MessageSquareOff className="w-4 h-4" />
                Do not mail
              </label>
            </div>
          </div>
          
          {hasRestrictions && (
            <div className="pt-2 border-t">
              <Badge variant="destructive" className="text-xs">
                Contact restrictions active
              </Badge>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DoNotContactControls;
