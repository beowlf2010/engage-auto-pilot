
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { LeadData, ConversationData } from './leads/types';
import { Lead } from '@/types/lead';
import { transformLeadData } from './leads/leadDataProcessor';
import { sortLeads } from './leads/leadSorter';

interface LoadingProgress {
  step: string;
  completed: boolean;
  error?: string;
}

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress[]>([]);
  const { profile } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateProgress = (step: string, completed: boolean, error?: string) => {
    console.log(`🔄 [LEADS PROGRESS] ${step}: ${completed ? 'completed' : 'starting'}${error ? ` - ERROR: ${error}` : ''}`);
    setLoadingProgress(prev => {
      const existing = prev.find(p => p.step === step);
      if (existing) {
        return prev.map(p => p.step === step ? { ...p, completed, error } : p);
      }
      return [...prev, { step, completed, error }];
    });
  };

  const fetchLeads = async () => {
    if (!profile) {
      console.log('❌ [LEADS] No profile found, skipping fetch');
      setLoading(false);
      return;
    }

    // Reset state
    setLoading(true);
    setError(null);
    setLoadingProgress([]);

    // Set up timeout protection (30 seconds)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      console.error('⏰ [LEADS] Fetch timeout after 30 seconds');
      setError('Loading timeout - please try refreshing the page');
      setLoading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 30000);

    // Set up abort controller for canceling requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      console.log('🔄 [LEADS] Starting fetch process...');
      updateProgress('Initializing', true);

      // Step 1: Fetch leads with phone numbers and AI strategy data
      updateProgress('Fetching leads data', false);
      console.log('📊 [LEADS] Fetching leads with phone numbers and AI strategy...');
      
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          phone_numbers (
            id,
            number,
            type,
            priority,
            status,
            is_primary,
            last_attempt
          ),
          profiles (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .abortSignal(abortControllerRef.current.signal);

      if (leadsError) {
        console.error('❌ [LEADS] Error fetching leads:', leadsError);
        throw new Error(`Failed to fetch leads: ${leadsError.message}`);
      }

      console.log('✅ [LEADS] Successfully fetched', leadsData?.length || 0, 'leads');
      updateProgress('Fetching leads data', true);

      // Step 2: Fetch conversation data
      updateProgress('Fetching conversations', false);
      console.log('💬 [LEADS] Fetching conversation data...');

      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('lead_id, body, sent_at, direction, read_at, sms_status')
        .order('sent_at', { ascending: false })
        .abortSignal(abortControllerRef.current.signal);

      if (conversationsError) {
        console.error('❌ [LEADS] Error fetching conversations:', conversationsError);
        throw new Error(`Failed to fetch conversations: ${conversationsError.message}`);
      }

      console.log('✅ [LEADS] Successfully fetched', conversationsData?.length || 0, 'conversations');
      updateProgress('Fetching conversations', true);

      // Step 3: Transform and process data
      updateProgress('Processing data', false);
      console.log('⚙️ [LEADS] Transforming lead data...');

      const transformedLeads = leadsData?.map(lead => {
        try {
          // Convert vehicle_year to number if it's a string
          const processedLead = {
            ...lead,
            vehicle_year: typeof lead.vehicle_year === 'string' ? 
              (lead.vehicle_year ? parseInt(lead.vehicle_year, 10) : undefined) : 
              lead.vehicle_year
          };
          
          return transformLeadData(processedLead as LeadData, conversationsData as ConversationData[]);
        } catch (error) {
          console.error('❌ [LEADS] Error transforming lead:', lead.id, error);
          // Return a basic lead object if transformation fails
          return {
            id: lead.id,
            firstName: lead.first_name || 'Unknown',
            lastName: lead.last_name || 'Unknown',
            email: lead.email || '',
            primaryPhone: '',
            vehicleInterest: lead.vehicle_interest || '',
            source: lead.source || '',
            status: 'new' as const,
            salesperson: 'Unassigned',
            salespersonId: lead.salesperson_id || '',
            aiOptIn: lead.ai_opt_in || false,
            createdAt: lead.created_at,
            unreadCount: 0,
            doNotCall: lead.do_not_call || false,
            doNotEmail: lead.do_not_email || false,
            doNotMail: lead.do_not_mail || false,
            contactStatus: 'no_contact' as const,
            incomingCount: 0,
            outgoingCount: 0,
            unrepliedCount: 0,
            phoneNumbers: [],
            messageIntensity: (lead.message_intensity as 'gentle' | 'standard' | 'aggressive') || 'gentle',
            aiStrategyBucket: lead.ai_strategy_bucket || undefined,
            aiAggressionLevel: lead.ai_aggression_level || 3,
            first_name: lead.first_name,
            last_name: lead.last_name,
            created_at: lead.created_at
          } as Lead;
        }
      }) || [];

      console.log('✅ [LEADS] Successfully transformed', transformedLeads.length, 'leads');
      updateProgress('Processing data', true);

      // Step 4: Sort leads
      updateProgress('Sorting leads', false);
      console.log('📊 [LEADS] Sorting leads...');
      
      const sortedLeads = sortLeads(transformedLeads);
      console.log('✅ [LEADS] Successfully sorted leads');
      updateProgress('Sorting leads', true);

      // Step 5: Update state
      updateProgress('Finalizing', false);
      setLeads(sortedLeads);
      updateProgress('Finalizing', true);

      console.log('🎉 [LEADS] Fetch process completed successfully:', sortedLeads.length, 'leads loaded');

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🚫 [LEADS] Fetch was aborted');
        return;
      }
      
      console.error('❌ [LEADS] Error in fetch process:', error);
      setError(error.message || 'Failed to load leads. Please try again.');
      updateProgress('Error occurred', false, error.message);
    } finally {
      setLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (profile) {
      fetchLeads();
    }
  }, [profile]);

  const retryFetch = () => {
    console.log('🔄 [LEADS] Manual retry triggered');
    fetchLeads();
  };

  return { 
    leads, 
    loading, 
    error,
    loadingProgress,
    refetch: fetchLeads,
    retry: retryFetch,
    // Expose a forced refresh function that others can call
    forceRefresh: () => {
      console.log('🔄 [LEADS] Force refresh triggered');
      return fetchLeads();
    }
  };
};
