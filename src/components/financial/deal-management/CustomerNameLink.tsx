
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatProperName, shouldUsePersonalGreeting } from '@/utils/nameFormatter';

interface CustomerNameLinkProps {
  customerName: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  created_at: string;
}

const CustomerNameLink = ({ customerName }: CustomerNameLinkProps) => {
  const navigate = useNavigate();
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    if (!customerName || !shouldUsePersonalGreeting(customerName)) {
      return;
    }

    // Format and prepare search name
    const formatted = formatProperName(customerName);
    setSearchName(formatted);
  }, [customerName]);

  const { data: matchingLeads, isLoading } = useQuery({
    queryKey: ['customer-lead-match', searchName],
    queryFn: async () => {
      if (!searchName) return [];

      // Split name into parts for flexible matching
      const nameParts = searchName.split(' ').filter(part => part.length > 0);
      
      if (nameParts.length === 0) return [];

      // Build search conditions for different name formats
      let query = supabase
        .from('leads')
        .select('id, first_name, last_name, status, created_at');

      // Search for exact full name match first
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        query = query.or(`and(first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%)`);
      } else {
        // Single name - could be first or last name
        const singleName = nameParts[0];
        query = query.or(`first_name.ilike.%${singleName}%,last_name.ilike.%${singleName}%`);
      }

      const { data, error } = await query.limit(5);
      
      if (error) {
        console.error('Error searching for leads:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!searchName,
  });

  const handleLeadClick = (leadId: string) => {
    navigate(`/leads/${leadId}`);
  };

  if (!searchName || !shouldUsePersonalGreeting(customerName)) {
    return (
      <div className="font-medium">
        {customerName || 'Unknown'}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="font-medium">
        {customerName}
      </div>
    );
  }

  if (!matchingLeads || matchingLeads.length === 0) {
    return (
      <div className="font-medium">
        {customerName}
      </div>
    );
  }

  // Single match - make it directly clickable
  if (matchingLeads.length === 1) {
    const lead = matchingLeads[0];
    const statusColor = {
      'new': 'bg-blue-100 text-blue-800',
      'engaged': 'bg-green-100 text-green-800',
      'paused': 'bg-yellow-100 text-yellow-800',
      'closed': 'bg-gray-100 text-gray-800',
      'lost': 'bg-red-100 text-red-800'
    }[lead.status] || 'bg-gray-100 text-gray-800';

    return (
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleLeadClick(lead.id)}
          className="font-medium p-0 h-auto text-left justify-start hover:text-blue-600"
        >
          <User className="w-3 h-3 mr-1" />
          {customerName}
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
        <Badge variant="secondary" className={`text-xs ${statusColor}`}>
          {lead.status}
        </Badge>
      </div>
    );
  }

  // Multiple matches - show first match with indicator
  const firstLead = matchingLeads[0];
  const statusColor = {
    'new': 'bg-blue-100 text-blue-800',
    'engaged': 'bg-green-100 text-green-800',
    'paused': 'bg-yellow-100 text-yellow-800',
    'closed': 'bg-gray-100 text-gray-800',
    'lost': 'bg-red-100 text-red-800'
  }[firstLead.status] || 'bg-gray-100 text-gray-800';

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleLeadClick(firstLead.id)}
        className="font-medium p-0 h-auto text-left justify-start hover:text-blue-600"
      >
        <User className="w-3 h-3 mr-1" />
        {customerName}
        <ExternalLink className="w-3 h-3 ml-1" />
      </Button>
      <div className="flex items-center space-x-1">
        <Badge variant="secondary" className={`text-xs ${statusColor}`}>
          {firstLead.status}
        </Badge>
        {matchingLeads.length > 1 && (
          <Badge variant="outline" className="text-xs">
            +{matchingLeads.length - 1} more
          </Badge>
        )}
      </div>
    </div>
  );
};

export default CustomerNameLink;
