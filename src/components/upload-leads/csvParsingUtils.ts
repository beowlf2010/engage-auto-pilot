
import { parseCSVText, type ParsedCSVData } from '@/utils/csvParser';

export const parseCSV = (text: string): ParsedCSVData => {
  return parseCSVText(text);
};
