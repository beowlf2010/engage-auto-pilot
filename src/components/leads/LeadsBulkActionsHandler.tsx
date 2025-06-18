
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Lead } from '@/types/lead';
import BulkActionsPanel from './BulkActionsPanel';

interface LeadsBulkActionsHandlerProps {
  selectedLeads: string[];
  leads: Lead[];
  clearSelection: () => void;
  refetch: () => void;
}

const LeadsBulkActionsHandler = ({
  selectedLeads,
  leads,
  clearSelection,
  refetch
}: LeadsBulkActionsHandlerProps) => {
  const handleBulkStatusUpdate = async (status: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .in('id', selectedLeads);

      if (error) throw error;

      toast({
        title: "Bulk update successful",
        description: `Updated ${selectedLeads.length} leads to ${status} status`,
      });

      refetch();
      clearSelection();
    } catch (error) {
      console.error('Error updating leads:', error);
      toast({
        title: "Error",
        description: "Failed to update leads",
        variant: "destructive",
      });
    }
  };

  const handleBulkMessage = async () => {
    toast({
      title: "Bulk message queued",
      description: `Message queued for ${selectedLeads.length} leads`,
    });
    clearSelection();
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', selectedLeads);

      if (error) throw error;

      toast({
        title: "Bulk delete successful",
        description: `Deleted ${selectedLeads.length} leads`,
      });

      refetch();
      clearSelection();
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast({
        title: "Error",
        description: "Failed to delete leads",
        variant: "destructive",
      });
    }
  };

  // Transform selected leads for BulkActionsPanel
  const selectedLeadObjects = leads.filter(lead => 
    selectedLeads.includes(lead.id.toString())
  ).map(lead => ({
    id: lead.id.toString(),
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    status: lead.status,
    vehicle_interest: lead.vehicleInterest
  }));

  if (selectedLeads.length === 0) {
    return null;
  }

  return (
    <BulkActionsPanel
      selectedLeads={selectedLeadObjects}
      onClearSelection={clearSelection}
      onBulkStatusUpdate={handleBulkStatusUpdate}
      onBulkDelete={handleBulkDelete}
      onBulkMessage={handleBulkMessage}
    />
  );
};

export default LeadsBulkActionsHandler;
