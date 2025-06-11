
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { useInventoryUpload } from "@/hooks/useInventoryUpload";
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
          <Button onClick={() => setShowHistory(false)} variant="outline">
            Back to Upload
          </Button>
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
        <Button onClick={() => setShowHistory(true)} variant="outline" className="flex items-center space-x-2">
          <History className="w-4 h-4" />
          <span>View History</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UploadButtons 
          onFileUpload={handleFileUpload}
          uploading={uploading}
          selectedCondition={selectedCondition}
        />
        <UploadInfoCards />
      </div>

      {uploadResult && <UploadResult uploadResult={uploadResult} />}
    </div>
  );
};

export default InventoryUpload;
