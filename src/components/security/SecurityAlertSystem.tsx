import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Bell } from 'lucide-react';
import SecurityAlerts from './SecurityAlerts';

export const SecurityAlertSystem = () => {
  const { isAdmin } = useUserPermissions();

  if (!isAdmin) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Access denied. Admin privileges required to manage security alerts.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Security Alert System</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Alert Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SecurityAlerts />
        </CardContent>
      </Card>
    </div>
  );
};