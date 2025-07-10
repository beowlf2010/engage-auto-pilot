
import { supabase } from "@/integrations/supabase/client";
import { DealRecord, FinancialSummary } from "../dms/types";
import { createInitialProfitSnapshot } from "@/services/financial/profitHistoryService";
import { updateInventoryStatusFromDeals } from "../inventoryDealSync";

export const insertFinancialData = async (
  deals: DealRecord[],
  summary: FinancialSummary,
  uploadHistoryId: string,
  reportDate?: string
) => {
  console.log('=== FINANCIAL DATA INSERTION WITH DEAL TYPE PRESERVATION ===');
  console.log(`Starting with ${deals.length} extracted deals`);
  
  // Filter out deals with invalid data BEFORE processing
  const validDeals = deals.filter(deal => {
    if (!deal.saleDate) {
      console.warn(`Skipping deal ${deal.stockNumber}: No valid sale date`);
      return false;
    }
    if (!deal.stockNumber && (deal.grossProfit === undefined || deal.grossProfit === null)) {
      console.warn(`Skipping deal: No stock number and no gross profit`);
      return false;
    }
    return true;
  });
  
  console.log(`After filtering: ${validDeals.length} valid deals (${deals.length - validDeals.length} skipped due to missing data)`);
  
  if (validDeals.length === 0) {
    throw new Error('No valid deals found after filtering. Check date parsing and required fields.');
  }

  // PRE-VALIDATION: Check which stock numbers exist in inventory
  const stockNumbers = validDeals.map(deal => deal.stockNumber).filter(Boolean);
  console.log(`Checking inventory for ${stockNumbers.length} unique stock numbers`);
  
  const { data: existingInventory } = await supabase
    .from('inventory')
    .select('stock_number')
    .in('stock_number', stockNumbers);

  const inventoryStockNumbers = new Set(existingInventory?.map(inv => inv.stock_number) || []);
  const missingFromInventory = stockNumbers.filter(stockNum => !inventoryStockNumbers.has(stockNum));
  
  console.log(`=== INVENTORY VALIDATION RESULTS ===`);
  console.log(`Stock numbers in inventory: ${inventoryStockNumbers.size}`);
  console.log(`Stock numbers missing from inventory: ${missingFromInventory.length}`);
  if (missingFromInventory.length > 0) {
    console.log(`Missing stock numbers:`, missingFromInventory);
  }
  
  try {
    // Get existing deals to preserve their deal_type and lock status
    const stockNumbers = validDeals.map(deal => deal.stockNumber).filter(Boolean);
    const { data: existingDeals } = await supabase
      .from('deals')
      .select('id, stock_number, deal_type, deal_type_locked, gross_profit, fi_profit, total_profit')
      .in('stock_number', stockNumbers);

    console.log(`Found ${existingDeals?.length || 0} existing deals to preserve deal types for`);

    // Create a map of existing deal types and lock status
    const existingDealMap = new Map(
      existingDeals?.map(deal => [
        deal.stock_number, 
        { 
          id: deal.id,
          deal_type: deal.deal_type, 
          deal_type_locked: deal.deal_type_locked,
          existing_gross: deal.gross_profit,
          existing_fi: deal.fi_profit,
          existing_total: deal.total_profit
        }
      ]) || []
    );

    // Map deals to database format - preserving existing deal types and lock status
    const dealRecords = validDeals.map(deal => {
      const dealDate = deal.saleDate!; // We know it's valid from filtering above
      const existing = existingDealMap.get(deal.stockNumber || '');
      
      // Handle missing inventory gracefully - set stock_number to null if not in inventory
      const hasInventory = deal.stockNumber && inventoryStockNumbers.has(deal.stockNumber);
      const finalStockNumber = hasInventory ? deal.stockNumber : null;
      
      if (!hasInventory && deal.stockNumber) {
        console.warn(`Deal ${deal.stockNumber}: Stock number not found in inventory, will process without inventory link`);
      }
      
      console.log(`Processing deal ${deal.stockNumber}: saleDate=${deal.saleDate}, hasInventory=${hasInventory}, existing_type=${existing?.deal_type}, locked=${existing?.deal_type_locked}`);
      
      return {
        upload_date: dealDate, // Use individual deal date as upload_date for database storage
        stock_number: finalStockNumber, // NULL for missing inventory to avoid foreign key constraint
        age: deal.age || null,
        year_model: deal.yearModel || null,
        buyer_name: deal.buyerName || null,
        sale_amount: deal.saleAmount || null,
        cost_amount: deal.costAmount || null,
        gross_profit: deal.grossProfit || null,
        fi_profit: deal.fiProfit || null,
        total_profit: deal.totalProfit || null,
        // PRESERVE existing deal_type and lock status, only default to retail for truly new deals
        deal_type: existing?.deal_type || deal.dealType || 'retail',
        deal_type_locked: existing?.deal_type_locked ?? false,
        upload_history_id: uploadHistoryId,
        original_gross_profit: deal.grossProfit || null,
        original_fi_profit: deal.fiProfit || null,
        original_total_profit: deal.totalProfit || null,
        first_reported_date: existing ? undefined : dealDate, // Only set for new deals
        // Store original stock number for tracking even if we can't link to inventory
        original_stock_number: deal.stockNumber || null
      };
    });

    console.log(`Prepared ${dealRecords.length} deal records for insertion with preserved deal types`);
    console.log('Sample deal record to insert:', dealRecords[0]);

    // Separate deals with and without stock numbers for different insertion strategies
    const dealsWithStock = dealRecords.filter(deal => deal.stock_number !== null);
    const dealsWithoutStock = dealRecords.filter(deal => deal.stock_number === null);
    
    let insertedDeals = [];
    
    // Insert deals with stock numbers using upsert
    if (dealsWithStock.length > 0) {
      const { data: stockDeals, error: stockError } = await supabase
        .from('deals')
        .upsert(dealsWithStock, {
          onConflict: 'stock_number',
          ignoreDuplicates: false
        })
        .select();
        
      if (stockError) {
        console.error('Error inserting deals with stock numbers:', stockError);
        throw new Error(`Failed to insert deals with stock numbers: ${stockError.message}`);
      }
      
      insertedDeals.push(...(stockDeals || []));
    }
    
    // Insert deals without stock numbers using regular insert (no upsert conflict)
    if (dealsWithoutStock.length > 0) {
      const { data: nostockDeals, error: nostockError } = await supabase
        .from('deals')
        .insert(dealsWithoutStock)
        .select();
        
      if (nostockError) {
        console.error('Error inserting deals without stock numbers:', nostockError);
        throw new Error(`Failed to insert deals without stock numbers: ${nostockError.message}`);
      }
      
      insertedDeals.push(...(nostockDeals || []));
    }

    const insertedCount = insertedDeals?.length || 0;
    console.log(`Successfully upserted ${insertedCount} deals while preserving deal types`);

    // Mark corresponding inventory as sold based on the deals we just inserted
    if (stockNumbers.length > 0) {
      try {
        console.log('Marking vehicles as sold based on financial data...');
        await updateInventoryStatusFromDeals(stockNumbers);
      } catch (syncError) {
        console.warn('Failed to sync inventory status:', syncError);
        // Don't fail the whole operation if sync fails
      }
    }

    // Create initial profit snapshots only for truly new deals (not in existingDealMap)
    if (insertedDeals) {
      const newDealSnapshots = insertedDeals.filter(deal => 
        deal.stock_number && !existingDealMap.has(deal.stock_number)
      );

      console.log(`Creating initial profit snapshots for ${newDealSnapshots.length} new deals`);
      
      for (const deal of newDealSnapshots) {
        try {
          await createInitialProfitSnapshot(
            deal.id,
            deal.stock_number || '',
            deal.gross_profit || 0,
            deal.fi_profit || 0,
            deal.total_profit || 0,
            uploadHistoryId
          );
        } catch (snapshotError) {
          console.warn(`Failed to create profit snapshot for deal ${deal.stock_number}:`, snapshotError);
          // Don't fail the whole operation if snapshot creation fails
        }
      }
    }

    // Log preservation summary
    const preservedCount = dealRecords.filter(deal => 
      existingDealMap.has(deal.stock_number || '') && existingDealMap.get(deal.stock_number || '')?.deal_type !== 'retail'
    ).length;
    
    console.log(`=== DEAL TYPE PRESERVATION SUMMARY ===`);
    console.log(`Total deals processed: ${insertedCount}`);
    console.log(`Existing deals with preserved types: ${preservedCount}`);
    console.log(`New deals defaulted to retail: ${insertedCount - preservedCount}`);
    
    if (insertedCount !== dealRecords.length) {
      console.warn(`Warning: Tried to insert ${dealRecords.length} deals but only ${insertedCount} were successful`);
    }

    return {
      insertedCount,
      validDeals,
      dealRecords: dealRecords.length,
      totalExtracted: deals.length,
      skippedDeals: deals.length - validDeals.length,
      preservedDealTypes: preservedCount,
      // Inventory validation metrics
      dealsWithInventoryLink: dealsWithStock.length,
      dealsWithoutInventoryLink: dealsWithoutStock.length,
      missingFromInventory: missingFromInventory.length,
      missingStockNumbers: missingFromInventory
    };

  } catch (error) {
    console.error('Financial data insertion failed:', error);
    throw error;
  }
};
