
import { VINMessageExport } from './types';

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
