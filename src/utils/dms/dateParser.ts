
export const extractDealDate = (dateValue: string): string | null => {
  if (!dateValue || String(dateValue).trim() === '') {
    console.log(`=== DATE PARSING === Empty or null input, returning null`);
    return null;
  }
  
  const dateStr = String(dateValue).trim();
  console.log(`=== DATE PARSING === Input: "${dateStr}" (type: ${typeof dateValue})`);
  
  // Get current year as default
  const currentYear = new Date().getFullYear();
  
  // First, try to parse as Excel serial number (most common in DMS exports)
  const numericDate = parseFloat(dateStr);
  if (!isNaN(numericDate) && numericDate > 25000 && numericDate < 60000) {
    // Excel date serial number (days since 1900-01-01, accounting for Excel's leap year bug)
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (numericDate - 2) * 24 * 60 * 60 * 1000);
    const result = date.toISOString().split('T')[0];
    console.log(`Excel serial ${numericDate} -> ${result}`);
    return result;
  }
  
  // Try different common date formats - focus on month/day, assume current year
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY - keep full year
    /^(\d{1,2})\/(\d{1,2})$/, // MM/DD - assume current year
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // MM/DD/YY - convert to current century
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD - keep as is
    /^(\d{1,2})-(\d{1,2})$/, // MM-DD - assume current year
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{2})$/, // MM-DD-YY
    /^(\d{2})(\d{2})$/, // MMDD - assume current year
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M$/, // MM/DD/YYYY HH:MM:SS AM/PM
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+\d{1,2}:\d{2}:\d{2}$/, // YYYY-MM-DD HH:MM:SS
  ];
  
  for (let i = 0; i < formats.length; i++) {
    const format = formats[i];
    const match = dateStr.match(format);
    if (match) {
      console.log(`Matched format ${i}:`, match);
      
      let monthStr: string, dayStr: string, yearNum: number = currentYear;
      
      if (i === 0) { // MM/DD/YYYY
        [, monthStr, dayStr] = match;
        yearNum = parseInt(match[3]);
      } else if (i === 1) { // MM/DD - use current year
        [, monthStr, dayStr] = match;
        console.log(`Month/Day format, using current year: ${yearNum}`);
      } else if (i === 2) { // MM/DD/YY
        [, monthStr, dayStr] = match;
        // Simple 2-digit year: assume 2000s
        yearNum = 2000 + parseInt(match[3]);
        console.log(`2-digit year converted to: ${yearNum}`);
      } else if (i === 3) { // YYYY-MM-DD
        console.log(`Already in ISO format: ${match[0]}`);
        return match[0];
      } else if (i === 4) { // MM-DD - use current year
        [, monthStr, dayStr] = match;
        console.log(`Month-Day format, using current year: ${yearNum}`);
      } else if (i === 5) { // MM-DD-YYYY
        [, monthStr, dayStr] = match;
        yearNum = parseInt(match[3]);
      } else if (i === 6) { // MM-DD-YY
        [, monthStr, dayStr] = match;
        yearNum = 2000 + parseInt(match[3]);
        console.log(`2-digit year converted to: ${yearNum}`);
      } else if (i === 7) { // MMDD - use current year
        monthStr = match[0].substring(0, 2);
        dayStr = match[0].substring(2, 4);
        console.log(`MMDD format, using current year: ${yearNum}`);
      } else if (i === 8) { // MM/DD/YYYY HH:MM:SS AM/PM
        [, monthStr, dayStr] = match;
        yearNum = parseInt(match[3]);
        console.log(`DateTime format with time, extracted: ${monthStr}/${dayStr}/${yearNum}`);
      } else if (i === 9) { // YYYY-MM-DD HH:MM:SS
        console.log(`ISO DateTime format: ${match[0].split(' ')[0]}`);
        return match[0].split(' ')[0];
      }
      
      if (monthStr && dayStr) {
        // Validate month and day ranges
        const monthNum = parseInt(monthStr);
        const dayNum = parseInt(dayStr);
        
        if (monthNum < 1 || monthNum > 12) {
          console.warn(`Invalid month: ${monthNum}`);
          continue;
        }
        
        if (dayNum < 1 || dayNum > 31) {
          console.warn(`Invalid day: ${dayNum}`);
          continue;
        }
        
        const result = `${yearNum}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
        console.log(`Final parsed date: ${result}`);
        return result;
      }
    }
  }
  
  // Try parsing as a standard JavaScript date as last resort
  try {
    const jsDate = new Date(dateStr);
    if (!isNaN(jsDate.getTime())) {
      const result = jsDate.toISOString().split('T')[0];
      console.log(`JS Date parse: ${result}`);
      return result;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  console.error(`FAILED TO PARSE DATE: "${dateStr}" - returning null`);
  return null;
};
