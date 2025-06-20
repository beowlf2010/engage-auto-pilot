
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, MapPin, Calendar, UserCheck } from "lucide-react";
import { LeadDetailData, PhoneNumber } from '@/services/leadDetailService';

interface CustomerDetailsCardProps {
  lead: LeadDetailData;
}

const CustomerDetailsCard = ({ lead }: CustomerDetailsCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="w-5 h-5 mr-2" />
          Customer Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name */}
        <div>
          <span className="text-sm font-medium text-gray-700">Name:</span>
          <p className="text-sm mt-1">
            {lead.firstName} {lead.middleName && `${lead.middleName} `}{lead.lastName}
          </p>
        </div>

        {/* Email */}
        <div className="space-y-2">
          {lead.email && (
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <div>
                <span className="text-sm">{lead.email}</span>
                <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>
              </div>
            </div>
          )}
          {lead.emailAlt && (
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <div>
                <span className="text-sm">{lead.emailAlt}</span>
                <Badge variant="outline" className="ml-2 text-xs">Alt</Badge>
              </div>
            </div>
          )}
        </div>

        {/* Phone Numbers */}
        <div>
          <span className="text-sm font-medium text-gray-700 mb-2 block">Phone Numbers:</span>
          <div className="space-y-1">
            {lead.phoneNumbers.map((phone: PhoneNumber) => (
              <div key={phone.id} className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{phone.number}</span>
                {phone.isPrimary && (
                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                )}
                <Badge variant="outline" className="text-xs capitalize">
                  {phone.type || 'Unknown'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Address */}
        {(lead.address || lead.city || lead.state || lead.postalCode) && (
          <div>
            <span className="text-sm font-medium text-gray-700">Address:</span>
            <div className="flex items-start space-x-2 mt-1">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
              <div className="text-sm">
                {lead.address && <div>{lead.address}</div>}
                <div>
                  {lead.city && lead.city}
                  {lead.city && lead.state && ', '}
                  {lead.state} {lead.postalCode}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Communication Preferences */}
        <div>
          <span className="text-sm font-medium text-gray-700 mb-2 block">Communication Preferences:</span>
          <div className="flex flex-wrap gap-2">
            <Badge variant={lead.doNotCall ? "destructive" : "outline"}>
              {lead.doNotCall ? "Do Not Call" : "Call OK"}
            </Badge>
            <Badge variant={lead.doNotEmail ? "destructive" : "outline"}>
              {lead.doNotEmail ? "Do Not Email" : "Email OK"}
            </Badge>
            <Badge variant={lead.doNotMail ? "destructive" : "outline"}>
              {lead.doNotMail ? "Do Not Mail" : "Mail OK"}
            </Badge>
          </div>
        </div>

        {/* Lead Info */}
        <div className="pt-2 border-t space-y-2">
          {lead.salespersonName && (
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Assigned to: {lead.salespersonName}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm">Created: {formatDate(lead.createdAt)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Source:</span>
            <Badge variant="outline">{lead.source}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <Badge variant={lead.status === 'new' ? 'default' : 'secondary'}>
              {lead.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerDetailsCard;
