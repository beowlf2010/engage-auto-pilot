import { ConversationListItem } from '@/types/conversation';

interface ConversationRelationship {
  leadId: string;
  relatedLeadIds: string[];
  relationshipType: 'similar_vehicle' | 'same_salesperson' | 'sequential_access' | 'similar_source' | 'time_proximity';
  strength: number;
  lastUpdated: Date;
}

interface VehicleSimilarity {
  make?: string;
  model?: string;
  year?: number;
  priceRange?: [number, number];
}

class ConversationRelationshipEngine {
  private relationships = new Map<string, ConversationRelationship[]>();
  private accessSequences: string[][] = [];
  private conversationCache = new Map<string, ConversationListItem>();

  // Build relationships between conversations based on various factors
  buildRelationships(conversations: ConversationListItem[]) {
    console.log('🔗 [RELATIONSHIP ENGINE] Building conversation relationships...');

    // Clear old relationships
    this.relationships.clear();
    
    // Update conversation cache
    conversations.forEach(conv => {
      this.conversationCache.set(conv.leadId, conv);
    });

    // Build different types of relationships
    this.buildVehicleInterestRelationships(conversations);
    this.buildSalespersonRelationships(conversations);
    this.buildSourceRelationships(conversations);
    this.buildTimeProximityRelationships(conversations);
    this.buildSequentialAccessRelationships(conversations);

    console.log(`✅ [RELATIONSHIP ENGINE] Built relationships for ${conversations.length} conversations`);
  }

  private buildVehicleInterestRelationships(conversations: ConversationListItem[]) {
    conversations.forEach(conv => {
      const related = conversations
        .filter(other => other.leadId !== conv.leadId)
        .map(other => ({
          leadId: other.leadId,
          similarity: this.calculateVehicleSimilarity(conv.vehicleInterest, other.vehicleInterest),
          type: 'similar_vehicle' as const
        }))
        .filter(rel => rel.similarity > 0.3) // Threshold for similarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5); // Top 5 most similar

      if (related.length > 0) {
        this.addRelationships(conv.leadId, related.map(r => ({
          leadId: conv.leadId,
          relatedLeadIds: [r.leadId],
          relationshipType: r.type,
          strength: r.similarity,
          lastUpdated: new Date()
        })));
      }
    });
  }

  private buildSalespersonRelationships(conversations: ConversationListItem[]) {
    const bySalesperson = new Map<string, ConversationListItem[]>();
    
    conversations.forEach(conv => {
      if (conv.salespersonId) {
        if (!bySalesperson.has(conv.salespersonId)) {
          bySalesperson.set(conv.salespersonId, []);
        }
        bySalesperson.get(conv.salespersonId)!.push(conv);
      }
    });

    bySalesperson.forEach((salesConversations, salespersonId) => {
      if (salesConversations.length > 1) {
        salesConversations.forEach(conv => {
          const related = salesConversations
            .filter(other => other.leadId !== conv.leadId)
            .slice(0, 3); // Limit to 3 related conversations per salesperson

          this.addRelationships(conv.leadId, related.map(r => ({
            leadId: conv.leadId,
            relatedLeadIds: [r.leadId],
            relationshipType: 'same_salesperson' as const,
            strength: 0.6,
            lastUpdated: new Date()
          })));
        });
      }
    });
  }

  private buildSourceRelationships(conversations: ConversationListItem[]) {
    const bySource = new Map<string, ConversationListItem[]>();
    
    conversations.forEach(conv => {
      if (conv.leadSource) {
        if (!bySource.has(conv.leadSource)) {
          bySource.set(conv.leadSource, []);
        }
        bySource.get(conv.leadSource)!.push(conv);
      }
    });

    bySource.forEach((sourceConversations, source) => {
      if (sourceConversations.length > 1) {
        sourceConversations.forEach(conv => {
          const related = sourceConversations
            .filter(other => other.leadId !== conv.leadId)
            .sort((a, b) => b.unreadCount - a.unreadCount) // Prioritize unread
            .slice(0, 2);

          this.addRelationships(conv.leadId, related.map(r => ({
            leadId: conv.leadId,
            relatedLeadIds: [r.leadId],
            relationshipType: 'similar_source' as const,
            strength: 0.4,
            lastUpdated: new Date()
          })));
        });
      }
    });
  }

  private buildTimeProximityRelationships(conversations: ConversationListItem[]) {
    const sorted = [...conversations].sort((a, b) => 
      new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
    );

    sorted.forEach((conv, index) => {
      // Look at conversations within 24 hours
      const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
      const convTime = new Date(conv.lastMessageDate).getTime();
      
      const related = sorted
        .slice(index + 1, index + 10) // Look at next 10 conversations
        .filter(other => {
          const otherTime = new Date(other.lastMessageDate).getTime();
          return Math.abs(convTime - otherTime) < timeWindow;
        })
        .slice(0, 3);

      if (related.length > 0) {
        this.addRelationships(conv.leadId, related.map(r => ({
          leadId: conv.leadId,
          relatedLeadIds: [r.leadId],
          relationshipType: 'time_proximity' as const,
          strength: 0.5,
          lastUpdated: new Date()
        })));
      }
    });
  }

  private buildSequentialAccessRelationships(conversations: ConversationListItem[]) {
    // Use stored access sequences to build relationships
    this.accessSequences.forEach(sequence => {
      for (let i = 0; i < sequence.length - 1; i++) {
        const current = sequence[i];
        const next = sequence[i + 1];
        
        // If both conversations still exist
        if (this.conversationCache.has(current) && this.conversationCache.has(next)) {
          this.addRelationships(current, [{
            leadId: current,
            relatedLeadIds: [next],
            relationshipType: 'sequential_access',
            strength: 0.8, // High strength for user behavior patterns
            lastUpdated: new Date()
          }]);
        }
      }
    });
  }

  private calculateVehicleSimilarity(interest1: string, interest2: string): number {
    if (!interest1 || !interest2) return 0;

    const normalize = (str: string) => str.toLowerCase().trim();
    const int1 = normalize(interest1);
    const int2 = normalize(interest2);

    if (int1 === int2) return 1.0;

    // Extract key terms
    const terms1 = this.extractVehicleTerms(int1);
    const terms2 = this.extractVehicleTerms(int2);

    let similarity = 0;

    // Same make
    if (terms1.make && terms2.make && terms1.make === terms2.make) {
      similarity += 0.4;
    }

    // Same model
    if (terms1.model && terms2.model && terms1.model === terms2.model) {
      similarity += 0.3;
    }

    // Similar year
    if (terms1.year && terms2.year) {
      const yearDiff = Math.abs(terms1.year - terms2.year);
      if (yearDiff <= 2) {
        similarity += 0.2 * (1 - yearDiff / 2);
      }
    }

    // Similar price range
    if (terms1.priceRange && terms2.priceRange) {
      const overlap = this.calculatePriceRangeOverlap(terms1.priceRange, terms2.priceRange);
      similarity += 0.1 * overlap;
    }

    return Math.min(similarity, 1.0);
  }

  private extractVehicleTerms(interest: string): VehicleSimilarity {
    const makes = ['toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'bmw', 'mercedes', 'audi', 'lexus', 'acura'];
    const models = ['camry', 'accord', 'f-150', 'silverado', 'altima', '3 series', 'c-class', 'a4', 'es', 'tlx'];
    
    const terms: VehicleSimilarity = {};

    // Extract make
    const foundMake = makes.find(make => interest.includes(make));
    if (foundMake) terms.make = foundMake;

    // Extract model
    const foundModel = models.find(model => interest.includes(model));
    if (foundModel) terms.model = foundModel;

    // Extract year
    const yearMatch = interest.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) terms.year = parseInt(yearMatch[0]);

    // Extract price range
    const priceMatch = interest.match(/\$?([\d,]+)\s*[-to]\s*\$?([\d,]+)/);
    if (priceMatch) {
      const min = parseInt(priceMatch[1].replace(/,/g, ''));
      const max = parseInt(priceMatch[2].replace(/,/g, ''));
      terms.priceRange = [min, max];
    }

    return terms;
  }

  private calculatePriceRangeOverlap(range1: [number, number], range2: [number, number]): number {
    const [min1, max1] = range1;
    const [min2, max2] = range2;
    
    const overlapMin = Math.max(min1, min2);
    const overlapMax = Math.min(max1, max2);
    
    if (overlapMin >= overlapMax) return 0;
    
    const overlapSize = overlapMax - overlapMin;
    const range1Size = max1 - min1;
    const range2Size = max2 - min2;
    const avgRangeSize = (range1Size + range2Size) / 2;
    
    return overlapSize / avgRangeSize;
  }

  private addRelationships(leadId: string, relationships: ConversationRelationship[]) {
    if (!this.relationships.has(leadId)) {
      this.relationships.set(leadId, []);
    }
    this.relationships.get(leadId)!.push(...relationships);
  }

  // Track user access patterns to improve sequential relationships
  trackAccessSequence(sequence: string[]) {
    if (sequence.length > 1) {
      this.accessSequences.push([...sequence]);
      
      // Keep only recent sequences (last 100)
      if (this.accessSequences.length > 100) {
        this.accessSequences.shift();
      }
    }
  }

  // Get related conversations for a given lead
  getRelatedConversations(leadId: string, maxResults = 5): string[] {
    const relationships = this.relationships.get(leadId) || [];
    
    // Sort by strength and return top results
    return relationships
      .sort((a, b) => b.strength - a.strength)
      .slice(0, maxResults)
      .flatMap(rel => rel.relatedLeadIds);
  }

  // Get relationships by type
  getRelationshipsByType(leadId: string, type: ConversationRelationship['relationshipType']): string[] {
    const relationships = this.relationships.get(leadId) || [];
    
    return relationships
      .filter(rel => rel.relationshipType === type)
      .sort((a, b) => b.strength - a.strength)
      .flatMap(rel => rel.relatedLeadIds);
  }

  // Get relationship insights
  getRelationshipInsights(leadId: string) {
    const relationships = this.relationships.get(leadId) || [];
    
    const insights = {
      totalRelated: relationships.length,
      byType: {} as Record<string, number>,
      avgStrength: 0,
      strongestRelationships: [] as Array<{ leadId: string; type: string; strength: number }>
    };

    relationships.forEach(rel => {
      insights.byType[rel.relationshipType] = (insights.byType[rel.relationshipType] || 0) + 1;
      insights.avgStrength += rel.strength;
      
      rel.relatedLeadIds.forEach(relatedId => {
        insights.strongestRelationships.push({
          leadId: relatedId,
          type: rel.relationshipType,
          strength: rel.strength
        });
      });
    });

    insights.avgStrength = insights.avgStrength / relationships.length || 0;
    insights.strongestRelationships.sort((a, b) => b.strength - a.strength);
    insights.strongestRelationships = insights.strongestRelationships.slice(0, 5);

    return insights;
  }

  // Get global relationship statistics
  getGlobalInsights() {
    const totalRelationships = Array.from(this.relationships.values())
      .reduce((sum, rels) => sum + rels.length, 0);
    
    const typeDistribution = {} as Record<string, number>;
    let totalStrength = 0;
    
    this.relationships.forEach(rels => {
      rels.forEach(rel => {
        typeDistribution[rel.relationshipType] = (typeDistribution[rel.relationshipType] || 0) + 1;
        totalStrength += rel.strength;
      });
    });

    return {
      totalConversations: this.relationships.size,
      totalRelationships,
      avgRelationshipsPerConversation: totalRelationships / this.relationships.size || 0,
      avgStrength: totalStrength / totalRelationships || 0,
      typeDistribution,
      accessSequencesTracked: this.accessSequences.length
    };
  }
}

export const conversationRelationshipEngine = new ConversationRelationshipEngine();
