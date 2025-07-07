import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Lead } from '@/types/lead';
import { fetchLeadsData, fetchConversationsData } from './useLeadsDataFetcher';
import { processLeadData } from './useLeadsDataProcessor';
import { useLeadsOperations } from './useLeadsOperations';

interface LeadsCache {
  data: Lead[];
  timestamp: number;
  filters: string;
}

interface UseOptimizedLeadsOptions {
  pageSize?: number;
  enableVirtualization?: boolean;
  cacheTimeout?: number;
  prefetchNextPage?: boolean;
}

export const useOptimizedLeads = (options: UseOptimizedLeadsOptions = {}) => {
  const {
    pageSize = 50,
    enableVirtualization = true,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    prefetchNextPage = true
  } = options;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Caching
  const cacheRef = useRef<Map<string, LeadsCache>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const backgroundFetchRef = useRef<Promise<any> | null>(null);

  const { updateAiOptIn: updateAiOptInOperation, updateDoNotContact: updateDoNotContactOperation } = useLeadsOperations();

  // Memoized cache key generator
  const getCacheKey = useCallback((page: number, hidden: boolean, filters?: any) => {
    return `leads_${page}_${hidden}_${JSON.stringify(filters || {})}`;
  }, []);

  // Optimized data fetcher with caching and abort controller
  const fetchLeadsPage = useCallback(async (page: number, append = false, signal?: AbortSignal): Promise<Lead[]> => {
    const cacheKey = getCacheKey(page, showHidden);
    const cached = cacheRef.current.get(cacheKey);
    
    // Return cached data if valid and not expired
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      console.log(`📦 [OPTIMIZED LEADS] Using cached data for page ${page}`);
      return cached.data;
    }

    console.log(`🔄 [OPTIMIZED LEADS] Fetching page ${page} (append: ${append})`);
    
    try {
      // Fetch leads data with standard fetcher (pagination will be handled later)
      const [leadsData, conversationsData] = await Promise.all([
        fetchLeadsData(showHidden),
        page === 0 ? fetchConversationsData() : Promise.resolve([]) // Only fetch conversations for first page
      ]);

      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      const processedLeads = processLeadData(leadsData, conversationsData);
      
      // Implement client-side pagination for now
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const pageData = processedLeads.slice(startIndex, endIndex);
      
      // Cache the result
      cacheRef.current.set(cacheKey, {
        data: pageData,
        timestamp: Date.now(),
        filters: cacheKey
      });

      // Cleanup old cache entries (keep last 10)
      if (cacheRef.current.size > 10) {
        const entries = Array.from(cacheRef.current.entries());
        entries.slice(0, -10).forEach(([key]) => cacheRef.current.delete(key));
      }

      return pageData;
    } catch (err) {
      if (signal?.aborted) {
        console.log('🚫 [OPTIMIZED LEADS] Request aborted');
        return [];
      }
      throw err;
    }
  }, [showHidden, pageSize, getCacheKey, cacheTimeout]);

  // Optimized fetch with progressive loading
  const fetchLeads = useCallback(async (page = 0, append = false) => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      if (!append) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const pageData = await fetchLeadsPage(page, append, abortController.signal);

      if (abortController.signal.aborted) {
        return;
      }

      setLeads(prevLeads => {
        if (append) {
          // Avoid duplicates when appending
          const existingIds = new Set(prevLeads.map(lead => lead.id));
          const newLeads = pageData.filter(lead => !existingIds.has(lead.id));
          return [...prevLeads, ...newLeads];
        } else {
          return pageData;
        }
      });

      setHasMore(pageData.length === pageSize);
      setCurrentPage(page);

      // Background prefetch next page if enabled
      if (prefetchNextPage && pageData.length === pageSize && !append) {
        backgroundFetchRef.current = fetchLeadsPage(page + 1, false, abortController.signal)
          .catch(err => {
            if (!abortController.signal.aborted) {
              console.warn('Background prefetch failed:', err);
            }
          });
      }

    } catch (err) {
      if (!abortController.signal.aborted) {
        console.error('Error fetching leads:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch leads'));
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [fetchLeadsPage, pageSize, prefetchNextPage]);

  // Load more leads for infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    await fetchLeads(currentPage + 1, true);
  }, [fetchLeads, currentPage, loadingMore, hasMore]);

  // Optimistic lead updates
  const updateLeadOptimistically = useCallback((leadId: string, updates: Partial<Lead>) => {
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId ? { ...lead, ...updates } : lead
      )
    );
  }, []);

  // Revert optimistic update
  const revertOptimisticUpdate = useCallback((leadId: string, revertUpdates: Partial<Lead>) => {
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId ? { ...lead, ...revertUpdates } : lead
      )
    );
  }, []);

  // Optimized AI opt-in with rollback
  const updateAiOptIn = useCallback(async (leadId: string, aiOptIn: boolean) => {
    console.log('🔄 [OPTIMIZED LEADS] Updating AI opt-in:', { leadId, aiOptIn });
    
    const originalLead = leads.find(lead => lead.id === leadId);
    if (!originalLead) return false;

    // Optimistic update
    updateLeadOptimistically(leadId, { aiOptIn });

    try {
      const success = await updateAiOptInOperation(leadId, aiOptIn);
      
      if (!success) {
        console.error('❌ [OPTIMIZED LEADS] Failed to update AI opt-in, reverting');
        revertOptimisticUpdate(leadId, { aiOptIn: originalLead.aiOptIn });
        return false;
      }
      
      console.log('✅ [OPTIMIZED LEADS] AI opt-in updated successfully');
      return true;
    } catch (error) {
      console.error('❌ [OPTIMIZED LEADS] Error updating AI opt-in:', error);
      revertOptimisticUpdate(leadId, { aiOptIn: originalLead.aiOptIn });
      return false;
    }
  }, [leads, updateAiOptInOperation, updateLeadOptimistically, revertOptimisticUpdate]);

  // Optimized do not contact with rollback
  const updateDoNotContact = useCallback(async (leadId: string, field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => {
    const originalLead = leads.find(lead => lead.id === leadId);
    if (!originalLead) return false;

    // Optimistic update
    updateLeadOptimistically(leadId, { [field]: value });

    try {
      const success = await updateDoNotContactOperation(leadId, field, value);
      
      if (!success) {
        revertOptimisticUpdate(leadId, { [field]: originalLead[field] });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ [OPTIMIZED LEADS] Error updating do not contact:', error);
      revertOptimisticUpdate(leadId, { [field]: originalLead[field] });
      return false;
    }
  }, [leads, updateDoNotContactOperation, updateLeadOptimistically, revertOptimisticUpdate]);

  // Toggle lead hidden with optimistic update
  const toggleLeadHidden = useCallback((leadId: string, hidden: boolean) => {
    updateLeadOptimistically(leadId, { is_hidden: hidden });
    
    if (hidden && !showHidden) {
      // Remove from list if hiding and not showing hidden
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
    }
  }, [showHidden, updateLeadOptimistically]);

  // Memoized stats calculation
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    
    return {
      total: leads.length,
      noContact: leads.filter(lead => lead.status === 'new').length,
      contacted: leads.filter(lead => lead.outgoingCount > 0).length,
      responded: leads.filter(lead => lead.incomingCount > 0).length,
      aiEnabled: leads.filter(lead => lead.aiOptIn).length,
      fresh: leads.filter(lead => new Date(lead.createdAt).toDateString() === today).length,
      hiddenCount: leads.filter(lead => lead.is_hidden).length
    };
  }, [leads]);

  // Clear cache when showHidden changes
  useEffect(() => {
    cacheRef.current.clear();
    setCurrentPage(0);
    fetchLeads(0, false);
  }, [showHidden, fetchLeads]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    leads,
    loading,
    loadingMore,
    error,
    hasMore,
    stats,
    currentPage,
    showHidden,
    setShowHidden,
    refetch: () => {
      cacheRef.current.clear();
      return fetchLeads(0, false);
    },
    loadMore,
    updateAiOptIn,
    updateDoNotContact,
    toggleLeadHidden,
    clearCache: () => {
      cacheRef.current.clear();
    }
  };
};
