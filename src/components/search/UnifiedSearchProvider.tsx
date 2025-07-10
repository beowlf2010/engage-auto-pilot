import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchFilter {
  id: string;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  field: string;
  label: string;
  value: any;
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'not_in';
  options?: { label: string; value: any }[];
}

export interface SearchPreset {
  id: string;
  name: string;
  filters: SearchFilter[];
  searchTerm: string;
  isDefault?: boolean;
}

export interface SearchResult {
  type: 'lead' | 'conversation' | 'inventory' | 'appointment';
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  metadata?: Record<string, any>;
  score?: number;
  highlight?: string[];
}

interface UnifiedSearchContextType {
  // Search state
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeFilters: SearchFilter[];
  setActiveFilters: (filters: SearchFilter[]) => void;
  
  // Results
  results: SearchResult[];
  isSearching: boolean;
  totalResults: number;
  
  // Presets
  presets: SearchPreset[];
  activePreset: SearchPreset | null;
  savePreset: (name: string) => void;
  loadPreset: (preset: SearchPreset) => void;
  deletePreset: (presetId: string) => void;
  
  // Actions
  addFilter: (filter: Omit<SearchFilter, 'id'>) => void;
  removeFilter: (filterId: string) => void;
  updateFilter: (filterId: string, updates: Partial<SearchFilter>) => void;
  clearAllFilters: () => void;
  performSearch: () => Promise<void>;
}

const UnifiedSearchContext = createContext<UnifiedSearchContextType | null>(null);

export const useUnifiedSearch = () => {
  const context = useContext(UnifiedSearchContext);
  if (!context) {
    throw new Error('useUnifiedSearch must be used within a UnifiedSearchProvider');
  }
  return context;
};

interface UnifiedSearchProviderProps {
  children: React.ReactNode;
}

export const UnifiedSearchProvider: React.FC<UnifiedSearchProviderProps> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [presets, setPresets] = useState<SearchPreset[]>([]);
  const [activePreset, setActivePreset] = useState<SearchPreset | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedFilters = useDebounce(activeFilters, 300);

  // Add filter
  const addFilter = useCallback((filter: Omit<SearchFilter, 'id'>) => {
    const newFilter: SearchFilter = {
      ...filter,
      id: crypto.randomUUID(),
    };
    setActiveFilters(prev => [...prev, newFilter]);
    setActivePreset(null); // Clear active preset when manually adding filters
  }, []);

  // Remove filter
  const removeFilter = useCallback((filterId: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId));
    setActivePreset(null);
  }, []);

  // Update filter
  const updateFilter = useCallback((filterId: string, updates: Partial<SearchFilter>) => {
    setActiveFilters(prev => prev.map(f => 
      f.id === filterId ? { ...f, ...updates } : f
    ));
    setActivePreset(null);
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setActiveFilters([]);
    setSearchTerm('');
    setActivePreset(null);
  }, []);

  // Save preset
  const savePreset = useCallback((name: string) => {
    const preset: SearchPreset = {
      id: crypto.randomUUID(),
      name,
      filters: [...activeFilters],
      searchTerm,
    };
    setPresets(prev => [...prev, preset]);
    setActivePreset(preset);
    
    // Save to localStorage
    const savedPresets = JSON.parse(localStorage.getItem('search-presets') || '[]');
    localStorage.setItem('search-presets', JSON.stringify([...savedPresets, preset]));
  }, [activeFilters, searchTerm]);

  // Load preset
  const loadPreset = useCallback((preset: SearchPreset) => {
    setActiveFilters([...preset.filters]);
    setSearchTerm(preset.searchTerm);
    setActivePreset(preset);
  }, []);

  // Delete preset
  const deletePreset = useCallback((presetId: string) => {
    setPresets(prev => prev.filter(p => p.id !== presetId));
    if (activePreset?.id === presetId) {
      setActivePreset(null);
    }
    
    // Update localStorage
    const savedPresets = JSON.parse(localStorage.getItem('search-presets') || '[]');
    const filtered = savedPresets.filter((p: SearchPreset) => p.id !== presetId);
    localStorage.setItem('search-presets', JSON.stringify(filtered));
  }, [activePreset]);

  // Build query filters for Supabase
  const buildSupabaseFilters = useCallback((query: any, filters: SearchFilter[], table: string) => {
    filters.forEach(filter => {
      const { field, value, operator = 'eq' } = filter;
      
      if (value === null || value === undefined || value === '') return;
      
      switch (operator) {
        case 'eq':
          query = query.eq(field, value);
          break;
        case 'neq':
          query = query.neq(field, value);
          break;
        case 'gt':
          query = query.gt(field, value);
          break;
        case 'gte':
          query = query.gte(field, value);
          break;
        case 'lt':
          query = query.lt(field, value);
          break;
        case 'lte':
          query = query.lte(field, value);
          break;
        case 'like':
          query = query.like(field, `%${value}%`);
          break;
        case 'ilike':
          query = query.ilike(field, `%${value}%`);
          break;
        case 'in':
          query = query.in(field, Array.isArray(value) ? value : [value]);
          break;
        case 'not_in':
          query = query.not(field, 'in', Array.isArray(value) ? value : [value]);
          break;
      }
    });
    
    return query;
  }, []);

  // Perform unified search across all data types
  const performSearch = useCallback(async () => {
    if (!debouncedSearchTerm && activeFilters.length === 0) {
      setResults([]);
      setTotalResults(0);
      return;
    }

    setIsSearching(true);
    const allResults: SearchResult[] = [];

    try {
      // Search leads
      let leadsQuery = supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, source, status, created_at, vehicle_interest');

      if (debouncedSearchTerm) {
        leadsQuery = leadsQuery.or(`first_name.ilike.%${debouncedSearchTerm}%,last_name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%,vehicle_interest.ilike.%${debouncedSearchTerm}%`);
      }

      leadsQuery = buildSupabaseFilters(leadsQuery, activeFilters.filter(f => 
        ['first_name', 'last_name', 'email', 'source', 'status'].includes(f.field)
      ), 'leads');

      const { data: leads } = await leadsQuery.limit(20);

      if (leads) {
        leads.forEach(lead => {
          allResults.push({
            type: 'lead',
            id: lead.id,
            title: `${lead.first_name} ${lead.last_name}`,
            subtitle: lead.email,
            description: `${lead.source} • ${lead.status} • ${lead.vehicle_interest}`,
            metadata: { email: lead.email, source: lead.source, status: lead.status },
            score: debouncedSearchTerm ? calculateRelevanceScore(debouncedSearchTerm, [lead.first_name, lead.last_name, lead.email].join(' ')) : 1,
          });
        });
      }

      // Search conversations
      if (debouncedSearchTerm) {
        let conversationsQuery = supabase
          .from('conversations')
          .select('id, body, direction, sent_at, lead_id, leads(first_name, last_name)')
          .ilike('body', `%${debouncedSearchTerm}%`);

        conversationsQuery = buildSupabaseFilters(conversationsQuery, activeFilters.filter(f => 
          ['direction', 'sent_at'].includes(f.field)
        ), 'conversations');

        const { data: conversations } = await conversationsQuery.limit(20);

        if (conversations) {
          conversations.forEach(conv => {
            const lead = conv.leads as any;
            allResults.push({
              type: 'conversation',
              id: conv.id,
              title: `Message ${conv.direction === 'in' ? 'from' : 'to'} ${lead?.first_name} ${lead?.last_name}`,
              subtitle: new Date(conv.sent_at).toLocaleDateString(),
              description: conv.body.substring(0, 100) + (conv.body.length > 100 ? '...' : ''),
              metadata: { direction: conv.direction, lead_id: conv.lead_id },
              score: calculateRelevanceScore(debouncedSearchTerm, conv.body),
              highlight: findHighlights(debouncedSearchTerm, conv.body),
            });
          });
        }
      }

      // Search inventory
      let inventoryQuery = supabase
        .from('inventory')
        .select('id, make, model, year, vin, stock_number, price, status, condition');

      if (debouncedSearchTerm) {
        inventoryQuery = inventoryQuery.or(`make.ilike.%${debouncedSearchTerm}%,model.ilike.%${debouncedSearchTerm}%,vin.ilike.%${debouncedSearchTerm}%,stock_number.ilike.%${debouncedSearchTerm}%`);
      }

      inventoryQuery = buildSupabaseFilters(inventoryQuery, activeFilters.filter(f => 
        ['make', 'model', 'year', 'status', 'condition', 'price'].includes(f.field)
      ), 'inventory');

      const { data: inventory } = await inventoryQuery.limit(20);

      if (inventory) {
        inventory.forEach(vehicle => {
          allResults.push({
            type: 'inventory',
            id: vehicle.id,
            title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            subtitle: `Stock: ${vehicle.stock_number}`,
            description: `$${vehicle.price?.toLocaleString()} • ${vehicle.condition} • ${vehicle.status}`,
            metadata: { vin: vehicle.vin, price: vehicle.price, status: vehicle.status },
            score: debouncedSearchTerm ? calculateRelevanceScore(debouncedSearchTerm, [vehicle.make, vehicle.model, vehicle.vin, vehicle.stock_number].join(' ')) : 1,
          });
        });
      }

      // Search appointments
      let appointmentsQuery = supabase
        .from('appointments')
        .select('id, title, scheduled_at, status, leads(first_name, last_name)');

      if (debouncedSearchTerm) {
        appointmentsQuery = appointmentsQuery.ilike('title', `%${debouncedSearchTerm}%`);
      }

      appointmentsQuery = buildSupabaseFilters(appointmentsQuery, activeFilters.filter(f => 
        ['status', 'scheduled_at'].includes(f.field)
      ), 'appointments');

      const { data: appointments } = await appointmentsQuery.limit(20);

      if (appointments) {
        appointments.forEach(apt => {
          const lead = apt.leads as any;
          allResults.push({
            type: 'appointment',
            id: apt.id,
            title: apt.title,
            subtitle: `${lead?.first_name} ${lead?.last_name}`,
            description: `${new Date(apt.scheduled_at).toLocaleString()} • ${apt.status}`,
            metadata: { scheduled_at: apt.scheduled_at, status: apt.status },
            score: debouncedSearchTerm ? calculateRelevanceScore(debouncedSearchTerm, apt.title) : 1,
          });
        });
      }

      // Sort by relevance score
      allResults.sort((a, b) => (b.score || 0) - (a.score || 0));

      setResults(allResults);
      setTotalResults(allResults.length);

    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  }, [debouncedSearchTerm, activeFilters, buildSupabaseFilters]);

  // Calculate relevance score for search results
  const calculateRelevanceScore = (searchTerm: string, text: string): number => {
    const term = searchTerm.toLowerCase();
    const content = text.toLowerCase();
    
    let score = 0;
    
    // Exact match gets highest score
    if (content.includes(term)) {
      score += 10;
    }
    
    // Word matches
    const searchWords = term.split(' ');
    const contentWords = content.split(' ');
    
    searchWords.forEach(word => {
      if (contentWords.some(cWord => cWord.includes(word))) {
        score += 5;
      }
    });
    
    // Partial matches
    searchWords.forEach(word => {
      if (content.includes(word)) {
        score += 2;
      }
    });
    
    return score;
  };

  // Find text highlights for search results
  const findHighlights = (searchTerm: string, text: string): string[] => {
    const term = searchTerm.toLowerCase();
    const words = term.split(' ');
    const highlights: string[] = [];
    
    words.forEach(word => {
      if (word.length > 2) {
        const regex = new RegExp(`\\b${word}\\w*`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          highlights.push(...matches);
        }
      }
    });
    
    return [...new Set(highlights)];
  };

  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPresets = JSON.parse(localStorage.getItem('search-presets') || '[]');
    setPresets(savedPresets);
  }, []);

  // Auto-search when term or filters change
  useEffect(() => {
    performSearch();
  }, [debouncedSearchTerm, debouncedFilters]);

  const value: UnifiedSearchContextType = {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setActiveFilters,
    results,
    isSearching,
    totalResults,
    presets,
    activePreset,
    savePreset,
    loadPreset,
    deletePreset,
    addFilter,
    removeFilter,
    updateFilter,
    clearAllFilters,
    performSearch,
  };

  return (
    <UnifiedSearchContext.Provider value={value}>
      {children}
    </UnifiedSearchContext.Provider>
  );
};