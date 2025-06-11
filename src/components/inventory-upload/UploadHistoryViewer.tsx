
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Trash2, 
  FileText, 
  FileSpreadsheet, 
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { getUploadHistory, downloadStoredFile, deleteStoredFile, type UploadHistoryRecord } from "@/utils/fileStorageUtils";
import { useToast } from "@/hooks/use-toast";

interface UploadHistoryViewerProps {
  userId: string;
}

const UploadHistoryViewer = ({ userId }: UploadHistoryViewerProps) => {
  const [uploads, setUploads] = useState<UploadHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadUploadHistory();
  }, [userId]);

  const loadUploadHistory = async () => {
    try {
      setLoading(true);
      const history = await getUploadHistory(userId, filterType === "all" ? undefined : filterType);
      setUploads(history);
    } catch (error) {
      toast({
        title: "Error loading history",
        description: error instanceof Error ? error.message : "Failed to load upload history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (upload: UploadHistoryRecord) => {
    try {
      const fileBlob = await downloadStoredFile(upload.stored_filename);
      const url = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = upload.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: `Downloading ${upload.original_filename}`
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (upload: UploadHistoryRecord) => {
    if (!confirm(`Are you sure you want to delete ${upload.original_filename}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteStoredFile(upload.stored_filename, upload.id);
      await loadUploadHistory(); // Refresh the list
      
      toast({
        title: "File deleted",
        description: `${upload.original_filename} has been deleted`
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'csv') {
      return <FileText className="w-4 h-4 text-blue-600" />;
    }
    return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  };

  const filteredUploads = uploads.filter(upload => {
    const matchesSearch = upload.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         upload.inventory_condition?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || upload.upload_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading upload history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            onClick={() => setFilterType("all")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filterType === "inventory" ? "default" : "outline"}
            onClick={() => setFilterType("inventory")}
            size="sm"
          >
            Inventory
          </Button>
          <Button
            variant={filterType === "leads" ? "default" : "outline"}
            onClick={() => setFilterType("leads")}
            size="sm"
          >
            Leads
          </Button>
        </div>
      </div>

      {/* Upload History List */}
      {filteredUploads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No uploads found</h3>
            <p className="text-slate-600">
              {searchTerm ? "No uploads match your search criteria." : "You haven't uploaded any files yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredUploads.map((upload) => (
            <Card key={upload.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(upload.file_type)}
                      {getStatusIcon(upload.processing_status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">
                        {upload.original_filename}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-slate-600">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(upload.created_at).toLocaleDateString()}</span>
                        </span>
                        <span>{(upload.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        {upload.inventory_condition && (
                          <Badge variant="outline">{upload.inventory_condition}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-800">
                        {upload.successful_imports} / {upload.total_rows}
                      </div>
                      <div className="text-xs text-slate-600">
                        {upload.failed_imports > 0 && (
                          <span className="text-red-600">{upload.failed_imports} errors</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      onClick={() => handleDownload(upload)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </Button>
                    <Button
                      onClick={() => handleDelete(upload)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {upload.error_details && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <h4 className="text-sm font-medium text-red-800 mb-1">Error Details:</h4>
                    <div className="text-xs text-red-700 max-h-20 overflow-y-auto">
                      {upload.error_details.split('\n').map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadHistoryViewer;
