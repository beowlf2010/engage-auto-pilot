import { useState, useCallback } from 'react';

interface SavedMapping<T = any> {
  headers: string[];
  mapping: T;
  timestamp: number;
  fileName?: string;
}

interface MappingPersistenceOptions {
  storageKey: string;
  maxAge?: number; // in milliseconds
}

export const useMappingPersistence = <T extends Record<string, any>>(options: MappingPersistenceOptions) => {
  const { storageKey, maxAge = 30 * 24 * 60 * 60 * 1000 } = options; // 30 days default

  // Generate a fingerprint for CSV headers to detect structure changes
  const generateHeaderFingerprint = useCallback((headers: string[]): string => {
    return headers
      .map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''))
      .sort()
      .join('|');
  }, []);

  // Save mapping with CSV structure fingerprint
  const saveMapping = useCallback((
    headers: string[],
    mapping: T,
    fileName?: string
  ) => {
    const fingerprint = generateHeaderFingerprint(headers);
    const savedMapping: SavedMapping<T> = {
      headers,
      mapping,
      timestamp: Date.now(),
      fileName
    };

    try {
      const existingMappings = JSON.parse(localStorage.getItem(storageKey) || '{}');
      existingMappings[fingerprint] = savedMapping;
      localStorage.setItem(storageKey, JSON.stringify(existingMappings));
      console.log('💾 Saved CSV mapping for structure:', fingerprint);
    } catch (error) {
      console.error('Failed to save CSV mapping:', error);
    }
  }, [storageKey, generateHeaderFingerprint]);

  // Load mapping if CSV structure matches a saved one
  const loadMapping = useCallback((headers: string[]): T | null => {
    try {
      const fingerprint = generateHeaderFingerprint(headers);
      const existingMappings = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const savedMapping = existingMappings[fingerprint];

      if (!savedMapping) {
        console.log('🔍 No saved mapping found for CSV structure:', fingerprint);
        return null;
      }

      // Check if mapping is expired
      if (Date.now() - savedMapping.timestamp > maxAge) {
        console.log('⏰ Saved mapping expired, removing:', fingerprint);
        delete existingMappings[fingerprint];
        localStorage.setItem(storageKey, JSON.stringify(existingMappings));
        return null;
      }

      console.log('✅ Found saved mapping for CSV structure:', fingerprint);
      return savedMapping.mapping;
    } catch (error) {
      console.error('Failed to load CSV mapping:', error);
      return null;
    }
  }, [storageKey, generateHeaderFingerprint, maxAge]);

  // Check if current CSV structure has a saved mapping
  const hasSavedMapping = useCallback((headers: string[]): boolean => {
    const mapping = loadMapping(headers);
    return mapping !== null;
  }, [loadMapping]);

  // Clear all saved mappings
  const clearMappings = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      console.log('🗑️ Cleared all saved CSV mappings');
    } catch (error) {
      console.error('Failed to clear CSV mappings:', error);
    }
  }, [storageKey]);

  return {
    saveMapping,
    loadMapping,
    hasSavedMapping,
    clearMappings
  };
};