
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Car, Mail, ExternalLink } from 'lucide-react';

interface LeadDetailsModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
}

interface PhoneNumber {
  id: string;
  number: string;
  type: string;
  is_primary: boolean;
}

interface LeadDetails {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  vehicle_interest: string;
  source: string;
  status: string;
  ai_opt_in: boolean;
  created_at: string;
  phone_numbers: PhoneNumber[];
}

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ open, onClose, leadId }) => {
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && leadId) {
      fetchLeadDetails();
    }
  }, [open, leadId]);

  const fetchLeadDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          phone_numbers (id, number, type, is_primary)
        `)
        .eq('id', leadId)
        .single();

      if (error) throw error;
      setLeadDetails(data);
    } catch (error) {
      console.error('Error fetching lead details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToLead = () => {
    navigate(`/leads/${leadId}`);
    onClose();
  };

  const getPrimaryPhone = () => {
    return leadDetails?.phone_numbers?.find(p => p.is_primary)?.number || 
           leadDetails?.phone_numbers?.[0]?.number || 
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

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!leadDetails) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="text-center p-8">
            <p>Lead details not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {leadDetails.first_name} {leadDetails.last_name}
          </DialogTitle>
          <DialogDescription>
            Lead details and contact information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                {leadDetails.phone_numbers.length > 1 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    +{leadDetails.phone_numbers.length - 1} more
                  </Badge>
                )}
              </div>
              {leadDetails.email && (
                <div>
                  <span className="text-sm font-medium">Email:</span>
                  <span className="ml-2">{leadDetails.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(leadDetails.status)}
                <span className="text-sm font-medium ml-2">Source:</span>
                <Badge variant="outline">{leadDetails.source}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle Interest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{leadDetails.vehicle_interest}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />
                AI Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={leadDetails.ai_opt_in ? 'default' : 'secondary'}>
                  {leadDetails.ai_opt_in ? 'AI Enabled' : 'AI Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-gray-500 flex items-center gap-1">
            Lead created: {new Date(leadDetails.created_at).toLocaleDateString()}
          </div>
        </div>

        <Separator />
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleNavigateToLead} className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            View Full Lead Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsModal;
