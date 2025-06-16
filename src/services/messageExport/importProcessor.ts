
import { supabase } from '@/integrations/supabase/client';
import { VINMessageExport, ImportResults } from './types';

export const processMessageImport = async (exportId: string): Promise<ImportResults> => {
  try {
    // Get the export data
    const { data: exportData, error: exportError } = await supabase
      .from('message_exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (exportError) throw exportError;

    const importResults: ImportResults = {
      leads_created: 0,
      leads_matched: 0,
      messages_imported: 0,
      errors: []
    };

    // Cast export_data to our expected type
    const exportDataTyped = exportData.export_data as any as VINMessageExport;

    // Process each lead from the export
    for (const exportedLead of exportDataTyped.leads) {
      try {
        // Try to find existing lead by phone or email
        let { data: existingLead } = await supabase
          .from('leads')
          .select('id, phone_numbers(*)')
          .or(`email.eq.${exportedLead.email},phone_numbers.number.eq.${exportedLead.phone}`)
          .maybeSingle();

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
