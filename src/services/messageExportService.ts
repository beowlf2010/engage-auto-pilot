import { supabase } from '@/integrations/supabase/client';
import { parseCSVText } from '@/utils/csvParser';

export interface VINMessageExport {
  export_info: {
    export_date: string;
    total_leads: number;
    total_messages: number;
  };
  leads: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    vehicle_interest?: string;
    messages: Array<{
      id: string;
      direction: "in" | "out";
      content: string;
      sent_at: string;
      metadata?: any;
    }>;
  }>;
}

export interface MessageImportResult {
  leads_created: number;
  leads_matched: number;
  messages_imported: number;
  errors: Array<{
    lead_id?: string;
    message_id?: string;
    error: string;
  }>;
}

export const parseVINExportFile = (fileContent: string): VINMessageExport => {
  try {
    const parsed = JSON.parse(fileContent);
    
    // Validate the structure
    if (!parsed.export_info || !parsed.leads) {
      throw new Error('Invalid VIN export file format');
    }
    
    // Ensure messages have proper direction typing
    const processedLeads = parsed.leads.map((lead: any) => ({
      ...lead,
      messages: lead.messages.map((msg: any) => ({
        ...msg,
        direction: msg.direction === 'in' || msg.direction === 'out' ? msg.direction as "in" | "out" : "out"
      }))
    }));
    
    return {
      export_info: parsed.export_info,
      leads: processedLeads
    };
  } catch (error) {
    throw new Error(`Failed to parse VIN export file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const parseVINCSVFile = (fileContent: string): VINMessageExport => {
  try {
    const csvData = parseCSVText(fileContent);
    console.log('Parsed CSV headers:', csvData.headers);
    console.log('Sample CSV row:', csvData.sample);
    
    // Enhanced header mapping for VIN Solutions exports
    const vinSolutionsHeaderMappings = {
      customer: ['customer', 'customer_name', 'lead_name', 'name'],
      phone: ['phone', 'contact_phone', 'phone_number', 'cell_phone'],
      email: ['email', 'email_address'],
      messageContent: ['message content', 'message_content', 'message_body', 'content', 'body'],
      direction: ['direction', 'message_direction', 'type', 'comm type'],
      timestamp: ['activity date', 'timestamp', 'sent_at', 'date', 'created_at'],
      vehicleInterest: ['vehicle_interest', 'vehicle', 'interested_vehicle'],
      leadSource: ['lead source', 'source', 'lead_source'],
      commChannel: ['comm channel', 'channel', 'communication_channel']
    };
    
    // Improved header matching function
    const findHeaderMatch = (headerMappings: string[], actualHeaders: string[]): string | null => {
      for (const mapping of headerMappings) {
        const found = actualHeaders.find(header => {
          const normalizedHeader = header.toLowerCase().trim();
          const normalizedMapping = mapping.toLowerCase().trim();
          return normalizedHeader === normalizedMapping || 
                 normalizedHeader.replace(/[^a-z]/g, '') === normalizedMapping.replace(/[^a-z]/g, '');
        });
        if (found) return found;
      }
      return null;
    };
    
    // Map headers to our expected format
    const headerMap = {
      customer: findHeaderMatch(vinSolutionsHeaderMappings.customer, csvData.headers),
      phone: findHeaderMatch(vinSolutionsHeaderMappings.phone, csvData.headers),
      email: findHeaderMatch(vinSolutionsHeaderMappings.email, csvData.headers),
      messageContent: findHeaderMatch(vinSolutionsHeaderMappings.messageContent, csvData.headers),
      direction: findHeaderMatch(vinSolutionsHeaderMappings.direction, csvData.headers),
      timestamp: findHeaderMatch(vinSolutionsHeaderMappings.timestamp, csvData.headers),
      vehicleInterest: findHeaderMatch(vinSolutionsHeaderMappings.vehicleInterest, csvData.headers),
      leadSource: findHeaderMatch(vinSolutionsHeaderMappings.leadSource, csvData.headers),
      commChannel: findHeaderMatch(vinSolutionsHeaderMappings.commChannel, csvData.headers)
    };
    
    console.log('Header mapping results:', headerMap);
    
    // Check if this looks like a VIN Solutions CSV export
    if (!headerMap.customer || !headerMap.messageContent) {
      console.error('Missing required headers. Found headers:', csvData.headers);
      console.error('Header mapping:', headerMap);
      throw new Error(`CSV file does not appear to be a VIN Solutions message export. 
        Expected headers like: Customer, Message Content, Direction, Activity Date
        Found headers: ${csvData.headers.join(', ')}`);
    }
    
    // Helper function to get header value
    const getHeaderValue = (row: Record<string, string>, headerKey: keyof typeof headerMap): string => {
      const header = headerMap[headerKey];
      return header && row[header] ? row[header].trim() : '';
    };
    
    // Group messages by customer/lead
    const leadsMap = new Map<string, any>();
    let processedRows = 0;
    let skippedRows = 0;
    
    csvData.rows.forEach((row, index) => {
      try {
        const customerName = getHeaderValue(row, 'customer');
        const phone = getHeaderValue(row, 'phone');
        const email = getHeaderValue(row, 'email');
        const messageContent = getHeaderValue(row, 'messageContent');
        const direction = getHeaderValue(row, 'direction');
        const timestamp = getHeaderValue(row, 'timestamp');
        const vehicleInterest = getHeaderValue(row, 'vehicleInterest');
        const leadSource = getHeaderValue(row, 'leadSource');
        const commChannel = getHeaderValue(row, 'commChannel');
        
        // Skip rows without customer name or message content
        if (!customerName || !messageContent) {
          console.warn(`Skipping row ${index + 1}: missing customer name or message content`);
          skippedRows++;
          return;
        }
        
        // Skip non-SMS/text message rows if comm channel is specified
        if (commChannel && !commChannel.toLowerCase().includes('sms') && !commChannel.toLowerCase().includes('text')) {
          console.warn(`Skipping row ${index + 1}: non-SMS communication (${commChannel})`);
          skippedRows++;
          return;
        }
        
        // Create a unique key for the lead (prefer phone, fallback to email, then name)
        const leadKey = phone || email || customerName;
        
        if (!leadsMap.has(leadKey)) {
          leadsMap.set(leadKey, {
            id: leadKey,
            name: customerName,
            phone: phone || '',
            email: email || '',
            vehicle_interest: vehicleInterest || '',
            lead_source: leadSource || 'VIN Solutions',
            messages: []
          });
        }
        
        const lead = leadsMap.get(leadKey);
        
        // Determine message direction
        let messageDirection: "in" | "out" = "out";
        if (direction) {
          const dirLower = direction.toLowerCase();
          if (dirLower.includes('in') || dirLower.includes('incoming') || dirLower.includes('received')) {
            messageDirection = "in";
          }
        }
        
        lead.messages.push({
          id: `msg_${index}`,
          direction: messageDirection,
          content: messageContent,
          sent_at: timestamp || new Date().toISOString(),
          metadata: { 
            csv_row: index + 1,
            lead_source: leadSource,
            comm_channel: commChannel,
            original_direction: direction
          }
        });
        
        processedRows++;
      } catch (error) {
        console.warn(`Error processing row ${index + 1}:`, error);
        skippedRows++;
      }
    });
    
    const leads = Array.from(leadsMap.values());
    const totalMessages = leads.reduce((sum, lead) => sum + lead.messages.length, 0);
    
    console.log(`VIN Solutions CSV processing complete:
      - Total rows processed: ${processedRows}
      - Rows skipped: ${skippedRows}
      - Leads created: ${leads.length}
      - Messages imported: ${totalMessages}`);
    
    if (leads.length === 0) {
      throw new Error('No valid leads found in the CSV file. Please check that the file contains customer names and message content.');
    }
    
    return {
      export_info: {
        export_date: new Date().toISOString(),
        total_leads: leads.length,
        total_messages: totalMessages
      },
      leads
    };
  } catch (error) {
    throw new Error(`Failed to parse VIN CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const parseVINExcelFile = async (file: File): Promise<VINMessageExport> => {
  try {
    // Read the file as text first to check if it's actually a CSV
    const text = await file.text();
    
    // If it looks like CSV content, parse as CSV
    if (text.includes(',') && !text.includes('<')) {
      return parseVINCSVFile(text);
    }
    
    // For actual Excel files, we'd need to implement XLSX parsing
    throw new Error('Excel file parsing for VIN Solutions exports is not yet implemented. Please convert to CSV format.');
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const createMessageExport = async (exportName: string, exportData: VINMessageExport) => {
  const { data, error } = await supabase
    .from('message_exports')
    .insert({
      export_name: exportName,
      export_data: exportData as any, // Cast to any to satisfy Json type
      total_leads: exportData.export_info.total_leads,
      total_messages: exportData.export_info.total_messages,
      source_system: 'vin'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getMessageExports = async () => {
  const { data, error } = await supabase
    .from('message_exports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const processMessageImport = async (exportId: string): Promise<MessageImportResult> => {
  const { data: exportRecord, error: exportError } = await supabase
    .from('message_exports')
    .select('*')
    .eq('id', exportId)
    .single();

  if (exportError) throw exportError;

  const exportData = exportRecord.export_data as unknown as VINMessageExport;
  const result: MessageImportResult = {
    leads_created: 0,
    leads_matched: 0,
    messages_imported: 0,
    errors: []
  };

  for (const leadData of exportData.leads) {
    try {
      // Try to find existing lead by phone or email
      let existingLead = null;
      
      if (leadData.phone) {
        const { data: phoneMatches } = await supabase
          .from('phone_numbers')
          .select('lead_id')
          .eq('number', leadData.phone);
        
        if (phoneMatches && phoneMatches.length > 0) {
          const { data: lead } = await supabase
            .from('leads')
            .select('*')
            .eq('id', phoneMatches[0].lead_id)
            .single();
          existingLead = lead;
        }
      }

      if (!existingLead && leadData.email) {
        const { data: emailMatches } = await supabase
          .from('leads')
          .select('*')
          .eq('email', leadData.email);
        
        if (emailMatches && emailMatches.length > 0) {
          existingLead = emailMatches[0];
        }
      }

      let targetLeadId: string;

      if (existingLead) {
        targetLeadId = existingLead.id;
        result.leads_matched++;
      } else {
        // Create new lead
        const nameParts = leadData.name.split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || 'Customer';

        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: leadData.email,
            vehicle_interest: leadData.vehicle_interest || 'Not specified',
            source: 'VIN Import'
          })
          .select()
          .single();

        if (leadError) {
          result.errors.push({
            lead_id: leadData.id,
            error: `Failed to create lead: ${leadError.message}`
          });
          continue;
        }

        targetLeadId = newLead.id;
        result.leads_created++;

        // Add phone number if provided
        if (leadData.phone) {
          await supabase
            .from('phone_numbers')
            .insert({
              lead_id: targetLeadId,
              number: leadData.phone,
              type: 'cell',
              is_primary: true
            });
        }
      }

      // Import messages
      for (const message of leadData.messages) {
        try {
          const { error: messageError } = await supabase
            .from('conversations')
            .insert({
              lead_id: targetLeadId,
              body: message.content,
              direction: message.direction,
              sent_at: message.sent_at,
              ai_generated: false
            });

          if (messageError) {
            result.errors.push({
              lead_id: leadData.id,
              message_id: message.id,
              error: `Failed to import message: ${messageError.message}`
            });
          } else {
            result.messages_imported++;
          }
        } catch (error) {
          result.errors.push({
            lead_id: leadData.id,
            message_id: message.id,
            error: `Message import error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

    } catch (error) {
      result.errors.push({
        lead_id: leadData.id,
        error: `Lead processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  // Mark export as processed
  await supabase
    .from('message_exports')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('id', exportId);

  return result;
};
