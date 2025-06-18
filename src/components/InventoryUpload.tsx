
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Package, BarChart3, Trash2, Globe } from "lucide-react";
import { useInventoryUpload } from "@/hooks/useInventoryUpload";
import { useMultiFileUpload } from "@/hooks/useMultiFileUpload";
import { Link } from "react-router-dom";
import { performInventoryCleanup } from "@/services/inventory/core/inventoryCleanupService";
import { toast } from "@/hooks/use-toast";
import AccessDenied from "./inventory-upload/AccessDenied";
import UploadInfoCards from "./inventory-upload/UploadInfoCards";
import UploadHistoryViewer from "./inventory-upload/UploadHistoryViewer";
import SheetSelector from "./inventory-upload/SheetSelector";
import DragDropFileQueue from "./inventory-upload/DragDropFileQueue";
import BatchUploadResult from "./inventory-upload/BatchUploadResult";
import VehicleScraper from "./inventory-upload/VehicleScraper";
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

  const handleCleanup = async () => {
    try {
      await performInventoryCleanup();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  };

  const handleScrapingComplete = (data: any) => {
    console.log('Website scraping completed:', data);
    toast({
      title: "Scraping Complete",
      description: `Successfully scraped ${data.completed || 0} pages from your website`,
    });
  };

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
          <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-600 mt-1">
            Upload files or scrape your website to import vehicle inventory
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleCleanup}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Cleanup Old Data</span>
          </Button>
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

      <Tabs defaultValue="file-upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file-upload" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            File Upload
          </TabsTrigger>
          <TabsTrigger value="website-scraping" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website Scraping
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file-upload" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="website-scraping" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VehicleScraper onScrapingComplete={handleScrapingComplete} />
            </div>
            <div>
              <UploadInfoCards />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryUpload;
