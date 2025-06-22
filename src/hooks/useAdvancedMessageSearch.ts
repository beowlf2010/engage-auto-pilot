
import { useState, useCallback, useEffect, useMemo } from 'react';
import { messageSearchService } from '@/services/messageSearchService';
import { messageThreadingService } from '@/services/messageThreadingService';
import { messageCategorizationService } from '@/services/messageCategorizationService';
import { useEnhancedPredictiveInbox } from './useEnhancedPredictiveInbox';

interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  direction?: 'in' | 'out' | 'both';
  categories?: string[];
  sentiment?: string[];
  leadIds?: string[];
  urgency?: string[];
  threadId?: string;
  minRelevanceScore?: number;
}

interface SearchState {
  query: string;
  filters: SearchFilters;
  results: any[];
  isSearching: boolean;
  suggestions: string[];
  recentSearches: string[];
  searchAnalytics: any;
  selectedThread: any | null;
  threadView: boolean;
}

export const useAdvancedMessageSearch = () => {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    filters: {},
    results: [],
    isSearching: false,
    suggestions: [],
    recentSearches: [],
    searchAnalytics: {},
    selectedThread: null,
    threadView: false
  });

  const { messages, conversations } = useEnhancedPredictiveInbox();

  // Initialize search index when messages change
  useEffect(() => {
    if (messages.length > 0) {
      console.log('🔍 [SEARCH HOOK] Building search index with', messages.length, 'messages');
      messageSearchService.buildSearchIndex(messages);
      
      // Categorize messages
      const messageData = messages.map(msg => ({
        id: msg.id,
        content: msg.body,
        metadata: {
          direction: msg.direction,
          sentAt: msg.sentAt,
          aiGenerated: msg.aiGenerated
        }
      }));
      messageCategorizationService.categorizeMessages(messageData);
      
      // Create threads for each conversation
      conversations.forEach(conv => {
        const convMessages = messages.filter(msg => msg.leadId === conv.leadId);
        if (convMessages.length > 0) {
          messageThreadingService.analyzeAndCreateThreads(convMessages, conv.leadId);
        }
      });
    }
  }, [messages, conversations]);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSearchState(prev => ({ ...prev, recentSearches: parsed }));
      } catch (error) {
        console.warn('Failed to parse recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((query: string) => {
    setSearchState(prev => {
      const newRecent = [query, ...prev.recentSearches.filter(s => s !== query)].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(newRecent));
      return { ...prev, recentSearches: newRecent };
    });
  }, []);

  // Perform search
  const performSearch = useCallback(async (query: string, filters: SearchFilters = {}) => {
    if (!query.trim()) {
      setSearchState(prev => ({ ...prev, results: [], query: '' }));
      return;
    }

    setSearchState(prev => ({ ...prev, isSearching: true, query }));

    try {
      console.log('🔍 [SEARCH HOOK] Performing search for:', query);
      
      // Perform main search
      const searchResults = messageSearchService.search(query, filters);
      
      // If no results, try fuzzy search
      let results = searchResults;
      if (results.length === 0) {
        console.log('🔍 [SEARCH HOOK] No exact matches, trying fuzzy search');
        results = messageSearchService.fuzzySearch(query);
      }

      // Enhance results with categorization data
      const enhancedResults = results.map(result => {
        const categorization = messageCategorizationService.categorizeMessage(
          result.messageId, 
          result.content,
          { direction: result.direction, sentAt: result.timestamp }
        );
        
        const thread = messageThreadingService.getThreadForMessage(result.messageId);
        
        return {
          ...result,
          categorization,
          thread
        };
      });

      setSearchState(prev => ({
        ...prev,
        results: enhancedResults,
        isSearching: false
      }));

      // Save to recent searches
      saveRecentSearch(query);

    } catch (error) {
      console.error('❌ [SEARCH HOOK] Search error:', error);
      setSearchState(prev => ({
        ...prev,
        results: [],
        isSearching: false
      }));
    }
  }, [saveRecentSearch]);

  // Get search suggestions
  const getSuggestions = useCallback((partialQuery: string) => {
    const suggestions = messageSearchService.getSearchSuggestions(partialQuery);
    setSearchState(prev => ({ ...prev, suggestions }));
    return suggestions;
  }, []);

  // Filter by category
  const filterByCategory = useCallback((categories: string[]) => {
    setSearchState(prev => ({
      ...prev,
      filters: { ...prev.filters, categories }
    }));
    
    if (searchState.query) {
      performSearch(searchState.query, { ...searchState.filters, categories });
    }
  }, [searchState.query, searchState.filters, performSearch]);

  // Filter by date range
  const filterByDateRange = useCallback((dateRange: { start: Date; end: Date }) => {
    setSearchState(prev => ({
      ...prev,
      filters: { ...prev.filters, dateRange }
    }));
    
    if (searchState.query) {
      performSearch(searchState.query, { ...searchState.filters, dateRange });
    }
  }, [searchState.query, searchState.filters, performSearch]);

  // Filter by direction
  const filterByDirection = useCallback((direction: 'in' | 'out' | 'both') => {
    setSearchState(prev => ({
      ...prev,
      filters: { ...prev.filters, direction }
    }));
    
    if (searchState.query) {
      performSearch(searchState.query, { ...searchState.filters, direction });
    }
  }, [searchState.query, searchState.filters, performSearch]);

  // Toggle thread view
  const toggleThreadView = useCallback(() => {
    setSearchState(prev => ({ ...prev, threadView: !prev.threadView }));
  }, []);

  // Select thread
  const selectThread = useCallback((thread: any) => {
    setSearchState(prev => ({ ...prev, selectedThread: thread }));
  }, []);

  // Search within thread
  const searchInThread = useCallback((threadId: string, query: string) => {
    const filters = { ...searchState.filters, threadId };
    performSearch(query, filters);
  }, [searchState.filters, performSearch]);

  // Get urgent messages
  const getUrgentMessages = useCallback(() => {
    return messageCategorizationService.getUrgentMessages();
  }, []);

  // Get messages requiring action
  const getActionRequiredMessages = useCallback(() => {
    return messageCategorizationService.getActionRequiredMessages();
  }, []);

  // Get threads for lead
  const getThreadsForLead = useCallback((leadId: string) => {
    return messageThreadingService.getThreadsForLead(leadId);
  }, []);

  // Search threads
  const searchThreads = useCallback((query: string) => {
    return messageThreadingService.searchThreads(query);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      query: '',
      results: [],
      filters: {},
      selectedThread: null
    }));
  }, []);

  // Get analytics
  const getSearchAnalytics = useCallback(() => {
    return {
      search: messageSearchService.getSearchAnalytics(),
      categorization: messageCategorizationService.getAnalytics(),
      threading: messageThreadingService.getAnalytics()
    };
  }, []);

  // Memoized values
  const searchStats = useMemo(() => ({
    totalResults: searchState.results.length,
    categorizedResults: searchState.results.filter(r => r.categorization).length,
    threadedResults: searchState.results.filter(r => r.thread).length,
    urgentResults: searchState.results.filter(r => r.categorization?.urgency === 'urgent').length,
    actionRequiredResults: searchState.results.filter(r => r.categorization?.actionRequired).length
  }), [searchState.results]);

  const availableCategories = useMemo(() => {
    return messageCategorizationService.getCategories();
  }, []);

  return {
    // Search state
    query: searchState.query,
    results: searchState.results,
    isSearching: searchState.isSearching,
    suggestions: searchState.suggestions,
    recentSearches: searchState.recentSearches,
    filters: searchState.filters,
    selectedThread: searchState.selectedThread,
    threadView: searchState.threadView,
    
    // Search actions
    performSearch,
    getSuggestions,
    clearSearch,
    
    // Filtering
    filterByCategory,
    filterByDateRange,
    filterByDirection,
    
    // Threading
    toggleThreadView,
    selectThread,
    searchInThread,
    getThreadsForLead,
    searchThreads,
    
    // Special searches
    getUrgentMessages,
    getActionRequiredMessages,
    
    // Analytics and stats
    searchStats,
    availableCategories,
    getSearchAnalytics
  };
};
