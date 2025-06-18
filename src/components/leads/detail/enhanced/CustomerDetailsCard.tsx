
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, MapPin, Calendar } from "lucide-react";
import type { LeadDetailData } from "@/services/leadDetailService";

interface CustomerDetailsCardProps {
  lead: LeadDetailData;
}

const CustomerDetailsCard: React.FC<CustomerDetailsCardProps> = ({ lead }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5" />
          Customer Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name & Basic Info */}
        <div className="space-y-2">
          <div className="font-medium text-lg">
            {lead.firstName} {lead.middleName && `${lead.middleName} `}{lead.lastName}
          </div>
          <div className="text-sm text-gray-600">
            Lead since {formatDate(lead.createdAt)}
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-2">
          {lead.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>{lead.email}</span>
            </div>
          )}
          {lead.emailAlt && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>{lead.emailAlt}</span>
              <Badge variant="outline" className="text-xs">Alt</Badge>
            </div>
          )}
          {lead.phoneNumbers.length > 0 && (
            <div className="space-y-1">
              {lead.phoneNumbers.map((phone) => (
                <div key={phone.id} className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{phone.number}</span>
                  {phone.isPrimary && (
                    <Badge variant="default" className="text-xs">Primary</Badge>
                  )}
                  <Badge 
                    variant={phone.status === 'active' ? 'outline' : 'destructive'} 
                    className="text-xs"
                  >
                    {phone.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Address */}
        {(lead.address || lead.city || lead.state || lead.postalCode) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div>
                {lead.address && <div>{lead.address}</div>}
                <div>
                  {lead.city && `${lead.city}, `}
                  {lead.state} {lead.postalCode}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Communication Preferences */}
        <div className="space-y-2">
          <div className="font-medium text-sm">Communication Preferences</div>
          <div className="flex flex-wrap gap-1">
            {!lead.doNotCall && (
              <Badge variant="outline" className="text-xs">Phone OK</Badge>
            )}
            {!lead.doNotEmail && (
              <Badge variant="outline" className="text-xs">Email OK</Badge>
            )}
            {!lead.doNotMail && (
              <Badge variant="outline" className="text-xs">Mail OK</Badge>
            )}
            {lead.doNotCall && (
              <Badge variant="destructive" className="text-xs">No Calls</Badge>
            )}
            {lead.doNotEmail && (
              <Badge variant="destructive" className="text-xs">No Email</Badge>
            )}
            {lead.doNotMail && (
              <Badge variant="destructive" className="text-xs">No Mail</Badge>
            )}
          </div>
        </div>

        {/* Salesperson */}
        {lead.salespersonName && (
          <div className="space-y-1">
            <div className="font-medium text-sm">Assigned Salesperson</div>
            <div className="text-sm text-gray-600">{lead.salespersonName}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerDetailsCard;
