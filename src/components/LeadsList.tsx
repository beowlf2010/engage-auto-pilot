
import React, { useState, useEffect } from 'react';
import { useAuth } from './auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Users, FileSpreadsheet, Plus, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CSVUploadModal from './upload-leads/CSVUploadModal';
import VINImportModal from './leads/VINImportModal';

interface Lead {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  vehicle_interest?: string;
  source?: string;
  status?: string;
  created_at: string;
}

const LeadsList = () => {
  const { user, profile, loading: authLoading, initializeUserForCSV } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVINImportModal, setShowVINImportModal] = useState(false);
  const [userInitialized, setUserInitialized] = useState(false);
  const { toast } = useToast();

  // Initialize user for CSV operations on component mount
  useEffect(() => {
    const initializeUser = async () => {
      if (!user || !profile || userInitialized) return;
      
      console.log('🔧 [LEADS] Initializing user for CSV operations');
      const result = await initializeUserForCSV();
      
      if (result.success) {
        setUserInitialized(true);
        console.log('✅ [LEADS] User initialized successfully');
      } else {
        console.error('❌ [LEADS] User initialization failed:', result.error);
        toast({
          title: "Initialization Warning",
          description: "User profile setup incomplete. CSV uploads may not work properly.",
          variant: "destructive"
        });
      }
    };

    if (!authLoading && user && profile) {
      initializeUser();
    }
  }, [user, profile, authLoading, userInitialized, initializeUserForCSV, toast]);

  // Fetch leads
  const fetchLeads = async () => {
    try {
      setLoading(true);
      console.log('📊 [LEADS] Fetching leads for user:', user?.id);
      
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          email,
          vehicle_interest,
          source,
          status,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ [LEADS] Error fetching leads:', error);
        throw error;
      }

      console.log(`✅ [LEADS] Fetched ${data?.length || 0} leads`);
      setLeads(data || []);
    } catch (error) {
      console.error('💥 [LEADS] Failed to fetch leads:', error);
      toast({
        title: "Error",
        description: "Failed to load leads. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && userInitialized) {
      fetchLeads();
    }
  }, [user, authLoading, userInitialized]);

  const handleUploadSuccess = () => {
    fetchLeads();
    setShowUploadModal(false);
    toast({
      title: "Success",
      description: "Leads uploaded successfully!",
    });
  };

  const handleVINImportSuccess = () => {
    fetchLeads();
    setShowVINImportModal(false);
    toast({
      title: "Success",
      description: "VIN data imported successfully!",
    });
  };

  const handleCSVUpload = async () => {
    if (!userInitialized) {
      console.log('🔧 [LEADS] User not initialized, initializing now...');
      const result = await initializeUserForCSV();
      
      if (!result.success) {
        toast({
          title: "Setup Required",
          description: result.error || "Please ensure your profile is set up correctly.",
          variant: "destructive"
        });
        return;
      }
      
      setUserInitialized(true);
    }
    
    setShowUploadModal(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access the leads management system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leads Management</h1>
              <p className="mt-2 text-gray-600">
                Manage your sales leads and customer data
                {profile && (
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {profile.role || 'user'}
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button onClick={() => setShowVINImportModal(true)} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Import from VIN
              </Button>
              <Button onClick={handleCSVUpload} className="bg-blue-600 hover:bg-blue-700">
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads.length}</div>
              <p className="text-xs text-muted-foreground">Active customer records</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leads.filter(lead => {
                  const createdAt = new Date(lead.created_at);
                  const oneDayAgo = new Date();
                  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                  return createdAt > oneDayAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">New leads today</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status Ready</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {userInitialized ? 'Ready' : 'Initializing...'}
              </div>
              <p className="text-xs text-muted-foreground">System status</p>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>
              Your latest customer leads and their information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leads yet</h3>
                <p className="text-gray-600 mb-4">Get started by uploading your first CSV file</p>
                <Button onClick={handleCSVUpload} className="bg-blue-600 hover:bg-blue-700">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV File
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle Interest
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {lead.first_name || lead.last_name ? 
                            `${lead.first_name || ''} ${lead.last_name || ''}`.trim() : 
                            'No name'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lead.email || 'No email'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lead.vehicle_interest || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lead.source || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            lead.status === 'new' ? 'bg-green-100 text-green-800' :
                            lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'qualified' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {lead.status || 'new'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        {showUploadModal && (
          <CSVUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onSuccess={handleUploadSuccess}
          />
        )}

        {showVINImportModal && (
          <VINImportModal
            isOpen={showVINImportModal}
            onClose={() => setShowVINImportModal(false)}
            onImportSuccess={handleVINImportSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default LeadsList;
