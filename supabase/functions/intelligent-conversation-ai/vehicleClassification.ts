
// Enhanced vehicle category classification with new/used awareness
export const classifyVehicle = (vehicleInterest: string) => {
  const interest = vehicleInterest.toLowerCase();
  
  // Determine if this is likely a new or used inquiry
  const yearMatch = interest.match(/\b(19|20)\d{2}\b/);
  const currentYear = new Date().getFullYear();
  const isUsedByYear = yearMatch && parseInt(yearMatch[0]) < currentYear;
  const hasUsedKeywords = /\b(used|pre-owned|certified|pre owned)\b/i.test(interest);
  const hasNewKeywords = /\b(new|brand new|latest|2024|2025)\b/i.test(interest);
  
  // Determine condition
  let condition = 'unknown';
  if (hasUsedKeywords || isUsedByYear) {
    condition = 'used';
  } else if (hasNewKeywords || (!yearMatch && !hasUsedKeywords)) {
    condition = 'new'; // Default to new if no clear indicators
  }
  
  // Electric/Hybrid vehicles
  const evBrands = ['tesla', 'rivian', 'lucid', 'polestar', 'bmw i', 'audi e-tron', 'mercedes eqs', 'ford lightning', 'chevy bolt', 'nissan leaf'];
  const hybridTerms = ['hybrid', 'electric', 'ev', 'plug-in', 'prius'];
  
  // Luxury brands
  const luxuryBrands = ['tesla', 'bmw', 'mercedes', 'audi', 'lexus', 'acura', 'infiniti', 'cadillac', 'lincoln', 'genesis', 'porsche', 'jaguar', 'land rover', 'volvo'];
  
  // Economy brands
  const economyBrands = ['honda', 'toyota', 'nissan', 'hyundai', 'kia', 'mazda', 'subaru', 'mitsubishi'];
  
  // Truck/SUV focus
  const truckSuvTerms = ['truck', 'suv', 'crossover', 'pickup', 'f-150', 'silverado', 'ram', 'tahoe', 'suburban', 'explorer'];
  
  const isEV = evBrands.some(brand => interest.includes(brand)) || hybridTerms.some(term => interest.includes(term));
  const isLuxury = luxuryBrands.some(brand => interest.includes(brand));
  const isEconomy = economyBrands.some(brand => interest.includes(brand));
  const isTruckSUV = truckSuvTerms.some(term => interest.includes(term));
  const isTesla = interest.includes('tesla');
  
  return {
    isEV,
    isLuxury,
    isEconomy,
    isTruckSUV,
    isTesla,
    condition,
    category: isTesla ? 'tesla' : isEV ? 'electric' : isLuxury ? 'luxury' : isEconomy ? 'economy' : isTruckSUV ? 'truck_suv' : 'general'
  };
};
