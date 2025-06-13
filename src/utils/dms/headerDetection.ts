
import { DmsColumns } from './types';

export const findHeaderRowIndex = (data: any[], columnMapping: DmsColumns): number => {
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (Array.isArray(row)) {
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim();
        if (Object.values(columnMapping).includes(cell)) {
          headerRowIndex = i;
          break;
        }
      }
      if (headerRowIndex !== -1) break;
    }
  }
  return headerRowIndex;
};

export const getColumnIndex = (headerRow: any[], columnName?: string): number => {
  if (!columnName || !Array.isArray(headerRow)) return -1;
  
  for (let i = 0; i < headerRow.length; i++) {
    if (String(headerRow[i] || '').trim() === columnName) {
      return i;
    }
  }
  return -1;
};
