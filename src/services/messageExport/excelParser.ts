
import * as XLSX from 'xlsx';
import { VINMessageExport } from './types';

export const parseVINExcelFile = (file: File): Promise<VINMessageExport> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Assume the first sheet contains the data
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Process Excel data to match VIN format
        const leads = jsonData.map((row: any, index: number) => {
          const leadId = String(row.lead_id || row.id || `excel_lead_${index + 1}`);
          const name = String(row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown');
          const phone = String(row.phone || row.phone_number || row.mobile || '');
          const email = row.email ? String(row.email) : undefined;
          const vehicle_interest = row.vehicle_interest ? String(row.vehicle_interest) : (row.vehicle ? String(row.vehicle) : undefined);
          
          // Handle messages - they might be in separate columns or a JSON string
          let messages: Array<{
            id: string;
            direction: 'in' | 'out';
            content: string;
            sent_at: string;
            metadata?: any;
          }> = [];
          
          if (row.messages) {
            try {
              const parsedMessages = typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages;
              if (Array.isArray(parsedMessages)) {
                messages = parsedMessages.map((msg: any, msgIndex: number) => ({
                  id: String(msg.id || `excel_msg_${index + 1}_${msgIndex + 1}`),
                  direction: (msg.direction === 'incoming' || msg.direction === 'in') ? 'in' as const : 'out' as const,
                  content: String(msg.content || msg.message || msg.body || ''),
                  sent_at: String(msg.sent_at || msg.timestamp || new Date().toISOString()),
                  metadata: msg.metadata || {}
                }));
              }
            } catch {
              // If parsing fails, create a single message from the row data
              if (row.message_content || row.last_message) {
                messages = [{
                  id: `excel_msg_${index + 1}`,
                  direction: (row.message_direction === 'incoming' || row.message_direction === 'in') ? 'in' as const : 'out' as const,
                  content: String(row.message_content || row.last_message || ''),
                  sent_at: String(row.message_sent_at || row.last_contact || new Date().toISOString()),
                  metadata: {}
                }];
              }
            }
          } else if (row.message_content || row.last_message) {
            // Create a single message from row data
            messages = [{
              id: `excel_msg_${index + 1}`,
              direction: (row.message_direction === 'incoming' || row.message_direction === 'in') ? 'in' as const : 'out' as const,
              content: String(row.message_content || row.last_message || ''),
              sent_at: String(row.message_sent_at || row.last_contact || new Date().toISOString()),
              metadata: {}
            }];
          }

          return {
            id: leadId,
            name,
            phone,
            email,
            vehicle_interest,
            messages
          };
        });

        // Filter out leads that don't have meaningful data
        const validLeads = leads.filter(lead => 
          lead.name !== 'Unknown' || lead.phone || lead.email
        );

        const processedData: VINMessageExport = {
          leads: validLeads,
          export_info: {
            total_leads: validLeads.length,
            total_messages: validLeads.reduce((sum, lead) => sum + lead.messages.length, 0),
            export_date: new Date().toISOString(),
            source: 'excel'
          }
        };

        resolve(processedData);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading Excel file'));
    reader.readAsArrayBuffer(file);
  });
};
