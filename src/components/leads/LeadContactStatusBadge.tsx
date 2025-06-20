
import React from "react";
import { Badge } from "@/components/ui/badge";

interface LeadContactStatusBadgeProps {
  contactStatus: string;
}

const contactColors: Record<string, string> = {
  'no_contact': 'bg-gray-100 text-gray-800',
  'contact_attempted': 'bg-yellow-100 text-yellow-800',
  'response_received': 'bg-green-100 text-green-800'
};

function formatContactStatus(status: string) {
  if (!status || typeof status !== 'string') {
    return 'No Contact';
  }
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const LeadContactStatusBadge: React.FC<LeadContactStatusBadgeProps> = ({ contactStatus }) => {
  const safeContactStatus = contactStatus || 'no_contact';
  const color = contactColors[safeContactStatus] || 'bg-gray-100 text-gray-800';
  return (
    <Badge className={color}>
      {formatContactStatus(safeContactStatus)}
    </Badge>
  );
};

export default LeadContactStatusBadge;
