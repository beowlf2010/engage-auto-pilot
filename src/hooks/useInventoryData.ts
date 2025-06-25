
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDataCompletenessScore } from "@/services/inventory/vehicleFormattingService";
import { InventoryFilters, InventoryItem } from "@/services/inventory/types";

export const useInventoryData = (filters: InventoryFilters, searchTerm: string) => {
  return useQuery({
    queryKey: ['inventory-enhanced', filters, searchTerm],
    queryFn: async () => {
      try {
        console.log('Fetching inventory with filters:', filters);
        
        // First, get inventory data without the problematic join
        let query = supabase
          .from('inventory')
          .select('*');

        // Apply filters
        if (filters.make) {
          query = query.ilike('make', `%${filters.make}%`);
        }
        if (filters.model) {
          query = query.ilike('model', `%${filters.model}%`);
        }
        if (filters.inventoryType && filters.inventoryType !== 'all') {
          query = query.eq('condition', filters.inventoryType);
        }
        if (filters.sourceReport) {
          query = query.eq('source_report', filters.sourceReport);
        }
        if (filters.rpoCode) {
          query = query.contains('rpo_codes', [filters.rpoCode]);
        }
        if (filters.yearMin) {
          query = query.gte('year', filters.yearMin);
        }
        if (filters.yearMax) {
          query = query.lte('year', filters.yearMax);
        }
        if (filters.priceMin) {
          query = query.gte('price', filters.priceMin);
        }
        if (filters.priceMax) {
          query = query.lte('price', filters.priceMax);
        }
        if (searchTerm) {
          query = query.or(`vin.ilike.%${searchTerm}%,stock_number.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
        }

        const { data: inventoryData, error: inventoryError } = await query;
        if (inventoryError) throw inventoryError;

        console.log(`Fetched ${inventoryData?.length || 0} inventory items`);

        // Get deals data separately to avoid join issues
        let dealsData: any[] = [];
        if (inventoryData && inventoryData.length > 0) {
          try {
            const stockNumbers = inventoryData
              .map(item => item.stock_number)
              .filter(Boolean);
            
            if (stockNumbers.length > 0) {
              const { data: deals, error: dealsError } = await supabase
                .from('deals')
                .select('*')
                .in('stock_number', stockNumbers);
              
              if (!dealsError) {
                dealsData = deals || [];
              }
            }
          } catch (dealsError) {
            console.warn('Could not fetch deals data:', dealsError);
          }
        }

        // Process the data to include deal information and data quality with error handling
        let processedData: InventoryItem[] = inventoryData?.map(vehicle => {
          try {
            // Find related deals for this vehicle
            const vehicleDeals = dealsData.filter(deal => 
              deal.stock_number === vehicle.stock_number
            );

            // Ensure condition is properly typed
            const typedCondition = (['new', 'used', 'certified'].includes(vehicle.condition)) 
              ? vehicle.condition as 'new' | 'used' | 'certified'
              : 'used' as const;

            // Ensure status is properly typed
            const typedStatus = (['available', 'sold', 'pending', 'service', 'wholesale'].includes(vehicle.status)) 
              ? vehicle.status as 'available' | 'sold' | 'pending' | 'service' | 'wholesale'
              : 'available' as const;

            return {
              ...vehicle,
              condition: typedCondition,
              status: typedStatus,
              deals: vehicleDeals,
              deal_count: vehicleDeals.length,
              latest_deal: vehicleDeals.length > 0 
                ? vehicleDeals.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())[0]
                : null,
              data_completeness: getDataCompletenessScore(vehicle)
            };
          } catch (error) {
            console.error('Error processing vehicle data:', error, vehicle);
            return {
              ...vehicle,
              condition: 'used' as const,
              status: 'available' as const,
              deals: [],
              deal_count: 0,
              latest_deal: null,
              data_completeness: 0
            };
          }
        }) || [];

        // Apply data quality filter
        if (filters.dataQuality === 'complete') {
          processedData = processedData.filter(v => (v.data_completeness || 0) >= 80);
        } else if (filters.dataQuality === 'incomplete') {
          processedData = processedData.filter(v => (v.data_completeness || 0) < 80);
        }

        // Apply sorting
        processedData.sort((a, b) => {
          let aVal, bVal;
          
          switch (filters.sortBy) {
            case 'age':
              aVal = a.days_in_inventory || 0;
              bVal = b.days_in_inventory || 0;
              break;
            case 'price':
              aVal = a.price || 0;
              bVal = b.price || 0;
              break;
            case 'year':
              aVal = a.year || 0;
              bVal = b.year || 0;
              break;
            case 'make':
              aVal = a.make || '';
              bVal = b.make || '';
              break;
            case 'model':
              aVal = a.model || '';
              bVal = b.model || '';
              break;
            case 'completeness':
              aVal = a.data_completeness || 0;
              bVal = b.data_completeness || 0;
              break;
            default:
              return 0;
          }
          
          if (typeof aVal === 'string') {
            return filters.sortOrder === 'asc' 
              ? aVal.localeCompare(bVal) 
              : bVal.localeCompare(aVal);
          }
          
          return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
        
        console.log(`Processed ${processedData.length} inventory items with deals data`);
        return processedData;
      } catch (error) {
        console.error('Error fetching inventory:', error);
        throw error;
      }
    }
  });
};
