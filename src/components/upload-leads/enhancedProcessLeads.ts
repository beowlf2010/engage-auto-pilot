import { createPhoneNumbers, getPrimaryPhone } from "@/utils/phoneUtils";
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
  uploadHistoryId: string;
  updates: Array<{
    leadId: string;
    updatedFields: string[];
    rowIndex: number;
  }>;
}

export interface EnhancedProcessingOptions {
  updateExistingLeads?: boolean;
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
  console.log('🧠 [AI STRATEGY] Available CSV columns:', Object.keys(row));
  console.log('🧠 [AI STRATEGY] Field mapping:', {
    leadStatusTypeName: mapping.leadStatusTypeName,
    leadTypeName: mapping.leadTypeName,
    leadSourceName: mapping.leadSourceName
  });
  
  // Use the mapping to get the correct CSV column names
  const leadStatusTypeName = mapping.leadStatusTypeName ? row[mapping.leadStatusTypeName] : null;
  const leadTypeName = mapping.leadTypeName ? row[mapping.leadTypeName] : null;
  const leadSourceName = mapping.leadSourceName ? row[mapping.leadSourceName] : null;
  
  console.log('🧠 [AI STRATEGY] Extracted values:', {
    leadStatusTypeName,
    leadTypeName,
    leadSourceName
  });
  
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
  // Create upload history record
  const uploadHistoryId = await createUploadHistory(fileName, fileSize, fileType, mapping);
  
  const validLeads: ProcessedLead[] = [];
  const duplicates: EnhancedProcessingResult['duplicates'] = [];
  const errors: EnhancedProcessingResult['errors'] = [];
  const updates: Array<{
    leadId: string;
    updatedFields: string[];
    rowIndex: number;
  }> = [];

  console.log('🔄 [ENHANCED PROCESSING] Starting enhanced lead processing with AI strategy field mapping');
  console.log('🔄 [ENHANCED PROCESSING] Field mapping configuration:', mapping);
  console.log('🔄 [ENHANCED PROCESSING] Sample row:', csvData.sample);
  console.log('🔄 [ENHANCED PROCESSING] Update mode:', options.updateExistingLeads ? 'enabled' : 'disabled');

  for (let index = 0; index < csvData.rows.length; index++) {
    const row = csvData.rows[index];
    
    try {
      // Preserve all raw upload data
      const rawUploadData: Record<string, any> = { ...row };
      
      // Create phone numbers with priority
      const phoneNumbers = createPhoneNumbers(
        row[mapping.cellphone] || '',
        row[mapping.dayphone] || '',
        row[mapping.evephone] || ''
      );

      const primaryPhone = getPrimaryPhone(phoneNumbers);
      
      // Skip leads without valid phone numbers but preserve error details
      if (!primaryPhone) {
        errors.push({
          rowIndex: index + 1,
          error: 'No valid phone number found',
          rawData: rawUploadData
        });
        continue;
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
      } = {
        firstName: row[mapping.firstName] || '',
        lastName: row[mapping.lastName] || '',
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
        // AI strategy fields - properly extracted using mapping
        leadStatusTypeName: aiStrategyFields.leadStatusTypeName,
        leadTypeName: aiStrategyFields.leadTypeName,
        leadSourceName: aiStrategyFields.leadSourceName
      };

      console.log(`🔍 [ROW ${index + 1}] Processed lead: ${newLead.firstName} ${newLead.lastName}`);
      console.log(`🧠 [ROW ${index + 1}] AI Strategy Fields:`, {
        leadStatusTypeName: newLead.leadStatusTypeName,
        leadTypeName: newLead.leadTypeName,
        leadSourceName: newLead.leadSourceName
      });

      // Check for duplicates against already processed leads
      const duplicateCheck = checkForDuplicate(newLead, validLeads);
      
      if (duplicateCheck.isDuplicate && duplicateCheck.conflictingLead) {
        if (options.updateExistingLeads) {
          // In update mode, we still track within-file duplicates but don't update them
          duplicates.push({
            lead: newLead,
            duplicateType: duplicateCheck.duplicateType!,
            conflictingLead: duplicateCheck.conflictingLead,
            rowIndex: index + 1
          });
          console.log(`⚠️ [ROW ${index + 1}] Within-file duplicate found: ${duplicateCheck.duplicateType} conflict`);
        } else {
          duplicates.push({
            lead: newLead,
            duplicateType: duplicateCheck.duplicateType!,
            conflictingLead: duplicateCheck.conflictingLead,
            rowIndex: index + 1
          });
          console.log(`⚠️ [ROW ${index + 1}] Duplicate found: ${duplicateCheck.duplicateType} conflict`);
        }
      } else {
        validLeads.push(newLead);
        console.log(`✅ [ROW ${index + 1}] Valid lead processed with AI fields`);
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
    upload_status: errors.length === csvData.rows.length ? 'failed' : 'completed'
  });

  console.log('🎉 [ENHANCED PROCESSING] Processing complete:', {
    validLeads: validLeads.length,
    duplicates: duplicates.length,
    errors: errors.length,
    aiFieldsExtracted: validLeads.filter(l => (l as any).leadTypeName || (l as any).leadStatusTypeName || (l as any).leadSourceName).length
  });

  return {
    validLeads,
    duplicates,
    errors,
    uploadHistoryId,
    updates
  };
};
