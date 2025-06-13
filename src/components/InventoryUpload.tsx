
import { Button } from "@/components/ui/button";
import { History, Package, BarChart3 } from "lucide-react";
import { useInventoryUpload } from "@/hooks/useInventoryUpload";
import { useMultiFileUpload } from "@/hooks/useMultiFileUpload";
import { Link } from "react-router-dom";
import AccessDenied from "./inventory-upload/AccessDenied";
import UploadInfoCards from "./inventory-upload/UploadInfoCards";
import UploadHistoryViewer from "./inventory-upload/UploadHistoryViewer";
import SheetSelector from "./inventory-upload/SheetSelector";
import DragDropFileQueue from "./inventory-upload/DragDropFileQueue";
import BatchUploadResult from "./inventory-upload/BatchUploadResult";
import type { QueuedFile } from "./inventory-upload/DragDropFileQueue";

interface InventoryUploadProps {
  user: {
    id: string;
    role: string;
  };
}

const InventoryUpload = ({ user }: InventoryUploadProps) => {
  const {
    showHistory,
    setShowHistory,
    showSheetSelector,
    setShowSheetSelector,
    sheetsInfo,
    pendingFile,
    handleSheetSelected
  } = useInventoryUpload({ userId: user.id });

  const {
    processing,
    batchResult,
    setBatchResult,
    processFile,
    processBatch
  } = useMultiFileUpload({ userId: user.id });

  // Check permissions
  if (!["manager", "admin"].includes(user.role)) {
    return <AccessDenied />;
  }

  if (showHistory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Upload History</h2>
            <p className="text-slate-600 mt-1">View and manage your inventory upload history</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/inventory-dashboard">
              <Button variant="outline" className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>View Inventory</span>
              </Button>
            </Link>
            <Button onClick={() => setShowHistory(false)} variant="outline">
              Back to Upload
            </Button>
          </div>
        </div>
        <UploadHistoryViewer userId={user.id} />
      </div>
    );
  }

  if (showSheetSelector) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Select Sheet</h2>
            <p className="text-slate-600 mt-1">Choose which sheet to import from your Excel file</p>
          </div>
          <Button onClick={() => setShowSheetSelector(false)} variant="outline">
            Cancel
          </Button>
        </div>
        <SheetSelector 
          sheets={sheetsInfo} 
          onSheetSelected={handleSheetSelected}
          fileName={pendingFile?.name || ''}
        />
      </div>
    );
  }

  const handleFilesProcessed = async (files: QueuedFile[]) => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length > 0) {
      await processBatch(pendingFiles);
    }
  };

  const handleSingleFileProcess = async (file: QueuedFile) => {
    await processFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Upload Inventory</h2>
          <p className="text-slate-600 mt-1">
            Import multiple vehicle inventory files with drag & drop functionality
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link to="/inventory-dashboard">
            <Button variant="outline" className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>View Inventory</span>
            </Button>
          </Link>
          <Link to="/rpo-insights">
            <Button variant="outline" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>RPO Insights</span>
            </Button>
          </Link>
          <Button onClick={() => setShowHistory(true)} variant="outline" className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span>View History</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DragDropFileQueue 
            onFilesProcessed={handleFilesProcessed}
            onFileProcess={handleSingleFileProcess}
            processing={processing}
          />
        </div>
        <div>
          <UploadInfoCards />
        </div>
      </div>

      {batchResult && (
        <BatchUploadResult result={batchResult} />
      )}
    </div>
  );
};

export default InventoryUpload;
