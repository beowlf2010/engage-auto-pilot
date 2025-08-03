
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'sales' | 'manager' | 'admin';
  created_at: string;
  updated_at: string;
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Ensure role is properly typed
      const typedUsers = (data || []).map(user => ({
        ...user,
        role: user.role as 'sales' | 'manager' | 'admin'
      }));
      
      setUsers(typedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'sales' | 'manager' | 'admin') => {
    try {
      // Use the synchronization function (now secured with proper policies)
      const { error } = await supabase.rpc('synchronize_user_roles', {
        p_user_id: userId,
        p_role: newRole
      });

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast({
        title: "Role Updated",
        description: "User role has been updated securely with proper authorization"
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const updateUserInfo = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ));

      toast({
        title: "User Updated",
        description: "User information has been updated successfully"
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user information",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) throw error;

      setUsers(prev => prev.filter(user => user.id !== userId));

      toast({
        title: "User Deleted",
        description: "User has been deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    fetchUsers();

    // Set up real-time subscription
    const subscription = supabase
      .channel('profiles_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchUsers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    users: filteredUsers,
    loading,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    updateUserRole,
    updateUserInfo,
    deleteUser,
    refetch: fetchUsers
  };
};
