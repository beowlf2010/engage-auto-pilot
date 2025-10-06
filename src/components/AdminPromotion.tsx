import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { promoteToAdmin } from '@/utils/leadOperations/rlsBypassUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';

export const AdminPromotion = () => {
  const { user } = useAuth();
  const { isAdmin, loading: permissionsLoading } = useUserPermissions();
  const [promoting, setPromoting] = useState(false);

  // Don't show if already admin or still loading
  if (permissionsLoading || isAdmin) return null;

  const handlePromoteToAdmin = async () => {
    if (!user) return;
    
    setPromoting(true);
    try {
      const result = await promoteToAdmin(user.id, 'Initial admin bootstrap');
      if (result.success) {
        // Refresh the page to load new permissions
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to promote to admin:', error);
    } finally {
      setPromoting(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Admin Access Required
        </CardTitle>
        <CardDescription>
          You don't have admin permissions yet. Click below to grant yourself admin access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handlePromoteToAdmin}
          disabled={promoting}
          className="w-full sm:w-auto"
        >
          {promoting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Granting Admin Access...
            </>
          ) : (
            'Grant Admin Access'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
