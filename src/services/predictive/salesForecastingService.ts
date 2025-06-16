
// Re-export everything from the core modules for backward compatibility
export type { 
  SalesForecast, 
  LeadConversionPrediction, 
  PipelineForecast 
} from './forecasting/salesForecastCore';

export type { LeadConversionPrediction as LeadConversion } from './forecasting/leadConversionCore';

// Sales forecast functions
export { 
  generateSalesForecast, 
  getSalesForecasts 
} from './forecasting/salesForecastCore';

// Lead conversion functions
export { 
  calculateLeadConversionPredictions, 
  getLeadConversionPredictions 
} from './forecasting/leadConversionCore';

// Pipeline forecast functions
export { 
  generatePipelineForecast 
} from './forecasting/pipelineForecastCore';
