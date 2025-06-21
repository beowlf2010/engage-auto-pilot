
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Car, Mail, ExternalLink } from 'lucide-react';

interface LeadDetailsModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
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
  phone_numbers: Array<{
    id: string;
    number: string;
    type: string;
    is_primary: boolean;
  }>;
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
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4" />
              <span className="font-medium">Contact</span>
            </div>
            <div className="space-y-1 text-sm">
              <div>Phone: {getPrimaryPhone()}</div>
              {leadDetails.email && <div>Email: {leadDetails.email}</div>}
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{leadDetails.status}</Badge>
                <Badge variant="outline">{leadDetails.source}</Badge>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Car className="h-4 w-4" />
              <span className="font-medium">Vehicle Interest</span>
            </div>
            <p className="text-sm">{leadDetails.vehicle_interest}</p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4" />
              <span className="font-medium">AI Status</span>
            </div>
            <Badge variant={leadDetails.ai_opt_in ? 'default' : 'secondary'}>
              {leadDetails.ai_opt_in ? 'AI Enabled' : 'AI Disabled'}
            </Badge>
          </div>

          <div className="text-xs text-gray-500">
            Created: {new Date(leadDetails.created_at).toLocaleDateString()}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleNavigateToLead} className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            View Full Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsModal;
