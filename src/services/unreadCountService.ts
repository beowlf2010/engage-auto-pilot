
import { supabase } from '@/integrations/supabase/client';

interface UnreadCountOptions {
  respectUserRole?: boolean;
  userId?: string;
  userRoles?: string[];
}

export class UnreadCountService {
  /**
   * Get unread count with proper user role filtering
   */
  static async getUnreadCount(options: UnreadCountOptions = {}): Promise<number> {
    const { respectUserRole = true, userId, userRoles = [] } = options;
    
    console.log('🔍 [UNREAD COUNT SERVICE] Getting unread count with options:', options);
    
    try {
      let query = supabase
        .from('conversations')
        .select('id, lead_id, direction, read_at')
        .eq('direction', 'in')
        .is('read_at', null);

      // If we should respect user roles and have user info
      if (respectUserRole && userId) {
        const isAdminOrManager = userRoles.some(role => ['admin', 'manager'].includes(role));
        
        console.log('🔍 [UNREAD COUNT SERVICE] User role check:', { userId, userRoles, isAdminOrManager });
        
        if (!isAdminOrManager) {
          // For non-admin/manager users, only count unread messages for their assigned leads
          const { data: userLeads, error: leadsError } = await supabase
            .from('leads')
            .select('id')
            .eq('salesperson_id', userId);
          
          if (leadsError) {
            console.error('❌ [UNREAD COUNT SERVICE] Error fetching user leads:', leadsError);
            return 0;
          }
          
          const leadIds = userLeads?.map(lead => lead.id) || [];
          console.log('🔍 [UNREAD COUNT SERVICE] User assigned leads:', leadIds.length);
          
          if (leadIds.length === 0) {
            return 0;
          }
          
          query = query.in('lead_id', leadIds);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [UNREAD COUNT SERVICE] Query error:', error);
        return 0;
      }

      const count = data?.length || 0;
      console.log('📊 [UNREAD COUNT SERVICE] Final unread count:', count);
      
      return count;
    } catch (error) {
      console.error('❌ [UNREAD COUNT SERVICE] Unexpected error:', error);
      return 0;
    }
  }

  /**
   * Get detailed unread information for debugging
   */
  static async getUnreadDebugInfo(userId?: string, userRoles: string[] = []) {
    console.log('🔍 [UNREAD COUNT SERVICE] Getting debug info for user:', userId);
    
    try {
      // Get total unread count (no filtering)
      const { data: allUnread, error: allError } = await supabase
        .from('conversations')
        .select('id, lead_id, direction, read_at')
        .eq('direction', 'in')
        .is('read_at', null);

      if (allError) {
        console.error('❌ [UNREAD COUNT SERVICE] Error getting all unread:', allError);
        return null;
      }

      // Get user-specific unread count
      const userUnreadCount = await this.getUnreadCount({
        respectUserRole: true,
        userId,
        userRoles
      });

      // Get user's assigned leads
      let userLeads = [];
      if (userId) {
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id, first_name, last_name')
          .eq('salesperson_id', userId);
        
        if (!leadsError) {
          userLeads = leads || [];
        }
      }

      const debugInfo = {
        totalUnreadMessages: allUnread?.length || 0,
        userUnreadMessages: userUnreadCount,
        userAssignedLeads: userLeads.length,
        isAdminOrManager: userRoles.some(role => ['admin', 'manager'].includes(role)),
        unreadLeadIds: [...new Set(allUnread?.map(msg => msg.lead_id) || [])],
        userLeadIds: userLeads.map(lead => lead.id)
      };

      console.log('🔍 [UNREAD COUNT SERVICE] Debug info:', debugInfo);
      return debugInfo;
    } catch (error) {
      console.error('❌ [UNREAD COUNT SERVICE] Debug info error:', error);
      return null;
    }
  }
}
