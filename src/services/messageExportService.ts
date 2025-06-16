
import { supabase } from '@/integrations/supabase/client';

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

export const parseVINExcelFile = async (file: File): Promise<VINMessageExport> => {
  // This would parse Excel files - for now, throw an error to indicate it's not implemented
  throw new Error('Excel parsing not yet implemented. Please use JSON files.');
};

export const createMessageExport = async (exportName: string, exportData: VINMessageExport) => {
  const { data, error } = await supabase
    .from('message_exports')
    .insert({
      export_name: exportName,
      export_data: exportData,
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

  const exportData = exportRecord.export_data as VINMessageExport;
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
