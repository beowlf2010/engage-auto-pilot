
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMessageExport } from '@/hooks/useMessageExport';
import { Upload, Download, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const MessageExportImport = () => {
  const { exports, isLoading, loadExports, importFromFile, processImport, exportCurrentMessages } = useMessageExport();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportName, setExportName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadExports();
  }, [loadExports]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!exportName) {
        setExportName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !exportName.trim()) return;
    
    try {
      await importFromFile(selectedFile, exportName.trim());
      setSelectedFile(null);
      setExportName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleProcessImport = async (exportId: string) => {
    try {
      await processImport(exportId);
    } catch (error) {
      console.error('Processing failed:', error);
    }
  };

  const getStatusIcon = (processed: boolean) => {
    if (processed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (processed: boolean) => {
    if (processed) {
      return <Badge variant="outline" className="text-green-600 border-green-200">Processed</Badge>;
    }
    return <Badge variant="outline" className="text-yellow-600 border-yellow-200">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Message Export & Import</h2>
          <p className="text-gray-600">Import messages from VIN or export current system messages</p>
        </div>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Import from VIN</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Messages</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload VIN Message Export</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select VIN Export File (JSON)</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                />
              </div>

              {selectedFile && (
                <div className="space-y-2">
                  <Label htmlFor="export-name">Import Name</Label>
                  <Input
                    id="export-name"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    placeholder="Enter a name for this import"
                  />
                </div>
              )}

              <Button 
                onClick={handleImport}
                disabled={!selectedFile || !exportName.trim() || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" text="Uploading..." />
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process
                  </>
                )}
              </Button>

              {selectedFile && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import History */}
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && exports.length === 0 ? (
                <LoadingSpinner text="Loading import history..." />
              ) : exports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No imports yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exports.map((exportItem) => (
                    <div key={exportItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(exportItem.processed)}
                        <div>
                          <div className="font-medium">{exportItem.export_name}</div>
                          <div className="text-sm text-gray-500">
                            {exportItem.total_leads} leads • {exportItem.total_messages} messages
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(exportItem.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(exportItem.processed)}
                        {!exportItem.processed && (
                          <Button
                            size="sm"
                            onClick={() => handleProcessImport(exportItem.id)}
                            disabled={isLoading}
                          >
                            Process Import
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Export Current Messages</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Export all current system messages and lead data for backup or analysis.
              </p>
              
              <Button 
                onClick={exportCurrentMessages}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" text="Exporting..." />
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export All Messages
                  </>
                )}
              </Button>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Note:</strong> The export will include all messages, lead data, and conversation history. 
                    This may take some time for large datasets.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MessageExportImport;
