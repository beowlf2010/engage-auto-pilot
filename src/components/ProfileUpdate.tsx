import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateCurrentUserProfile, ensureUserRole, updateDealershipSettings } from '@/services/profileService';
import { useAuth } from '@/components/auth/AuthProvider';
import { DataPurgePanel } from './DataPurgePanel';

export const ProfileUpdate = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateToUsedCarManager = async () => {
    setIsUpdating(true);
    try {
      // Update profile
      await updateCurrentUserProfile({
        first_name: 'Used Car',
        last_name: 'Manager',
        role: 'manager',
        dealership_name: 'U-J Chevrolet'
      });

      // Ensure manager role
      await ensureUserRole('manager');

      // Update dealership settings
      await updateDealershipSettings('U-J Chevrolet', 'Used Car Department');

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated to Used Car Manager at U-J Chevrolet",
      });

      // Refresh the page to reload user data
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Check if user is already a Used Car Manager at U-J Chevrolet
  const isAlreadyUpdated = profile?.role === 'manager' && 
                          profile?.first_name === 'Used Car' && 
                          profile?.last_name === 'Manager' &&
                          (profile as any)?.dealership_name === 'U-J Chevrolet';

  if (isAlreadyUpdated) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-success/10 border border-success rounded-lg">
          <h3 className="text-lg font-semibold text-success mb-2">Profile Updated Successfully</h3>
          <p className="text-sm text-muted-foreground">
            You are now set up as Used Car Manager at U-J Chevrolet.
          </p>
        </div>
        <DataPurgePanel />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-muted/50 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Update Profile for New Position</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Click the button below to update your profile to reflect your new role as Used Car Manager at U-J Chevrolet.
        </p>
        <Button 
          onClick={handleUpdateToUsedCarManager}
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? 'Updating...' : 'Update to Used Car Manager at U-J Chevrolet'}
        </Button>
      </div>
      <DataPurgePanel />
    </div>
  );
};