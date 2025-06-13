
export const extractDealDate = (dateValue: string): string | null => {
  if (!dateValue) return null;
  
  const dateStr = dateValue.trim();
  console.log(`=== DATE PARSING === Input: "${dateStr}"`);
  
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
  
  // Try different common date formats with FIXED 2-digit year handling
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or M/D/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // MM/DD/YY or M/D/YY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{2})$/, // MM-DD-YY
    /^(\d{2})(\d{2})(\d{4})$/, // MMDDYYYY
    /^(\d{2})(\d{2})(\d{2})$/, // MMDDYY
  ];
  
  for (let i = 0; i < formats.length; i++) {
    const format = formats[i];
    const match = dateStr.match(format);
    if (match) {
      console.log(`Matched format ${i}:`, match);
      
      let month, day, year;
      
      if (i === 0) { // MM/DD/YYYY
        [, month, day, year] = match;
      } else if (i === 1) { // MM/DD/YY
        [, month, day, year] = match;
        // FIXED 2-digit year logic: 00-50 = 2000s, 51-99 = 1900s
        const twoDigitYear = parseInt(year);
        if (twoDigitYear <= 50) {
          year = String(2000 + twoDigitYear);
          console.log(`2-digit year ${twoDigitYear} interpreted as ${year} (2000s)`);
        } else {
          year = String(1900 + twoDigitYear);
          console.log(`2-digit year ${twoDigitYear} interpreted as ${year} (1900s)`);
        }
      } else if (i === 2) { // YYYY-MM-DD
        console.log(`Already in ISO format: ${match[0]}`);
        return match[0];
      } else if (i === 3) { // MM-DD-YYYY
        [, month, day, year] = match;
      } else if (i === 4) { // MM-DD-YY
        [, month, day, year] = match;
        const twoDigitYear = parseInt(year);
        if (twoDigitYear <= 50) {
          year = String(2000 + twoDigitYear);
          console.log(`2-digit year ${twoDigitYear} interpreted as ${year} (2000s)`);
        } else {
          year = String(1900 + twoDigitYear);
          console.log(`2-digit year ${twoDigitYear} interpreted as ${year} (1900s)`);
        }
      } else if (i === 5) { // MMDDYYYY
        [, month, day, year] = match;
      } else if (i === 6) { // MMDDYY
        [, month, day, year] = match;
        const twoDigitYear = parseInt(year);
        if (twoDigitYear <= 50) {
          year = String(2000 + twoDigitYear);
          console.log(`2-digit year ${twoDigitYear} interpreted as ${year} (2000s)`);
        } else {
          year = String(1900 + twoDigitYear);
          console.log(`2-digit year ${twoDigitYear} interpreted as ${year} (1900s)`);
        }
      }
      
      if (month && day && year) {
        const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        console.log(`Final parsed date: ${result}`);
        return result;
      }
    }
  }
  
  // Try parsing as a standard JavaScript date
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
