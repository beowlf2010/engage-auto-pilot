import { supabase } from '@/integrations/supabase/client';

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  role?: string;
  dealership_name?: string;
  phone?: string;
  personal_phone?: string;
}

export const updateCurrentUserProfile = async (updates: UpdateProfileData) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('No authenticated user found');
  }

  // First, try to update existing profile
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (existing) {
    // Update existing profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        first_name: updates.first_name || 'User',
        last_name: updates.last_name || 'Name', 
        role: updates.role || 'manager',
        dealership_name: updates.dealership_name,
        phone: updates.phone,
        personal_phone: updates.personal_phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const ensureUserRole = async (role: 'admin' | 'manager' | 'sales') => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('No authenticated user found');
  }

  // Add role to user_roles table
  const { error } = await supabase
    .from('user_roles')
    .upsert({
      user_id: user.id,
      role: role
    });

  if (error) throw error;
};

export const updateDealershipSettings = async (dealershipName: string, location?: string) => {
  const updates = [
    {
      key: 'DEALERSHIP_NAME',
      value: dealershipName,
      updated_at: new Date().toISOString()
    }
  ];

  if (location) {
    updates.push({
      key: 'DEALERSHIP_LOCATION', 
      value: location,
      updated_at: new Date().toISOString()
    });
  }

  const { error } = await supabase
    .from('settings')
    .upsert(updates);

  if (error) throw error;
};