
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PhoneNumberDisplay from '@/components/PhoneNumberDisplay';
import { PhoneNumber } from '@/types/lead';

interface QuickContactCardProps {
  phoneNumbers: PhoneNumber[];
  primaryPhone: string;
  onPhoneSelect: (phoneNumber: string) => void;
}

const QuickContactCard = ({ phoneNumbers, primaryPhone, onPhoneSelect }: QuickContactCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Contact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <PhoneNumberDisplay
          phoneNumbers={phoneNumbers}
          primaryPhone={primaryPhone}
          onPhoneSelect={onPhoneSelect}
          compact={true}
        />
      </CardContent>
    </Card>
  );
};

export default QuickContactCard;
