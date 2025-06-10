
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneCall } from "lucide-react";
import { PhoneNumber } from "@/types/lead";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";

interface PhoneNumberDisplayProps {
  phoneNumbers: PhoneNumber[];
  primaryPhone: string;
  onPhoneSelect?: (phone: string) => void;
  compact?: boolean;
}

const PhoneNumberDisplay = ({ 
  phoneNumbers, 
  primaryPhone, 
  onPhoneSelect,
  compact = false 
}: PhoneNumberDisplayProps) => {
  const getPhoneTypeColor = (type: string) => {
    switch (type) {
      case 'cell': return 'bg-green-100 text-green-800';
      case 'day': return 'bg-blue-100 text-blue-800';
      case 'eve': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPhoneTypeLabel = (type: string) => {
    switch (type) {
      case 'cell': return 'Cell';
      case 'day': return 'Day';
      case 'eve': return 'Eve';
      default: return type;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Phone className="w-4 h-4 text-slate-500" />
        <span className="text-sm">{formatPhoneForDisplay(primaryPhone)}</span>
        {phoneNumbers.length > 1 && (
          <Badge variant="secondary" className="text-xs">
            +{phoneNumbers.length - 1} more
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {phoneNumbers.map((phone, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-slate-500" />
            <span className="text-sm">{formatPhoneForDisplay(phone.number)}</span>
            <Badge className={getPhoneTypeColor(phone.type)}>
              {getPhoneTypeLabel(phone.type)} - Priority {phone.priority}
            </Badge>
            {phone.number === primaryPhone && (
              <Badge variant="default" className="text-xs">Primary</Badge>
            )}
            {phone.status !== 'active' && (
              <Badge variant="outline" className="text-xs capitalize">
                {phone.status.replace('_', ' ')}
              </Badge>
            )}
          </div>
          {onPhoneSelect && phone.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPhoneSelect(phone.number)}
              className="px-2"
            >
              <PhoneCall className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default PhoneNumberDisplay;
