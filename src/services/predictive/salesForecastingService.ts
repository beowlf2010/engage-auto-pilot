
// Re-export everything from the core modules for backward compatibility
export type { 
  SalesForecast
} from './forecasting/salesForecastCore';

export type { LeadConversionPrediction } from './forecasting/leadConversionCore';

export type { PipelineForecast } from './forecasting/pipelineForecastCore';

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
