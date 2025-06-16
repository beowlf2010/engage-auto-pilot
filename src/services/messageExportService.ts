
import { supabase } from '@/integrations/supabase/client';

export interface VINMessageExport {
  leads: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    vehicle_interest?: string;
    messages: Array<{
      id: string;
      direction: 'in' | 'out';
      content: string;
      sent_at: string;
      metadata?: any;
    }>;
  }>;
  export_info: {
    total_leads: number;
    total_messages: number;
    export_date: string;
    source: string;
  };
}

export const createMessageExport = async (
  exportName: string, 
  exportData: VINMessageExport
) => {
  try {
    const { data, error } = await supabase
      .from('message_exports')
      .insert({
        export_name: exportName,
        source_system: 'vin',
        total_messages: exportData.export_info.total_messages,
        total_leads: exportData.export_info.total_leads,
        export_data: exportData
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating message export:', error);
    throw error;
  }
};

export const getMessageExports = async () => {
  try {
    const { data, error } = await supabase
      .from('message_exports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching message exports:', error);
    return [];
  }
};

export const processMessageImport = async (exportId: string) => {
  try {
    // Get the export data
    const { data: exportData, error: exportError } = await supabase
      .from('message_exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (exportError) throw exportError;

    const importResults = {
      leads_created: 0,
      leads_matched: 0,
      messages_imported: 0,
      errors: [] as string[]
    };

    // Process each lead from the export
    for (const exportedLead of exportData.export_data.leads) {
      try {
        // Try to find existing lead by phone or email
        let { data: existingLead } = await supabase
          .from('leads')
          .select('id, phone_numbers(*)')
          .or(`email.eq.${exportedLead.email},phone_numbers.number.eq.${exportedLead.phone}`)
          .single();

        let leadId = existingLead?.id;

        // If no existing lead, create new one
        if (!existingLead) {
          const [firstName, ...lastNameParts] = exportedLead.name.split(' ');
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              first_name: firstName || 'Unknown',
              last_name: lastNameParts.join(' ') || 'Unknown',
              email: exportedLead.email,
              vehicle_interest: exportedLead.vehicle_interest || 'Imported from VIN',
              source: 'VIN Import'
            })
            .select()
            .single();

          if (leadError) throw leadError;
          leadId = newLead.id;

          // Add phone number
          if (exportedLead.phone) {
            await supabase
              .from('phone_numbers')
              .insert({
                lead_id: leadId,
                number: exportedLead.phone,
                type: 'mobile',
                is_primary: true
              });
          }

          importResults.leads_created++;
        } else {
          importResults.leads_matched++;
        }

        // Create mapping record
        await supabase
          .from('message_import_mapping')
          .insert({
            export_id: exportId,
            external_lead_id: exportedLead.id,
            internal_lead_id: leadId,
            mapping_status: 'completed'
          });

        // Import messages
        for (const message of exportedLead.messages) {
          // Import to conversations table
          const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .insert({
              lead_id: leadId,
              direction: message.direction,
              body: message.content,
              sent_at: message.sent_at,
              ai_generated: message.direction === 'out'
            })
            .select()
            .single();

          if (convError) {
            importResults.errors.push(`Failed to import message: ${convError.message}`);
            continue;
          }

          // Also store in historical_messages for analytics
          await supabase
            .from('historical_messages')
            .insert({
              lead_id: leadId,
              original_message_id: message.id,
              direction: message.direction,
              content: message.content,
              sent_at: message.sent_at,
              source_system: 'vin',
              message_metadata: message.metadata || {}
            });

          // Update mapping with message IDs
          await supabase
            .from('message_import_mapping')
            .update({
              external_message_id: message.id,
              internal_message_id: conversation.id
            })
            .eq('export_id', exportId)
            .eq('external_lead_id', exportedLead.id);

          importResults.messages_imported++;
        }

      } catch (error) {
        console.error(`Error processing lead ${exportedLead.id}:`, error);
        importResults.errors.push(`Failed to process lead ${exportedLead.name}: ${error}`);
      }
    }

    // Mark export as processed
    await supabase
      .from('message_exports')
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('id', exportId);

    return importResults;
  } catch (error) {
    console.error('Error processing message import:', error);
    throw error;
  }
};

export const parseVINExportFile = (fileContent: string): VINMessageExport => {
  try {
    const data = JSON.parse(fileContent);
    
    // Validate the structure
    if (!data.leads || !Array.isArray(data.leads)) {
      throw new Error('Invalid VIN export format: missing leads array');
    }

    // Ensure required fields exist
    const processedData: VINMessageExport = {
      leads: data.leads.map((lead: any) => ({
        id: lead.id || `imported_${Date.now()}_${Math.random()}`,
        name: lead.name || lead.first_name + ' ' + lead.last_name || 'Unknown',
        phone: lead.phone || lead.phone_number,
        email: lead.email,
        vehicle_interest: lead.vehicle_interest || lead.vehicle || 'Unknown',
        messages: (lead.messages || []).map((msg: any) => ({
          id: msg.id || `msg_${Date.now()}_${Math.random()}`,
          direction: msg.direction === 'incoming' ? 'in' : 'out',
          content: msg.content || msg.body || msg.message,
          sent_at: msg.sent_at || msg.timestamp || new Date().toISOString(),
          metadata: msg.metadata || {}
        }))
      })),
      export_info: {
        total_leads: data.leads.length,
        total_messages: data.leads.reduce((sum: number, lead: any) => sum + (lead.messages?.length || 0), 0),
        export_date: new Date().toISOString(),
        source: 'vin'
      }
    };

    return processedData;
  } catch (error) {
    console.error('Error parsing VIN export file:', error);
    throw new Error('Failed to parse VIN export file. Please ensure it\'s a valid JSON format.');
  }
};
