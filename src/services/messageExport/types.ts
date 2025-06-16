
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

export interface ImportResults {
  leads_created: number;
  leads_matched: number;
  messages_imported: number;
  errors: string[];
}
