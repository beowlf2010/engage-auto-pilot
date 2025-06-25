
import React from 'react';
import { useEnhancedUserProfile } from '@/hooks/useEnhancedUserProfile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, User, AlertTriangle, CheckCircle } from 'lucide-react';

interface EnhancedCSVUploadGuardProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

const EnhancedCSVUploadGuard = ({ children, onRetry }: EnhancedCSVUploadGuardProps) => {
  const { 
    userProfile, 
    userRoles, 
    loading, 
    error, 
    canUploadCSV, 
    ensureUserProfile 
  } = useEnhancedUserProfile();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 animate-pulse" />
            Setting up user permissions...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600">Configuring upload permissions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Permission Setup Failed
          </CardTitle>
          <CardDescription>
            Unable to configure user permissions for CSV uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          
          <div className="flex space-x-2">
            <Button onClick={ensureUserProfile} variant="outline">
              Retry Setup
            </Button>
            {onRetry && (
              <Button onClick={onRetry} variant="secondary">
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canUploadCSV()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <Shield className="h-5 w-5" />
            Insufficient Permissions
          </CardTitle>
          <CardDescription>
            Your account doesn't have the required permissions for CSV uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              CSV upload functionality requires manager or admin permissions. 
              Please contact your administrator to upgrade your account.
            </AlertDescription>
          </Alert>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Current User Information:</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Email: {userProfile?.email}</p>
              <p>Profile Role: {userProfile?.role || 'Not set'}</p>
              <p>System Roles: {userRoles.map(r => r.role).join(', ') || 'None assigned'}</p>
            </div>
          </div>
          
          <Button onClick={ensureUserProfile} variant="outline">
            Check Permissions Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          Upload permissions verified. You can proceed with CSV uploads.
        </AlertDescription>
      </Alert>
      {children}
    </div>
  );
};

export default EnhancedCSVUploadGuard;
