
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Package, BarChart3, Trash2, Globe, Clock, Loader2 } from "lucide-react";
import { useInventoryUpload } from "@/hooks/useInventoryUpload";
import { useEnhancedMultiFileUpload } from "@/hooks/useEnhancedMultiFileUpload";
import { Link } from "react-router-dom";
import { performInventoryCleanup } from "@/services/inventory/core/inventoryCleanupService";
import { toast } from "@/hooks/use-toast";
import AccessDenied from "./inventory-upload/AccessDenied";
import UploadInfoCards from "./inventory-upload/UploadInfoCards";
import UploadHistoryViewer from "./inventory-upload/UploadHistoryViewer";
import SheetSelector from "./inventory-upload/SheetSelector";
import DragDropFileQueue from "./inventory-upload/DragDropFileQueue";
import EnhancedBatchUploadResult from "./inventory-upload/EnhancedBatchUploadResult";
import VehicleScraper from "./inventory-upload/VehicleScraper";
import UploadSessionControls from "./inventory-upload/UploadSessionControls";
import InventoryFieldMapper from "./inventory-mapper/InventoryFieldMapper";
import DuplicateHandlingControls from "./inventory-upload/DuplicateHandlingControls";
import type { QueuedFile } from "./inventory-upload/DragDropFileQueue";

interface InventoryUploadProps {
  user: {
    id: string;
    role: string;
  };
}

const InventoryUpload = ({ user }: InventoryUploadProps) => {
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'replace'>('skip');
  const [clearingInventory, setClearingInventory] = useState(false);

  // Always call hooks first, before any early returns
  const {
    showHistory,
    setShowHistory,
    showSheetSelector,
    setShowSheetSelector,
    sheetsInfo,
    pendingFile,
    handleSheetSelected,
    showFieldMapper,
    setShowFieldMapper,
    csvHeaders,
    sampleData,
    handleFieldMappingComplete
  } = useInventoryUpload({ userId: user.id });

  const {
    processing,
    batchResult,
    setBatchResult,
    processFile,
    processBatch
  } = useEnhancedMultiFileUpload({ userId: user.id, duplicateStrategy });

  // Check permissions AFTER all hooks are called
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

  const handleClearOldInventory = async () => {
    setClearingInventory(true);
    try {
      await performInventoryCleanup();
      toast({
        title: "Old inventory cleared",
        description: "Previous inventory data has been cleaned up to reduce duplicates",
      });
    } catch (error) {
      console.error('Inventory cleanup failed:', error);
      toast({
        title: "Cleanup failed",
        description: "Could not clear old inventory. Please try again.",
        variant: "destructive"
      });
    } finally {
      setClearingInventory(false);
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
            <h2 className="text-2xl font-bold text-slate-800">Upload History & Vehicle Tracking</h2>
            <p className="text-slate-600 mt-1">View upload history, vehicle timelines, and duplicate management</p>
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

  if (showFieldMapper) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Map Inventory Fields</h2>
            <p className="text-slate-600 mt-1">Configure how your data columns map to inventory fields</p>
          </div>
          <Button onClick={() => setShowFieldMapper(false)} variant="outline">
            Cancel
          </Button>
        </div>
        
        <InventoryFieldMapper
          csvHeaders={csvHeaders}
          sampleData={sampleData}
          onMappingComplete={(mapping, transformer) => {
            handleFieldMappingComplete(mapping, transformer);
          }}
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
    <div className="relative space-y-6">
      {/* Enhanced Processing Overlay with Navigation Protection */}
      {processing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl max-w-md mx-4">
            <div className="flex items-center space-x-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Processing Files</h3>
                <p className="text-slate-600">Please wait while your files are being processed...</p>
                <p className="text-sm text-slate-500 mt-2">⚠️ Do not navigate away or refresh this page</p>
                <p className="text-sm text-slate-400 mt-1">Processing will be interrupted if you leave</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Enhanced Inventory Management</h2>
          <p className="text-slate-600 mt-1">
            Smart report detection, vehicle history tracking, and automated duplicate management
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleCleanup}
            variant="outline"
            className="flex items-center space-x-2"
            disabled={processing}
          >
            <Trash2 className="w-4 h-4" />
            <span>Cleanup Old Data</span>
          </Button>
          <Link to="/inventory-dashboard">
            <Button variant="outline" className="flex items-center space-x-2" disabled={processing}>
              <Package className="w-4 h-4" />
              <span>View Inventory</span>
            </Button>
          </Link>
          <Link to="/rpo-insights">
            <Button variant="outline" className="flex items-center space-x-2" disabled={processing}>
              <BarChart3 className="w-4 h-4" />
              <span>RPO Insights</span>
            </Button>
          </Link>
          <Button 
            onClick={() => setShowHistory(true)} 
            variant="outline" 
            className="flex items-center space-x-2"
            disabled={processing}
          >
            <Clock className="w-4 h-4" />
            <span>Vehicle History</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="file-upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file-upload" className="flex items-center gap-2" disabled={processing}>
            <Package className="w-4 h-4" />
            Smart File Upload
          </TabsTrigger>
          <TabsTrigger value="website-scraping" className="flex items-center gap-2" disabled={processing}>
            <Globe className="w-4 h-4" />
            Website Scraping
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file-upload" className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Enhanced Processing Features</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Automatic report type detection (NEW CAR MAIN VIEW, GM Global, Sales Reports)</li>
              <li>• Vehicle history tracking across all uploads</li>
              <li>• Smart duplicate detection and merging</li>
              <li>• Data quality scoring and validation</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <DuplicateHandlingControls
                duplicateStrategy={duplicateStrategy}
                onStrategyChange={setDuplicateStrategy}
                duplicatesFound={batchResult?.duplicatesDetected}
                onClearOldInventory={handleClearOldInventory}
                clearingInventory={clearingInventory}
              />
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
            <EnhancedBatchUploadResult result={batchResult} />
          )}
        </TabsContent>

        <TabsContent value="website-scraping" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
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
