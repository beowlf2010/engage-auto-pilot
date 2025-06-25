
import { useState } from 'react';
import { InventoryFilters } from '@/services/inventory/types';

export const useInventoryFilters = () => {
  const [filters, setFilters] = useState<InventoryFilters>({
    sortBy: 'age',
    sortOrder: 'desc',
    dataQuality: 'all'
  });
  const [searchTerm, setSearchTerm] = useState("");

  const toggleSort = (sortBy: string) => {
    if (filters.sortBy === sortBy) {
      setFilters({
        ...filters,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setFilters({
        ...filters,
        sortBy: sortBy as any,
        sortOrder: 'asc'
      });
    }
  };

  const handleDataQualityFilter = (quality: "all" | "complete" | "incomplete") => {
    setFilters({ ...filters, dataQuality: quality });
  };

  return {
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    toggleSort,
    handleDataQualityFilter
  };
};
