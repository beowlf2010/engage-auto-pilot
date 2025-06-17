
// GM Global code lookup tables for translating codes to readable values
export const GM_DIVISION_CODES: Record<string, string> = {
  'A64': 'Chevrolet',
  'A65': 'GMC',
  'A66': 'Buick',
  'A67': 'Cadillac',
  // Add more division codes as needed
};

export const GM_COLOR_CODES: Record<string, string> = {
  'GBD': 'Cypress Gray',
  'GAZ': 'Summit White',
  'GBA': 'Black',
  'GAN': 'Silver Ice Metallic',
  'GAR': 'Red Hot',
  'GJI': 'Northsky Blue Metallic',
  // Add more color codes as needed
};

export const GM_TRIM_CODES: Record<string, string> = {
  'H2U': 'Jet Black',
  'H2V': 'Dark Ash',
  'H2W': 'Light Ash',
  // Add more trim codes as needed
};

export const translateDivisionCode = (code: string): string => {
  return GM_DIVISION_CODES[code] || code;
};

export const translateColorCode = (code: string): string => {
  return GM_COLOR_CODES[code] || code;
};

export const translateTrimCode = (code: string): string => {
  return GM_TRIM_CODES[code] || code;
};
