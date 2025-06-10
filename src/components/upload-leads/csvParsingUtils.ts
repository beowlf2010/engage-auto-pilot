
export const parseCSV = (text: string) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    return row;
  });

  const sample = rows[0] || {};
  return { headers, rows, sample };
};
