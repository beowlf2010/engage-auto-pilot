
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone } from 'lucide-react';

interface PhoneNumber {
  id: string;
  number: string;
  type: string;
  is_primary: boolean;
}

interface LeadContactCardProps {
  phoneNumbers: PhoneNumber[];
  email?: string;
  status: string;
  source: string;
}

const LeadContactCard: React.FC<LeadContactCardProps> = ({ 
  phoneNumbers, 
  email, 
  status, 
  source 
}) => {
  const getPrimaryPhone = () => {
    return phoneNumbers?.find(p => p.is_primary)?.number || 
           phoneNumbers?.[0]?.number || 
           'No phone number';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'new': 'default',
      'engaged': 'secondary',
      'paused': 'outline',
      'closed': 'secondary',
      'lost': 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <span className="text-sm font-medium">Primary Phone:</span>
          <span className="ml-2">{getPrimaryPhone()}</span>
          {phoneNumbers.length > 1 && (
            <Badge variant="outline" className="ml-2 text-xs">
              +{phoneNumbers.length - 1} more
            </Badge>
          )}
        </div>
        {email && (
          <div>
            <span className="text-sm font-medium">Email:</span>
            <span className="ml-2">{email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-sm font-medium">Status:</span>
          {getStatusBadge(status)}
          <span className="text-sm font-medium ml-2">Source:</span>
          <Badge variant="outline">{source}</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadContactCard;
