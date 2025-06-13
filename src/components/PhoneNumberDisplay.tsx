
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'opted_out': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  // Sort phones by priority and status
  const sortedPhones = [...phoneNumbers].sort((a, b) => {
    // Active phones first
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    
    // Then by priority (lower number = higher priority)
    return a.priority - b.priority;
  });

  if (compact) {
    const activePhone = sortedPhones.find(p => p.status === 'active');
    if (!activePhone) {
      return (
        <div className="flex items-center space-x-2 text-gray-500">
          <Phone className="w-4 h-4" />
          <span className="text-sm">No active phone</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-slate-500" />
          <span className="text-sm">{formatPhoneForDisplay(activePhone.number)}</span>
          <Badge className={getPhoneTypeColor(activePhone.type)} variant="secondary">
            {getPhoneTypeLabel(activePhone.type)}
          </Badge>
          {phoneNumbers.length > 1 && (
            <Badge variant="outline" className="text-xs">
              +{phoneNumbers.length - 1} more
            </Badge>
          )}
        </div>
        {onPhoneSelect && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPhoneSelect(activePhone.number)}
            className="px-2"
          >
            <PhoneCall className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedPhones.map((phone, index) => (
        <div key={index} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
          <div className="flex items-center space-x-3 flex-1">
            <Phone className={`w-4 h-4 ${getStatusColor(phone.status)}`} />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{formatPhoneForDisplay(phone.number)}</span>
                <Badge className={getPhoneTypeColor(phone.type)} variant="secondary">
                  {getPhoneTypeLabel(phone.type)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Priority {phone.priority}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                {phone.number === primaryPhone && (
                  <Badge variant="default" className="text-xs">Primary</Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={`text-xs capitalize ${getStatusColor(phone.status)}`}
                >
                  {phone.status.replace('_', ' ')}
                </Badge>
                {phone.lastAttempt && (
                  <span className="text-xs text-gray-500">
                    Last attempt: {new Date(phone.lastAttempt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          {onPhoneSelect && phone.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPhoneSelect(phone.number)}
              className="px-2 ml-2"
            >
              <PhoneCall className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
      {sortedPhones.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No phone numbers available</p>
        </div>
      )}
    </div>
  );
};

export default PhoneNumberDisplay;
