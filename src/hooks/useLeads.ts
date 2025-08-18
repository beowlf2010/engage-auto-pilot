
import { useState, useEffect, useCallback } from 'react';
import { Lead } from '@/types/lead';
import { fetchLeadsData, fetchConversationsData } from './leads/useLeadsDataFetcher';
import { processLeadData } from './leads/useLeadsDataProcessor';
import { useLeadsOperations } from './leads/useLeadsOperations';

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [todayOnly, setTodayOnly] = useState(() => {
    const saved = localStorage.getItem('leads-today-only');
    return saved ? JSON.parse(saved) : true;
  });
  
  const { updateAiOptIn: updateAiOptInOperation, updateDoNotContact: updateDoNotContactOperation } = useLeadsOperations();

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [leadsData, conversationsData] = await Promise.all([
        fetchLeadsData(showHidden, todayOnly),
        fetchConversationsData()
      ]);

      const processedLeads = processLeadData(leadsData, conversationsData);
      setLeads(processedLeads);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch leads'));
    } finally {
      setLoading(false);
    }
  }, [showHidden, todayOnly]);

  const toggleTodayOnly = (value: boolean) => {
    setTodayOnly(value);
    localStorage.setItem('leads-today-only', JSON.stringify(value));
  };

  const toggleLeadHidden = (leadId: string, hidden: boolean) => {
    setLeads(prevLeads => {
      if (hidden && !showHidden) {
        // If hiding a lead and we're not showing hidden leads, remove it from the list
        return prevLeads.filter(lead => lead.id !== leadId);
      } else {
        // Otherwise, just update the is_hidden property
        return prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, is_hidden: hidden } : lead
        );
      }
    });
  };

  const updateAiOptIn = async (leadId: string, aiOptIn: boolean) => {
    console.log('🔄 [USE LEADS] Updating AI opt-in:', { leadId, aiOptIn });
    
    // Optimistically update the UI immediately
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId ? { ...lead, aiOptIn } : lead
      )
    );

    const success = await updateAiOptInOperation(leadId, aiOptIn);
    
    if (!success) {
      console.error('❌ [USE LEADS] Failed to update AI opt-in, reverting optimistic update');
      // Revert optimistic update on failure
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, aiOptIn: !aiOptIn } : lead
        )
      );
      return false;
    }
    
    console.log('✅ [USE LEADS] AI opt-in updated successfully');
    return true;
  };

  const updateDoNotContact = async (leadId: string, field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => {
    const success = await updateDoNotContactOperation(leadId, field, value);
    if (success) {
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, [field]: value } : lead
        )
      );
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Calculate hidden count
  const hiddenCount = leads.filter(lead => lead.is_hidden).length;

  return {
    leads,
    loading,
    error,
    refetch: fetchLeads,
    updateAiOptIn,
    updateDoNotContact,
    showHidden,
    setShowHidden,
    hiddenCount,
    toggleLeadHidden,
    todayOnly,
    toggleTodayOnly
  };
};
