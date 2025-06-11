
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Download, Eye, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UploadHistoryViewerProps {
  userId: string;
}

const UploadHistoryViewer = ({ userId }: UploadHistoryViewerProps) => {
  const { data: uploadHistory, isLoading } = useQuery({
    queryKey: ['upload-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upload_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading upload history...</div>;
  }

  return (
    <div className="space-y-4">
      {uploadHistory?.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-600">No upload history found</p>
        </Card>
      ) : (
        uploadHistory?.map((upload) => (
          <Card key={upload.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div>
                  <h4 className="font-medium text-slate-800">{upload.original_filename}</h4>
                  <p className="text-sm text-slate-600">
                    {upload.upload_type} • {formatFileSize(upload.file_size)} • 
                    {formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(upload.processing_status)}>
                  {upload.processing_status}
                </Badge>
                {upload.inventory_condition && (
                  <Badge variant="outline">
                    {upload.inventory_condition}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 text-center text-sm mb-4">
              <div>
                <div className="font-medium text-slate-800">{upload.total_rows}</div>
                <div className="text-slate-600">Total Rows</div>
              </div>
              <div>
                <div className="font-medium text-green-600">{upload.successful_imports}</div>
                <div className="text-slate-600">Successful</div>
              </div>
              <div>
                <div className="font-medium text-red-600">{upload.failed_imports}</div>
                <div className="text-slate-600">Failed</div>
              </div>
              <div>
                <div className="font-medium text-blue-600">{upload.duplicate_count}</div>
                <div className="text-slate-600">Duplicates</div>
              </div>
            </div>

            {upload.error_details && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Errors:</strong> {upload.error_details}
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </Button>
              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                <Download className="w-4 h-4" />
                <span>Download</span>
              </Button>
              <Button variant="outline" size="sm" className="flex items-center space-x-1 text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default UploadHistoryViewer;
