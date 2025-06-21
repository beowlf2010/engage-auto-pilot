
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

import LeadDetailsHeader from './lead-details/LeadDetailsHeader';
import LeadContactCard from './lead-details/LeadContactCard';
import LeadVehicleCard from './lead-details/LeadVehicleCard';
import LeadAIStatusCard from './lead-details/LeadAIStatusCard';
import LeadDetailsFooter from './lead-details/LeadDetailsFooter';
import LeadDetailsLoading from './lead-details/LeadDetailsLoading';
import LeadDetailsError from './lead-details/LeadDetailsError';

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

  if (loading) {
    return <LeadDetailsLoading open={open} onClose={onClose} />;
  }

  if (!leadDetails) {
    return <LeadDetailsError open={open} onClose={onClose} />;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <LeadDetailsHeader
          firstName={leadDetails.first_name}
          lastName={leadDetails.last_name}
        />

        <div className="space-y-4">
          <LeadContactCard
            phoneNumbers={leadDetails.phone_numbers}
            email={leadDetails.email}
            status={leadDetails.status}
            source={leadDetails.source}
          />

          <LeadVehicleCard vehicleInterest={leadDetails.vehicle_interest} />

          <LeadAIStatusCard aiOptIn={leadDetails.ai_opt_in} />

          <div className="text-xs text-gray-500 flex items-center gap-1">
            Lead created: {new Date(leadDetails.created_at).toLocaleDateString()}
          </div>
        </div>

        <LeadDetailsFooter
          onClose={onClose}
          onNavigateToLead={handleNavigateToLead}
        />
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsModal;
