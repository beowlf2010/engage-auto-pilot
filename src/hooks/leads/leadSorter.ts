

import { Lead } from '@/types/lead';

export const sortLeads = (leads: Lead[]): Lead[] => {
  return [...leads].sort((a, b) => {
    const statusOrder = { 'no_contact': 0, 'contact_attempted': 1, 'response_received': 2 };
    
    if (a.contactStatus !== b.contactStatus) {
      return statusOrder[a.contactStatus] - statusOrder[b.contactStatus];
    }
    
    if (a.contactStatus === 'response_received' && b.contactStatus === 'response_received') {
      // Both have responses, sort by last message time (newest first)
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
    }
    
    // Same status, sort by created date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

