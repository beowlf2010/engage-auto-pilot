export interface InventoryFieldMapping {
  // Vehicle Information - Core fields
  vehicle?: string;           // Combined field like "2019 Honda Accord EX-L"
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  
  // Identifiers
  stockNumber?: string;       // Stock #
  vin?: string;              // VIN
  
  // Vehicle Details
  odometer?: string;         // Mileage
  color?: string;            // Color
  exteriorColor?: string;    // More specific color fields
  interiorColor?: string;
  
  // Status & Condition
  status?: string;           // Status
  condition?: string;        // New/Used/Certified
  certified?: string;        // Certified
  age?: string;             // Age
  
  // Pricing
  price?: string;           // Price
  listPrice?: string;       // List Price
  msrp?: string;           // MSRP
  cost?: string;           // Cost
  bookValue?: string;      // Book
  costToMarket?: string;   // Cost To Market
  markup?: string;         // Markup
  mmrWholesale?: string;   // MMR Wholesale
  
  // Vehicle Description & Features
  autowriterDescription?: string;  // Autowriter Description
  photos?: string;                 // Photos
  
  // Market Data - AutoTrader
  autoTraderListPrice?: string;
  autoTraderOdometer?: string;  
  autoTraderImageCount?: string;
  autoTraderSRP?: string;
  autoTraderVDP?: string;
  autoTraderVDPPercent?: string;
  
  // Market Data - Cars.com
  carsComListPrice?: string;
  carsComOdometer?: string;
  carsComImageCount?: string;
  carsComSRP?: string;
  carsComVDP?: string;
  carsComVDPPercent?: string;
  
  // Market Data - CarGurus
  carGurusListPrice?: string;
  carGurusOdometer?: string;
  carGurusImageCount?: string;
  carGurusSRP?: string;
  carGurusVDP?: string;
  carGurusVDPPercent?: string;
  
  // Market Data - Dealer Site
  dealerSiteListPrice?: string;
  dealerSiteOdometer?: string;
  dealerSiteImageCount?: string;
  dealerSiteSRP?: string;
  dealerSiteVDP?: string;
  dealerSiteVDPPercent?: string;
  
  // Carfax & Reports
  carfaxHasReport?: string;
  carfaxHasManufacturerRecall?: string;
  carfaxHasWarnings?: string;
  carfaxHasProblems?: string;
  
  // Ranking & Analytics
  defaultPercentOfMarket?: string;
  lastDollarChange?: string;
  water?: string;
  overall?: string;
  likeMine?: string;
  priceRankDescription?: string;
  vRankDescription?: string;
  vinLeads?: string;
  
  // Additional fields
  deletedDate?: string;
  redBlack?: string;  // Red/Black column
}