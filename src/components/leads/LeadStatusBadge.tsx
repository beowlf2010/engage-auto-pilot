
import React from "react";
import { Badge } from "@/components/ui/badge";

interface LeadStatusBadgeProps {
  status: string;
}

const statusColors: Record<string, string> = {
  'new': 'bg-blue-100 text-blue-800',
  'engaged': 'bg-green-100 text-green-800',
  'paused': 'bg-yellow-100 text-yellow-800',
  'closed': 'bg-gray-100 text-gray-800',
  'lost': 'bg-red-100 text-red-800'
};

const LeadStatusBadge: React.FC<LeadStatusBadgeProps> = ({ status }) => {
  const color = statusColors[status] || 'bg-gray-100 text-gray-800';
  return (
    <Badge className={color}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export default LeadStatusBadge;
