import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, FileText } from 'lucide-react';

export const SecurityAuditViewer = () => {
  const { isAdmin } = useUserPermissions();

  if (!isAdmin) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Access denied. Admin privileges required to view security audit logs.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Security Audit Viewer</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Security audit log viewer would be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};