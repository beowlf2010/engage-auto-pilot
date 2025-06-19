
import { extractVehicleFields } from './field-extraction';
import { extractVINField } from './field-extraction';
import { extractOptionsFields } from './field-extraction';
import { extractGMGlobalFields } from './field-extraction/gmGlobalEnhanced';
import { parseNewCarMainView } from './field-extraction/newCarMainViewParser';
import { detectReportType, type ReportType } from './reportDetection';
import type { InventoryItem, UploadCondition } from './inventoryMapper';

export interface EnhancedMappingResult {
  item: InventoryItem;
  reportType: ReportType;
  confidence: number;
  dataQualityScore: number;
}

export const mapRowToInventoryItemEnhanced = (
  row: any,
  condition: UploadCondition,
  uploadId: string,
  filename: string,
  allHeaders: string[]
): EnhancedMappingResult => {
  console.log('Enhanced mapping for row with condition:', condition);

  // Detect the actual report type from filename and headers
  const detection = detectReportType(filename, allHeaders);
  console.log('Report detection result:', detection);

  let mappedData: any;
  let dataQualityScore = 50; // Base score

  try {
    // Use report-specific parsing
    switch (detection.reportType) {
      case 'new_car_main_view':
        console.log('Using NEW CAR MAIN VIEW parser');
        mappedData = parseNewCarMainView(row);
        dataQualityScore += 20; // Bonus for structured format
        break;

      case 'gm_global':
        console.log('Using GM Global parser');
        mappedData = extractGMGlobalFields(row);
        mappedData.condition = 'new';
        mappedData.status = 'available';
        dataQualityScore += 25; // Bonus for comprehensive data
        break;

      case 'merch_inv_view':
        console.log('Using standard vehicle fields parser');
        mappedData = {
          ...extractVehicleFields(row),
          ...extractVINField(row),
          ...extractOptionsFields(row),
          condition: condition === 'new' ? 'new' : 'used',
          status: 'available'
        };
        dataQualityScore += 10;
        break;

      default:
        console.log('Using fallback parser');
        mappedData = {
          make: row.make || row.Make || 'Unknown',
          model: row.model || row.Model || 'Unknown',
          condition: condition === 'new' ? 'new' : 'used',
          status: 'available'
        };
        dataQualityScore -= 10; // Penalty for unknown format
        break;
    }

    // Calculate data quality score based on completeness
    if (mappedData.vin && mappedData.vin.length === 17) dataQualityScore += 15;
    if (mappedData.stock_number) dataQualityScore += 10;
    if (mappedData.make && mappedData.make !== 'Unknown') dataQualityScore += 10;
    if (mappedData.model && mappedData.model !== 'Unknown') dataQualityScore += 10;
    if (mappedData.year && mappedData.year > 1900) dataQualityScore += 5;
    if (mappedData.price && mappedData.price > 0) dataQualityScore += 10;

    // Ensure required fields have defaults
    const inventoryItem: InventoryItem = {
      make: mappedData.make || 'Unknown',
      model: mappedData.model || 'Unknown',
      condition: mappedData.condition || (condition === 'gm_global' ? 'new' : condition),
      status: mappedData.status || 'available',
      upload_history_id: uploadId,
      source_report: detection.sourceReport as any,
      ...mappedData
    };

    // Calculate delivery variance if we have both dates
    if (inventoryItem.actual_delivery_date && inventoryItem.estimated_delivery_date) {
      try {
        const actualDate = new Date(inventoryItem.actual_delivery_date);
        const estimatedDate = new Date(inventoryItem.estimated_delivery_date);
        const diffTime = actualDate.getTime() - estimatedDate.getTime();
        inventoryItem.delivery_variance_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } catch (error) {
        console.error('Error calculating delivery variance:', error);
      }
    }

    // Ensure data quality score is within bounds
    dataQualityScore = Math.max(0, Math.min(100, dataQualityScore));

    console.log('Enhanced mapping result:', {
      reportType: detection.reportType,
      confidence: detection.confidence,
      dataQualityScore,
      make: inventoryItem.make,
      model: inventoryItem.model,
      stock_number: inventoryItem.stock_number,
      vin: inventoryItem.vin
    });

    return {
      item: inventoryItem,
      reportType: detection.reportType,
      confidence: detection.confidence,
      dataQualityScore
    };

  } catch (error) {
    console.error('Critical error in enhanced mapping:', error);
    
    // Return minimal valid inventory item
    return {
      item: {
        make: row.make || row.Make || 'Unknown',
        model: row.model || row.Model || 'Unknown',
        condition: condition === 'gm_global' ? 'new' : (condition === 'new' ? 'new' : 'used'),
        status: 'available',
        upload_history_id: uploadId,
        source_report: detection.sourceReport as any
      },
      reportType: 'unknown',
      confidence: 0.1,
      dataQualityScore: 0
    };
  }
};
