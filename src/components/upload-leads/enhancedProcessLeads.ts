
import { createPhoneNumbers, getPrimaryPhone, hasUsablePhoneNumber } from "@/utils/phoneUtils";
import { checkForDuplicate, ProcessedLead } from "./duplicateDetection";
import { createUploadHistory, updateUploadHistory } from "@/utils/leadOperations/uploadHistoryService";

export interface EnhancedProcessingResult {
  validLeads: ProcessedLead[];
  duplicates: Array<{
    lead: ProcessedLead;
    duplicateType: 'phone' | 'email' | 'name';
    conflictingLead: ProcessedLead;
    rowIndex: number;
  }>;
  errors: Array<{
    rowIndex: number;
    error: string;
    rawData?: Record<string, any>;
  }>;
  warnings: Array<{
    rowIndex: number;
    warning: string;
    warningType: 'phone_validation' | 'data_quality' | 'formatting';
    rawData?: Record<string, any>;
  }>;
  uploadHistoryId: string;
  updates: Array<{
    leadId: string;
    updatedFields: string[];
    rowIndex: number;
  }>;
}

export interface EnhancedProcessingOptions {
  updateExistingLeads?: boolean;
  allowPartialData?: boolean; // New option for flexible imports
  strictPhoneValidation?: boolean; // Option to control phone validation strictness
}

// Enhanced status mapping with complete audit trail
const mapStatusToSystemStatus = (inputStatus: string, rowIndex: number): { 
  mappedStatus: string, 
  mappingLog: Record<string, any> 
} => {
  if (!inputStatus) {
    return {
      mappedStatus: 'new',
      mappingLog: {
        originalValue: inputStatus,
        mappedTo: 'new',
        reason: 'empty_value',
        timestamp: new Date().toISOString(),
        rowIndex
      }
    };
  }
  
  const normalizedStatus = inputStatus.toLowerCase().trim();
  
  const statusMappings: Record<string, string> = {
    'active': 'active',
    'sold': 'sold', 
    'bad': 'bad',
    'pending': 'pending',
    'new': 'new',
    'engaged': 'engaged',
    'contacted': 'contacted',
    'follow up': 'follow_up',
    'follow_up': 'follow_up',
    'not interested': 'not_interested',
    'not_interested': 'not_interested',
    'paused': 'paused',
    'closed': 'closed',
    'lost': 'lost',
    'hot': 'engaged',
    'warm': 'follow_up',
    'cold': 'paused',
    'dead': 'bad',
    'complete': 'closed',
    'completed': 'closed',
    'converted': 'closed'
  };
  
  const mappedStatus = statusMappings[normalizedStatus] || 'new';
  
  return {
    mappedStatus,
    mappingLog: {
      originalValue: inputStatus,
      normalizedValue: normalizedStatus,
      mappedTo: mappedStatus,
      reason: statusMappings[normalizedStatus] ? 'direct_mapping' : 'default_fallback',
      timestamp: new Date().toISOString(),
      rowIndex
    }
  };
};

// Function to safely extract AI strategy fields from CSV row with improved mapping
const extractAIStrategyFields = (row: Record<string, any>, mapping: any) => {
  console.log('🧠 [AI STRATEGY] Extracting AI strategy fields from row');
  
  // Extract values using the mapping configuration
  const leadStatusTypeName = mapping.leadStatusTypeName && row[mapping.leadStatusTypeName] ? 
    String(row[mapping.leadStatusTypeName]).trim() : null;
  const leadTypeName = mapping.leadTypeName && row[mapping.leadTypeName] ? 
    String(row[mapping.leadTypeName]).trim() : null;
  const leadSourceName = mapping.leadSourceName && row[mapping.leadSourceName] ? 
    String(row[mapping.leadSourceName]).trim() : null;
  
  return {
    leadStatusTypeName: leadStatusTypeName || null,
    leadTypeName: leadTypeName || null,
    leadSourceName: leadSourceName || null
  };
};

export const processLeadsEnhanced = async (
  csvData: any, 
  mapping: any,
  fileName: string,
  fileSize: number,
  fileType: string,
  options: EnhancedProcessingOptions = {}
): Promise<EnhancedProcessingResult> => {
  // Default options - flexible by default for better import success rates
  const {
    updateExistingLeads = false,
    allowPartialData = true,
    strictPhoneValidation = false
  } = options;

  // Create upload history record
  const uploadHistoryId = await createUploadHistory(fileName, fileSize, fileType, mapping);
  
  const validLeads: ProcessedLead[] = [];
  const duplicates: EnhancedProcessingResult['duplicates'] = [];
  const errors: EnhancedProcessingResult['errors'] = [];
  const warnings: EnhancedProcessingResult['warnings'] = [];
  const updates: Array<{
    leadId: string;
    updatedFields: string[];
    rowIndex: number;
  }> = [];

  console.log('🔄 [ENHANCED PROCESSING] Starting enhanced lead processing with flexible validation');
  console.log('🔄 [ENHANCED PROCESSING] Options:', { updateExistingLeads, allowPartialData, strictPhoneValidation });
  console.log('🔄 [ENHANCED PROCESSING] Sample row:', csvData.sample);

  for (let index = 0; index < csvData.rows.length; index++) {
    const row = csvData.rows[index];
    
    try {
      // Preserve all raw upload data
      const rawUploadData: Record<string, any> = { ...row };
      
      // Create phone numbers with enhanced parsing and flexible validation
      const phoneResult = createPhoneNumbers(
        row[mapping.cellphone] || '',
        row[mapping.dayphone] || '',
        row[mapping.evephone] || '',
        allowPartialData
      );

      const phoneNumbers = phoneResult.phones;
      const phoneWarnings = phoneResult.warnings;
      const primaryPhone = getPrimaryPhone(phoneNumbers);
      
      // Add phone warnings to the warnings array
      phoneWarnings.forEach(warning => {
        warnings.push({
          rowIndex: index + 1,
          warning,
          warningType: 'phone_validation',
          rawData: rawUploadData
        });
      });
      
      // Enhanced lead validation logic
      const hasUsablePhone = hasUsablePhoneNumber(phoneNumbers);
      
      if (!hasUsablePhone && !allowPartialData) {
        errors.push({
          rowIndex: index + 1,
          error: 'No valid phone number found',
          rawData: rawUploadData
        });
        continue;
      } else if (!hasUsablePhone && allowPartialData) {
        warnings.push({
          rowIndex: index + 1,
          warning: 'Lead imported without valid phone number - manual review required',
          warningType: 'phone_validation',
          rawData: rawUploadData
        });
      }

      // Check for required fields (more flexible)
      const firstName = row[mapping.firstName] || '';
      const lastName = row[mapping.lastName] || '';
      
      if (!firstName && !lastName) {
        if (allowPartialData) {
          warnings.push({
            rowIndex: index + 1,
            warning: 'Lead missing both first and last name - manual review required',
            warningType: 'data_quality',
            rawData: rawUploadData
          });
        } else {
          errors.push({
            rowIndex: index + 1,
            error: 'Lead must have at least first name or last name',
            rawData: rawUploadData
          });
          continue;
        }
      }

      // Combine vehicle information
      const vehicleParts = [
        row[mapping.vehicleYear] || '',
        row[mapping.vehicleMake] || '',
        row[mapping.vehicleModel] || ''
      ].filter(Boolean);
      
      const vehicleInterest = vehicleParts.length > 0 ? vehicleParts.join(' ') : 'finding the right vehicle for your needs';

      // Enhanced status mapping with audit trail
      const statusMapping = mapStatusToSystemStatus(row[mapping.status] || '', index + 1);

      // Handle contact preferences
      const doNotCall = row[mapping.doNotCall]?.toLowerCase() === 'true';
      const doNotEmail = row[mapping.doNotEmail]?.toLowerCase() === 'true';

      // Extract AI strategy fields using improved mapping-based logic
      const aiStrategyFields = extractAIStrategyFields(row, mapping);

      const newLead: ProcessedLead & {
        uploadHistoryId: string;
        originalRowIndex: number;
        rawUploadData: Record<string, any>;
        originalStatus: string;
        statusMappingLog: Record<string, any>;
        leadStatusTypeName?: string;
        leadTypeName?: string;
        leadSourceName?: string;
        hasValidPhone: boolean;
        dataQualityScore: number;
      } = {
        firstName,
        lastName,
        middleName: row[mapping.middleName] || '',
        phoneNumbers,
        primaryPhone,
        email: row[mapping.email] || '',
        emailAlt: row[mapping.emailAlt] || '',
        address: row[mapping.address] || '',
        city: row[mapping.city] || '',
        state: row[mapping.state] || '',
        postalCode: row[mapping.postalCode] || '',
        vehicleInterest,
        vehicleVIN: row[mapping.vehicleVIN] || '',
        source: row[mapping.source] || 'CSV Import',
        salesPersonName: [row[mapping.salesPersonFirstName], row[mapping.salesPersonLastName]].filter(Boolean).join(' '),
        doNotCall,
        doNotEmail,
        doNotMail: row[mapping.doNotMail]?.toLowerCase() === 'true',
        status: statusMapping.mappedStatus,
        // Enhanced preservation fields
        uploadHistoryId,
        originalRowIndex: index + 1,
        rawUploadData,
        originalStatus: row[mapping.status] || '',
        statusMappingLog: statusMapping.mappingLog,
        // AI strategy fields
        leadStatusTypeName: aiStrategyFields.leadStatusTypeName,
        leadTypeName: aiStrategyFields.leadTypeName,
        leadSourceName: aiStrategyFields.leadSourceName,
        // Data quality metrics
        hasValidPhone: hasUsablePhone,
        dataQualityScore: calculateDataQualityScore(phoneNumbers, firstName, lastName, row[mapping.email])
      };

      console.log(`🔍 [ROW ${index + 1}] Processed lead: ${newLead.firstName} ${newLead.lastName} (Quality: ${newLead.dataQualityScore})`);

      // Check for duplicates against already processed leads
      const duplicateCheck = checkForDuplicate(newLead, validLeads);
      
      if (duplicateCheck.isDuplicate && duplicateCheck.conflictingLead) {
        duplicates.push({
          lead: newLead,
          duplicateType: duplicateCheck.duplicateType!,
          conflictingLead: duplicateCheck.conflictingLead,
          rowIndex: index + 1
        });
        console.log(`⚠️ [ROW ${index + 1}] Duplicate found: ${duplicateCheck.duplicateType} conflict`);
      } else {
        validLeads.push(newLead);
        console.log(`✅ [ROW ${index + 1}] Valid lead processed`);
      }

    } catch (error) {
      errors.push({
        rowIndex: index + 1,
        error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        rawData: { ...row }
      });
    }
  }

  // Update upload history with processing results
  await updateUploadHistory(uploadHistoryId, {
    total_rows: csvData.rows.length,
    successful_imports: validLeads.length,
    failed_imports: errors.length,
    duplicate_imports: duplicates.length,
    processing_errors: errors,
    upload_status: validLeads.length === 0 ? 'failed' : 'completed'
  });

  console.log('🎉 [ENHANCED PROCESSING] Processing complete:', {
    validLeads: validLeads.length,
    duplicates: duplicates.length,
    errors: errors.length,
    warnings: warnings.length,
    averageQualityScore: validLeads.length > 0 ? validLeads.reduce((sum, l) => sum + (l as any).dataQualityScore, 0) / validLeads.length : 0
  });

  return {
    validLeads,
    duplicates,
    errors,
    warnings,
    uploadHistoryId,
    updates
  };
};

// Helper function to calculate data quality score
function calculateDataQualityScore(phoneNumbers: any[], firstName: string, lastName: string, email: string): number {
  let score = 0;
  
  // Phone number quality (40% of score)
  const activePhones = phoneNumbers.filter(p => p.status === 'active');
  if (activePhones.length > 0) score += 40;
  else if (phoneNumbers.length > 0) score += 20; // Has phones but needs review
  
  // Name quality (30% of score)
  if (firstName && lastName) score += 30;
  else if (firstName || lastName) score += 15;
  
  // Email quality (20% of score)
  if (email && email.includes('@')) score += 20;
  
  // Multiple contact methods bonus (10% of score)
  const contactMethods = [
    phoneNumbers.length > 0,
    email && email.includes('@')
  ].filter(Boolean).length;
  
  if (contactMethods >= 2) score += 10;
  
  return Math.min(100, score);
}
