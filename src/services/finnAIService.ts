
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
    console.log(`🤖 [FINN AI SERVICE] === DEBUGGING CORRY BAGGETT ISSUE ===`);
    console.log(`🤖 [FINN AI SERVICE] Toggling AI for lead ${leadId}: ${currentOptIn} -> ${newOptInState}`);

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user?.id) {
      console.error('❌ [FINN AI SERVICE] No authenticated user:', sessionError);
      return { success: false, error: 'User not authenticated' };
    }

    console.log(`👤 [FINN AI SERVICE] Authenticated user ID: ${session.user.id}`);

    // Get clean profile data
    const profile = await getCleanProfileData(session.user.id);
    if (!profile) {
      console.error('❌ [FINN AI SERVICE] Failed to get clean profile data');
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
      console.log(`🚀 [FINN AI SERVICE] === ENABLING AI - SENDING INITIAL MESSAGE ===`);
      console.log(`🚀 [FINN AI SERVICE] Lead ID: ${leadId}`);
      console.log(`🚀 [FINN AI SERVICE] Profile for initial message:`, {
        id: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email
      });
      
      try {
        console.log(`📞 [FINN AI SERVICE] Calling sendInitialMessage...`);
        const messageResult = await sendInitialMessage(leadId, profile);
        console.log(`📬 [FINN AI SERVICE] sendInitialMessage result:`, messageResult);
        
        if (messageResult.success) {
          console.log(`✅ [FINN AI SERVICE] === SUCCESS! Initial message sent ===`);
          return { 
            success: true, 
            message: 'Finn AI enabled and initial message sent',
            newState: newOptInState 
          };
        } else {
          console.error(`❌ [FINN AI SERVICE] === FAILURE! Initial message failed ===`);
          console.error(`❌ [FINN AI SERVICE] Failure reason:`, messageResult.error);
          return { 
            success: true, 
            message: `Finn AI enabled but initial message failed: ${messageResult.error}`,
            newState: newOptInState 
          };
        }
      } catch (messageError) {
        console.error('❌ [FINN AI SERVICE] === EXCEPTION in sendInitialMessage ===');
        console.error('❌ [FINN AI SERVICE] Exception details:', messageError);
        console.error('❌ [FINN AI SERVICE] Exception stack:', messageError instanceof Error ? messageError.stack : 'No stack trace');
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
    console.error('❌ [FINN AI SERVICE] === CRITICAL ERROR in toggleFinnAI ===');
    console.error('❌ [FINN AI SERVICE] Critical error details:', error);
    console.error('❌ [FINN AI SERVICE] Critical error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
