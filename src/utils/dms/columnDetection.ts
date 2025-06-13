
import { DmsColumns } from './types';

export const detectDmsColumns = (data: any[]): DmsColumns | null => {
  // Look for header row with your specific DMS column names
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    
    const columns: DmsColumns = {};
    
    // Look for exact matches with your column headers
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '').trim();
      
      if (cell === 'Date') {
        columns.date = cell;
      } else if (cell === 'Age') {
        columns.age = cell;
      } else if (cell === 'Stock') {
        columns.stockNumber = cell;
      } else if (cell === 'Vin6') {
        columns.vin6 = cell;
      } else if (cell === 'Vehicle') {
        columns.vehicle = cell;
      } else if (cell === 'Trade') {
        columns.trade = cell;
      } else if (cell === 'SLP') {
        columns.slp = cell;
      } else if (cell === 'Customer') {
        columns.customer = cell;
      } else if (cell === 'Gross') {
        columns.gross = cell;
      } else if (cell === 'FI') {
        columns.fi = cell;
      } else if (cell === 'Total') {
        columns.total = cell;
      }
    }
    
    // Check if we found the core required columns
    const foundColumns = Object.keys(columns).length;
    console.log(`Row ${i}: Found ${foundColumns} DMS columns`);
    
    if (foundColumns >= 6) { // Need at least 6 core columns
      console.log('DMS format detected at row', i);
      return columns;
    }
  }
  
  return null;
};
