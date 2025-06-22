
interface SearchResult {
  messageId: string;
  leadId: string;
  content: string;
  timestamp: Date;
  direction: 'in' | 'out';
  relevanceScore: number;
  highlightedContent: string;
  matchedTerms: string[];
  category?: string;
  sentiment?: string;
}

interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  direction?: 'in' | 'out' | 'both';
  categories?: string[];
  sentiment?: string[];
  leadIds?: string[];
  minRelevanceScore?: number;
}

interface SearchIndex {
  messageId: string;
  leadId: string;
  content: string;
  normalizedContent: string;
  tokens: string[];
  timestamp: Date;
  direction: 'in' | 'out';
  metadata: any;
}

class MessageSearchService {
  private searchIndex = new Map<string, SearchIndex>();
  private searchCache = new Map<string, SearchResult[]>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;
  private searchAnalytics = {
    totalSearches: 0,
    avgResponseTime: 0,
    popularTerms: new Map<string, number>(),
    noResultsQueries: [] as string[]
  };

  // Build search index from messages
  buildSearchIndex(messages: any[]) {
    console.log('🔍 [SEARCH SERVICE] Building search index for', messages.length, 'messages');
    
    messages.forEach(message => {
      const normalizedContent = this.normalizeText(message.body);
      const tokens = this.tokenizeText(normalizedContent);
      
      this.searchIndex.set(message.id, {
        messageId: message.id,
        leadId: message.leadId,
        content: message.body,
        normalizedContent,
        tokens,
        timestamp: new Date(message.sentAt),
        direction: message.direction,
        metadata: {
          aiGenerated: message.aiGenerated,
          smsStatus: message.smsStatus
        }
      });
    });
    
    console.log('✅ [SEARCH SERVICE] Search index built with', this.searchIndex.size, 'entries');
  }

  // Update index with new message
  addToIndex(message: any) {
    const normalizedContent = this.normalizeText(message.body);
    const tokens = this.tokenizeText(normalizedContent);
    
    this.searchIndex.set(message.id, {
      messageId: message.id,
      leadId: message.leadId,
      content: message.body,
      normalizedContent,
      tokens,
      timestamp: new Date(message.sentAt),
      direction: message.direction,
      metadata: {
        aiGenerated: message.aiGenerated,
        smsStatus: message.smsStatus
      }
    });
  }

  // Perform full-text search with ranking
  search(query: string, filters: SearchFilters = {}, limit = 50): SearchResult[] {
    const startTime = performance.now();
    
    // Check cache first
    const cacheKey = this.getCacheKey(query, filters, limit);
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      console.log('⚡ [SEARCH SERVICE] Using cached results for:', query);
      return cached;
    }

    console.log('🔍 [SEARCH SERVICE] Searching for:', query);
    
    const normalizedQuery = this.normalizeText(query);
    const queryTerms = this.tokenizeText(normalizedQuery);
    
    if (queryTerms.length === 0) return [];

    const results: SearchResult[] = [];
    
    // Search through index
    this.searchIndex.forEach(indexEntry => {
      // Apply filters
      if (!this.passesFilters(indexEntry, filters)) return;
      
      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(indexEntry, queryTerms, normalizedQuery);
      
      if (relevanceScore > (filters.minRelevanceScore || 0.1)) {
        results.push({
          messageId: indexEntry.messageId,
          leadId: indexEntry.leadId,
          content: indexEntry.content,
          timestamp: indexEntry.timestamp,
          direction: indexEntry.direction,
          relevanceScore,
          highlightedContent: this.highlightMatches(indexEntry.content, queryTerms),
          matchedTerms: this.getMatchedTerms(indexEntry.tokens, queryTerms),
          category: indexEntry.metadata.category,
          sentiment: indexEntry.metadata.sentiment
        });
      }
    });

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Limit results
    const limitedResults = results.slice(0, limit);
    
    // Cache results
    this.cacheResults(cacheKey, limitedResults);
    
    // Update analytics
    this.updateSearchAnalytics(query, performance.now() - startTime, limitedResults.length);
    
    console.log(`📊 [SEARCH SERVICE] Found ${limitedResults.length} results in ${(performance.now() - startTime).toFixed(1)}ms`);
    
    return limitedResults;
  }

  // Fuzzy search for typo tolerance
  fuzzySearch(query: string, threshold = 0.8): SearchResult[] {
    console.log('🔍 [SEARCH SERVICE] Performing fuzzy search for:', query);
    
    const normalizedQuery = this.normalizeText(query);
    const results: SearchResult[] = [];
    
    this.searchIndex.forEach(indexEntry => {
      const similarity = this.calculateStringSimilarity(normalizedQuery, indexEntry.normalizedContent);
      
      if (similarity >= threshold) {
        results.push({
          messageId: indexEntry.messageId,
          leadId: indexEntry.leadId,
          content: indexEntry.content,
          timestamp: indexEntry.timestamp,
          direction: indexEntry.direction,
          relevanceScore: similarity,
          highlightedContent: this.highlightFuzzyMatches(indexEntry.content, query),
          matchedTerms: [query],
          category: indexEntry.metadata.category,
          sentiment: indexEntry.metadata.sentiment
        });
      }
    });
    
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 20);
  }

  // Get search suggestions
  getSearchSuggestions(partialQuery: string, limit = 5): string[] {
    const normalizedQuery = this.normalizeText(partialQuery).toLowerCase();
    
    if (normalizedQuery.length < 2) return [];
    
    const suggestions = new Set<string>();
    
    // Get suggestions from popular terms
    this.searchAnalytics.popularTerms.forEach((count, term) => {
      if (term.toLowerCase().includes(normalizedQuery)) {
        suggestions.add(term);
      }
    });
    
    // Get suggestions from content
    this.searchIndex.forEach(entry => {
      entry.tokens.forEach(token => {
        if (token.toLowerCase().includes(normalizedQuery) && token.length > 2) {
          suggestions.add(token);
        }
      });
    });
    
    return Array.from(suggestions).slice(0, limit);
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenizeText(text: string): string[] {
    return text
      .split(' ')
      .filter(token => token.length > 1)
      .map(token => token.trim());
  }

  private calculateRelevanceScore(indexEntry: SearchIndex, queryTerms: string[], fullQuery: string): number {
    let score = 0;
    
    // Exact phrase match (highest score)
    if (indexEntry.normalizedContent.includes(fullQuery)) {
      score += 1.0;
    }
    
    // Individual term matches
    const matchCount = queryTerms.filter(term => 
      indexEntry.tokens.some(token => token.includes(term))
    ).length;
    
    score += (matchCount / queryTerms.length) * 0.8;
    
    // Boost for exact word matches
    const exactMatches = queryTerms.filter(term => 
      indexEntry.tokens.includes(term)
    ).length;
    
    score += (exactMatches / queryTerms.length) * 0.6;
    
    // Recency boost (more recent messages get slight boost)
    const daysSinceMessage = (Date.now() - indexEntry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, (30 - daysSinceMessage) / 30) * 0.1;
    score += recencyBoost;
    
    return Math.min(score, 2.0); // Cap at 2.0
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private highlightMatches(content: string, queryTerms: string[]): string {
    let highlighted = content;
    
    queryTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    
    return highlighted;
  }

  private highlightFuzzyMatches(content: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return content.replace(regex, '<mark>$1</mark>');
  }

  private getMatchedTerms(tokens: string[], queryTerms: string[]): string[] {
    return queryTerms.filter(term => 
      tokens.some(token => token.includes(term))
    );
  }

  private passesFilters(indexEntry: SearchIndex, filters: SearchFilters): boolean {
    // Date range filter
    if (filters.dateRange) {
      if (indexEntry.timestamp < filters.dateRange.start || 
          indexEntry.timestamp > filters.dateRange.end) {
        return false;
      }
    }
    
    // Direction filter
    if (filters.direction && filters.direction !== 'both') {
      if (indexEntry.direction !== filters.direction) {
        return false;
      }
    }
    
    // Lead IDs filter
    if (filters.leadIds && filters.leadIds.length > 0) {
      if (!filters.leadIds.includes(indexEntry.leadId)) {
        return false;
      }
    }
    
    return true;
  }

  private getCacheKey(query: string, filters: SearchFilters, limit: number): string {
    return `${query}_${JSON.stringify(filters)}_${limit}`;
  }

  private cacheResults(key: string, results: SearchResult[]) {
    // Implement LRU cache
    if (this.searchCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
    
    this.searchCache.set(key, results);
    
    // Set TTL
    setTimeout(() => {
      this.searchCache.delete(key);
    }, this.CACHE_TTL);
  }

  private updateSearchAnalytics(query: string, responseTime: number, resultCount: number) {
    this.searchAnalytics.totalSearches++;
    this.searchAnalytics.avgResponseTime = 
      (this.searchAnalytics.avgResponseTime + responseTime) / 2;
    
    // Track popular terms
    const terms = this.tokenizeText(this.normalizeText(query));
    terms.forEach(term => {
      this.searchAnalytics.popularTerms.set(
        term, 
        (this.searchAnalytics.popularTerms.get(term) || 0) + 1
      );
    });
    
    // Track no-results queries
    if (resultCount === 0) {
      this.searchAnalytics.noResultsQueries.push(query);
      if (this.searchAnalytics.noResultsQueries.length > 50) {
        this.searchAnalytics.noResultsQueries.shift();
      }
    }
  }

  // Clear cache
  clearCache() {
    this.searchCache.clear();
  }

  // Get analytics
  getSearchAnalytics() {
    return {
      ...this.searchAnalytics,
      cacheSize: this.searchCache.size,
      indexSize: this.searchIndex.size,
      popularTermsArray: Array.from(this.searchAnalytics.popularTerms.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    };
  }
}

export const messageSearchService = new MessageSearchService();
