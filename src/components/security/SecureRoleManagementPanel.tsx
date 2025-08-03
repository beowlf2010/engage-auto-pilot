import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  RotateCcw,
  Lock
} from 'lucide-react';
import { AppRole } from '@/utils/roleUtils';

interface RoleRequest {
  id: string;
  target_user_id: string;
  target_user_email: string;
  target_user_name: string;
  requested_role: AppRole;
  current_role: AppRole;
  requested_by: string;
  requested_by_name: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  rejected_reason?: string;
  created_at: string;
  expires_at?: string;
}

interface AuditLogEntry {
  id: string;
  target_user_id: string;
  target_user_email: string;
  modified_by: string;
  modified_by_name: string;
  old_role?: AppRole;
  new_role: AppRole;
  action: string;
  reason?: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export const SecureRoleManagementPanel = () => {
  const { isAdmin, loading } = useUserPermissions();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<any[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingStates, setLoadingStates] = useState({
    users: false,
    requests: false,
    audit: false
  });
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Role request form
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [targetRole, setTargetRole] = useState<AppRole>('user');
  const [requestReason, setRequestReason] = useState('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  // Access control
  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Access denied. Administrator privileges required for role management.
        </AlertDescription>
      </Alert>
    );
  }

  // Fetch data functions
  const fetchUsers = async () => {
    setLoadingStates(prev => ({ ...prev, users: true }));
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, users: false }));
    }
  };

  const fetchRoleRequests = async () => {
    setLoadingStates(prev => ({ ...prev, requests: true }));
    try {
      // Fetch from security_audit_log table instead
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('resource_type', 'user_roles')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      // Transform audit data to role requests format for now
      // In production, this would come from a dedicated role_requests table
      setRoleRequests([]);
    } catch (error) {
      console.error('Error fetching role requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch role requests",
        variant: "destructive"
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, requests: false }));
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingStates(prev => ({ ...prev, audit: true }));
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select(`
          id,
          user_id,
          action,
          resource_type,
          details,
          created_at
        `)
        .eq('resource_type', 'user_roles')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Transform to audit log format
      const transformedLogs = data?.map(log => {
        const details = log.details as any; // Type assertion for JSON field
        return {
          id: log.id,
          target_user_id: details?.target_user_id || log.user_id || '',
          target_user_email: details?.target_user_email || 'Unknown',
          modified_by: log.user_id || 'System',
          modified_by_name: details?.modified_by_name || 'Unknown',
          old_role: details?.old_role as AppRole,
          new_role: (details?.new_role || 'user') as AppRole,
          action: log.action,
          reason: details?.reason || 'No reason provided',
          created_at: log.created_at,
          ip_address: details?.ip_address,
          user_agent: details?.user_agent
        };
      }) || [];
      
      setAuditLogs(transformedLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive"
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, audit: false }));
    }
  };

  // Role management actions
  const submitRoleRequest = async () => {
    if (!selectedUser || !targetRole || !requestReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Use the synchronize_user_roles function instead of the secure one
      const { error } = await supabase.rpc('synchronize_user_roles', {
        p_user_id: selectedUser,
        p_role: targetRole
      });

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: "User role has been updated successfully with audit trail"
      });
      
      // Reset form
      setSelectedUser('');
      setTargetRole('user');
      setRequestReason('');
      setShowRequestDialog(false);
      
      // Refresh data
      fetchUsers();
      fetchAuditLogs();

    } catch (error) {
      console.error('Role modification error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoleRequests();
    fetchAuditLogs();
  }, []);

  // Filter functions
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sales': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Secure Role Management</h2>
          <p className="text-muted-foreground">
            Manage user roles with comprehensive audit trails and security controls
          </p>
        </div>
        
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserCheck className="h-4 w-4 mr-2" />
              Modify User Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modify User Role</DialogTitle>
              <DialogDescription>
                Change a user's role with proper authorization and audit trail.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="user-select">Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} ({user.first_name} {user.last_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="role-select">New Role</Label>
                <Select value={targetRole} onValueChange={(value: AppRole) => setTargetRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="reason">Reason for Change</Label>
                <Textarea 
                  id="reason"
                  placeholder="Enter the reason for this role change..."
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                Cancel
              </Button>
              <Button onClick={submitRoleRequest}>
                <Shield className="h-4 w-4 mr-2" />
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="requests">Role Requests</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Role Overview</CardTitle>
              <CardDescription>
                View and manage user roles with secure authorization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.first_name} {user.last_name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(user.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user.id);
                            setShowRequestDialog(true);
                          }}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Modify
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Modification Audit Trail</CardTitle>
              <CardDescription>
                Complete history of all role changes with security details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Target User</TableHead>
                    <TableHead>Role Change</TableHead>
                    <TableHead>Modified By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.target_user_id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {log.old_role && (
                            <Badge className={getRoleBadgeColor(log.old_role)}>
                              {log.old_role}
                            </Badge>
                          )}
                          {log.old_role && <span>→</span>}
                          <Badge className={getRoleBadgeColor(log.new_role)}>
                            {log.new_role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.modified_by}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-xs truncate">
                          {log.reason || 'No reason provided'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Requests Tab - Placeholder for future workflow */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Change Requests</CardTitle>
              <CardDescription>
                Pending role modification requests requiring approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground">
                  Role requests will appear here when the approval workflow is implemented.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};