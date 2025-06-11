import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, AlertCircle, FileText, CheckCircle, FileSpreadsheet, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseEnhancedInventoryFile, mapRowToInventoryItem, getSheetInfo, type SheetInfo } from "@/utils/enhancedFileParsingUtils";
import { storeUploadedFile, updateUploadHistory, type UploadHistoryRecord } from "@/utils/fileStorageUtils";
import UploadHistoryViewer from "./inventory-upload/UploadHistoryViewer";
import SheetSelector from "./inventory-upload/SheetSelector";

interface InventoryUploadProps {
  user: {
    id: string;
    role: string;
  };
}

const InventoryUpload = ({ user }: InventoryUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedCondition, setSelectedCondition] = useState<'new' | 'used' | 'certified'>('used');
  const [showHistory, setShowHistory] = useState(false);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [sheetsInfo, setSheetsInfo] = useState<SheetInfo[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Check permissions
  if (!["manager", "admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Access Denied</h3>
          <p className="text-slate-600">Only managers and admins can upload inventory</p>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, condition: 'new' | 'used' | 'certified') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
        variant: "destructive"
      });
      return;
    }

    setSelectedCondition(condition);
    setPendingFile(file);

    // Check if it's an Excel file with multiple sheets
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      try {
        const sheets = await getSheetInfo(file);
        if (sheets.length > 1) {
          setSheetsInfo(sheets);
          setShowSheetSelector(true);
          return;
        }
      } catch (error) {
        console.error('Error getting sheet info:', error);
      }
    }

    // Process single sheet or CSV file
    await processFile(file, condition);
    
    // Reset the input
    event.target.value = '';
  };

  const processFile = async (file: File, condition: 'new' | 'used' | 'certified', selectedSheet?: string) => {
    setUploading(true);
    let uploadRecord: UploadHistoryRecord | null = null;
    
    try {
      console.log(`Processing ${file.name} as ${condition} inventory...`);
      
      // Store the original file first
      uploadRecord = await storeUploadedFile(file, user.id, 'inventory', condition);
      console.log('File stored with ID:', uploadRecord.id);
      
      // Parse the file with enhanced parsing
      const parsed = await parseEnhancedInventoryFile(file, selectedSheet);
      console.log(`Parsed ${parsed.fileType} file with ${parsed.rows.length} rows, format: ${parsed.formatType}`);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of parsed.rows) {
        try {
          // Use enhanced mapping function
          const inventoryItem = mapRowToInventoryItem(row, condition, uploadRecord.id);

          // Validate required fields
          if (!inventoryItem.vin || !inventoryItem.make || !inventoryItem.model) {
            errors.push(`Row missing required fields: VIN="${inventoryItem.vin}", Make="${inventoryItem.make}", Model="${inventoryItem.model}"`);
            errorCount++;
            continue;
          }

          // Upsert inventory item
          const { error } = await supabase
            .from('inventory')
            .upsert(inventoryItem, {
              onConflict: 'vin'
            });

          if (error) {
            errors.push(`Error inserting ${inventoryItem.vin}: ${error.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          errors.push(`Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errorCount++;
        }
      }

      // Update upload history with results
      await updateUploadHistory(uploadRecord.id, {
        total_rows: parsed.rows.length,
        successful_imports: successCount,
        failed_imports: errorCount,
        processing_status: 'completed',
        error_details: errors.length > 0 ? errors.slice(0, 10).join('\n') : undefined
      });

      setUploadResult({
        total: parsed.rows.length,
        success: successCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10),
        fileType: parsed.fileType,
        fileName: file.name,
        condition: condition,
        formatType: parsed.formatType,
        uploadId: uploadRecord.id
      });

      toast({
        title: "Upload completed",
        description: `${successCount} ${condition} vehicles imported, ${errorCount} errors`,
        variant: errorCount > 0 ? "default" : "default"
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Update upload history with error
      if (uploadRecord) {
        await updateUploadHistory(uploadRecord.id, {
          processing_status: 'failed',
          error_details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Error processing the file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setPendingFile(null);
      setShowSheetSelector(false);
    }
  };

  const handleSheetSelected = (sheetName: string) => {
    if (pendingFile) {
      processFile(pendingFile, selectedCondition, sheetName);
    }
  };

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

  const uploadButtons = [
    {
      condition: 'new' as const,
      label: 'Upload New Vehicles',
      description: 'Brand new vehicles from factory',
      icon: '🆕',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      condition: 'used' as const,
      label: 'Upload Used Vehicles', 
      description: 'Pre-owned vehicles',
      icon: '🚗',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      condition: 'certified' as const,
      label: 'Upload Certified Pre-Owned',
      description: 'Manufacturer certified vehicles',
      icon: '✅',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

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
        {/* Upload Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Choose Upload Type</h3>
          
          {uploadButtons.map((button) => (
            <Card key={button.condition} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{button.icon}</span>
                  <div>
                    <h4 className="font-medium text-slate-800">{button.label}</h4>
                    <p className="text-sm text-slate-600">{button.description}</p>
                  </div>
                </div>
                
                <div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, button.condition)}
                    disabled={uploading}
                    className="hidden"
                    id={`upload-${button.condition}`}
                  />
                  
                  <Button
                    onClick={() => document.getElementById(`upload-${button.condition}`)?.click()}
                    disabled={uploading}
                    className={`${button.color} text-white`}
                  >
                    {uploading && selectedCondition === button.condition ? (
                      "Uploading..."
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* File Format Support & Requirements */}
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-medium">Enhanced File Support</h3>
            </div>
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="font-medium">Excel Files</span>
                <span className="text-slate-600">.xlsx, .xls (Multi-sheet)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">CSV Files</span>
                <span className="text-slate-600">.csv</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Formats Detected</span>
                <span className="text-slate-600">Vauto, GM Global</span>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>New:</strong> Comprehensive field capture including pricing, 
                warranty, history, and dealer-specific data. Original files are 
                permanently stored for your records.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-sm text-green-800">
                <strong>Auto-Detection:</strong> System automatically detects Vauto 
                New, Vauto Used, and GM Global formats for optimized field mapping.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-medium">Comprehensive Data Capture</h3>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Required Fields</span>
                <span className="text-slate-600">VIN, Make, Model</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Pricing Fields</span>
                <span className="text-slate-600">MSRP, Invoice, Wholesale</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Dealer Data</span>
                <span className="text-slate-600">Pack, Holdback, Incentives</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Vehicle History</span>
                <span className="text-slate-600">Accidents, Owners, Records</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Warranty Info</span>
                <span className="text-slate-600">Type, Duration, Coverage</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-medium">Upload Results</h3>
            <span className="text-sm text-slate-600">
              ({uploadResult.fileType.toUpperCase()}: {uploadResult.fileName})
            </span>
            {uploadResult.formatType && (
              <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                {uploadResult.formatType.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{uploadResult.total}</div>
              <div className="text-sm text-slate-600">Total Rows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{uploadResult.success}</div>
              <div className="text-sm text-slate-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{uploadResult.errors}</div>
              <div className="text-sm text-slate-600">Errors</div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>File Stored:</strong> Original file permanently stored with ID: {uploadResult.uploadId?.slice(-8)}
            </p>
          </div>

          {uploadResult.errorDetails && uploadResult.errorDetails.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Error Details:</h4>
              <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                {uploadResult.errorDetails.map((error: string, index: number) => (
                  <div key={index} className="text-sm text-red-800 mb-1">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default InventoryUpload;
