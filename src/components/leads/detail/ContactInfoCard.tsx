
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Mail, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PhoneNumberDisplay from '@/components/PhoneNumberDisplay';
import { LeadDetailData } from '@/services/leadDetailService';
import { PhoneNumber } from '@/types/lead';

interface ContactInfoCardProps {
  lead: LeadDetailData;
  phoneNumbers: PhoneNumber[];
  primaryPhone: string;
  onPhoneSelect: (phone: string) => void;
}

const ContactInfoCard = ({ lead, phoneNumbers, primaryPhone, onPhoneSelect }: ContactInfoCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="w-5 h-5 mr-2" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-3">Phone Numbers</h4>
          <PhoneNumberDisplay
            phoneNumbers={phoneNumbers}
            primaryPhone={primaryPhone}
            onPhoneSelect={onPhoneSelect}
            compact={false}
            leadId={lead.id}
            leadName={`${lead.firstName} ${lead.lastName}`}
          />
        </div>
        <Separator />
        {(lead.email || lead.emailAlt) && (
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Email</h4>
            <div className="space-y-1">
              {lead.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{lead.email}</span>
                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                </div>
              )}
              {lead.emailAlt && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{lead.emailAlt}</span>
                  <Badge variant="outline" className="text-xs">Alt</Badge>
                </div>
              )}
            </div>
          </div>
        )}
        {(lead.address || lead.city || lead.state) && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Address</h4>
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                <div>
                  {lead.address && <div>{lead.address}</div>}
                  <div>
                    {lead.city && lead.city}
                    {lead.city && lead.state && ', '}
                    {lead.state} {lead.postalCode}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactInfoCard;
