
import { DealRecord, FinancialSummary } from "./dms/types";
import { insertFinancialData as insertDeals } from "./financial/dealInsertion";
import { createProfitSnapshot } from "./financial/profitSnapshot";

// Main function that orchestrates the entire financial data insertion process
export const insertFinancialData = async (
  deals: DealRecord[],
  summary: FinancialSummary,
  uploadHistoryId: string,
  reportDate?: string
) => {
  try {
    // Insert deals and get validation results
    const insertResult = await insertDeals(deals, summary, uploadHistoryId, reportDate);
    
    // Create profit snapshot using the validated deals
    const snapshotResult = await createProfitSnapshot(
      insertResult.validDeals,
      uploadHistoryId,
      reportDate
    );

    return {
      insertedDeals: insertResult.insertedCount,
      summary: snapshotResult.summary,
      reportDate: snapshotResult.reportDate,
      totalExtracted: insertResult.totalExtracted,
      validDeals: insertResult.validDeals.length,
      skippedDeals: insertResult.skippedDeals
    };

  } catch (error) {
    console.error('Financial data insertion failed:', error);
    throw error;
  }
};

// Re-export all other functions for backward compatibility
export { updateDealType } from "./financial/dealOperations";
export { getMonthlyRetailSummary } from "./financial/monthlyRetailSummary";
