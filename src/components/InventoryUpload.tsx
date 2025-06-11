
import { Button } from "@/components/ui/button";
import { History, Package, BarChart3 } from "lucide-react";
import { useInventoryUpload } from "@/hooks/useInventoryUpload";
import { Link } from "react-router-dom";
import AccessDenied from "./inventory-upload/AccessDenied";
import UploadButtons from "./inventory-upload/UploadButtons";
import UploadInfoCards from "./inventory-upload/UploadInfoCards";
import UploadResult from "./inventory-upload/UploadResult";
import UploadHistoryViewer from "./inventory-upload/UploadHistoryViewer";
import SheetSelector from "./inventory-upload/SheetSelector";

interface InventoryUploadProps {
  user: {
    id: string;
    role: string;
  };
}

const InventoryUpload = ({ user }: InventoryUploadProps) => {
  const {
    uploading,
    uploadResult,
    selectedCondition,
    showHistory,
    setShowHistory,
    showSheetSelector,
    setShowSheetSelector,
    sheetsInfo,
    pendingFile,
    handleFileUpload,
    handleSheetSelected
  } = useInventoryUpload({ userId: user.id });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Upload Inventory</h2>
          <p className="text-slate-600 mt-1">
            Import your vehicle inventory from CSV or Excel files with permanent storage
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UploadButtons 
          onFileUpload={handleFileUpload}
          uploading={uploading}
          selectedCondition={selectedCondition}
        />
        <UploadInfoCards />
      </div>

      {uploadResult && (
        <div className="space-y-4">
          <UploadResult uploadResult={uploadResult} />
          
          {/* Success Actions */}
          {uploadResult.status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">Upload Complete! What's Next?</h3>
              <div className="flex flex-wrap gap-3">
                <Link to="/inventory-dashboard">
                  <Button size="sm" className="flex items-center space-x-2">
                    <Package className="w-4 h-4" />
                    <span>View Inventory Dashboard</span>
                  </Button>
                </Link>
                <Link to="/rpo-insights">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>Analyze RPO Performance</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryUpload;
