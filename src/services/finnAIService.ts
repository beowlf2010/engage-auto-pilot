
import { supabase } from '@/integrations/supabase/client';
import { sendInitialMessage } from './proactive/initialMessageService';

export interface FinnAIResult {
  success: boolean;
  message?: string;
  error?: string;
  newState?: boolean;
}

// Helper function to get clean profile data
const getCleanProfileData = async (userId: string) => {
  try {
    console.log(`🔍 [FINN AI SERVICE] Getting profile data for user: ${userId}`);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('❌ [FINN AI SERVICE] Error fetching profile:', error);
      return null;
    }

    // Ensure clean data structure
    const cleanProfile = {
      id: profile.id,
      first_name: profile.first_name || 'User',
      last_name: profile.last_name || '',
      email: profile.email || '',
      firstName: profile.first_name || 'User', // For backward compatibility
      lastName: profile.last_name || ''
    };

    console.log('✅ [FINN AI SERVICE] Retrieved clean profile:', cleanProfile);
    return cleanProfile;
  } catch (error) {
    console.error('❌ [FINN AI SERVICE] Error getting profile data:', error);
    return null;
  }
};

export const toggleFinnAI = async (leadId: string, currentOptIn: boolean): Promise<FinnAIResult> => {
  try {
    const newOptInState = !currentOptIn;
    console.log(`🤖 [FINN AI SERVICE] Toggling AI for lead ${leadId}: ${currentOptIn} -> ${newOptInState}`);

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user?.id) {
      console.error('❌ [FINN AI SERVICE] No authenticated user:', sessionError);
      return { success: false, error: 'User not authenticated' };
    }

    // Get clean profile data
    const profile = await getCleanProfileData(session.user.id);
    if (!profile) {
      return { success: false, error: 'Failed to load user profile' };
    }

    console.log(`🔄 [FINN AI SERVICE] Updating lead AI settings...`);
    // Update the AI opt-in status
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        ai_opt_in: newOptInState,
        ai_stage: newOptInState ? 'enabled' : 'disabled',
        next_ai_send_at: newOptInState ? new Date().toISOString() : null
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('❌ [FINN AI SERVICE] Error updating lead:', updateError);
      return { success: false, error: 'Failed to update AI settings' };
    }

    console.log(`✅ [FINN AI SERVICE] Updated AI opt-in to: ${newOptInState}`);

    // If enabling AI, send initial message
    if (newOptInState) {
      console.log(`🚀 [FINN AI SERVICE] AI enabled, sending initial message with profile:`, profile);
      
      try {
        const messageResult = await sendInitialMessage(leadId, profile);
        
        if (messageResult.success) {
          console.log(`✅ [FINN AI SERVICE] Initial message sent successfully`);
          return { 
            success: true, 
            message: 'Finn AI enabled and initial message sent',
            newState: newOptInState 
          };
        } else {
          console.warn(`⚠️ [FINN AI SERVICE] AI enabled but initial message failed:`, messageResult.error);
          return { 
            success: true, 
            message: `Finn AI enabled but initial message failed: ${messageResult.error}`,
            newState: newOptInState 
          };
        }
      } catch (messageError) {
        console.error('❌ [FINN AI SERVICE] Error in sendInitialMessage:', messageError);
        return { 
          success: true, 
          message: `Finn AI enabled but initial message failed: ${messageError instanceof Error ? messageError.message : 'Unknown error'}`,
          newState: newOptInState 
        };
      }
    } else {
      console.log(`🔇 [FINN AI SERVICE] AI disabled for lead ${leadId}`);
      return { 
        success: true, 
        message: 'Finn AI disabled',
        newState: newOptInState 
      };
    }
  } catch (error) {
    console.error('❌ [FINN AI SERVICE] Error in toggleFinnAI:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
