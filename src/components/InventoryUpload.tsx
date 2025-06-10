
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, AlertCircle, FileText, CheckCircle, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseInventoryFile } from "@/utils/fileParsingUtils";

interface InventoryUploadProps {
  user: {
    role: string;
  };
}

const InventoryUpload = ({ user }: InventoryUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedCondition, setSelectedCondition] = useState<'new' | 'used' | 'certified'>('used');
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

    setUploading(true);
    setSelectedCondition(condition);
    
    try {
      console.log(`Processing ${file.name} as ${condition} inventory...`);
      const parsed = await parseInventoryFile(file);
      console.log(`Parsed ${parsed.fileType} file with ${parsed.rows.length} rows`);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of parsed.rows) {
        try {
          // Map columns to database fields with more flexible column matching
          const inventoryItem = {
            vin: row.VIN || row.vin || row.Vin || '',
            stock_number: row.stock_number || row.stock || row.Stock || row.StockNumber || null,
            year: parseInt(row.year || row.Year || row.MODEL_YEAR || '') || null,
            make: row.make || row.Make || row.MAKE || '',
            model: row.model || row.Model || row.MODEL || '',
            trim: row.trim || row.Trim || row.TRIM || null,
            body_style: row.body_style || row.style || row.BodyStyle || row.BODY_STYLE || null,
            color_exterior: row.color_exterior || row.exterior_color || row.ExteriorColor || row.EXTERIOR_COLOR || null,
            color_interior: row.color_interior || row.interior_color || row.InteriorColor || row.INTERIOR_COLOR || null,
            mileage: parseInt(row.mileage || row.Mileage || row.MILEAGE || row.odometer || '') || null,
            price: parseFloat(row.price || row.Price || row.PRICE || row.asking_price || '') || null,
            msrp: parseFloat(row.msrp || row.MSRP || row.list_price || '') || null,
            condition: condition, // Use the selected condition
            status: (row.status || row.Status || 'available').toLowerCase(),
            fuel_type: row.fuel_type || row.fuel || row.FuelType || row.FUEL_TYPE || null,
            transmission: row.transmission || row.trans || row.Transmission || row.TRANSMISSION || null,
            drivetrain: row.drivetrain || row.drive || row.Drivetrain || row.DRIVETRAIN || null,
            engine: row.engine || row.Engine || row.ENGINE || null,
            description: row.description || row.Description || row.DESCRIPTION || null,
            location: row.location || row.Location || row.LOCATION || 'lot'
          };

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

      setUploadResult({
        total: parsed.rows.length,
        success: successCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10), // Show first 10 errors
        fileType: parsed.fileType,
        fileName: file.name,
        condition: condition
      });

      toast({
        title: "Upload completed",
        description: `${successCount} ${condition} vehicles imported, ${errorCount} errors`,
        variant: errorCount > 0 ? "default" : "default"
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Error processing the file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

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
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Upload Inventory</h2>
        <p className="text-slate-600 mt-1">
          Import your vehicle inventory from CSV or Excel files
        </p>
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
              <h3 className="text-lg font-medium">Supported File Formats</h3>
            </div>
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="font-medium">Excel Files</span>
                <span className="text-slate-600">.xlsx, .xls</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">CSV Files</span>
                <span className="text-slate-600">.csv</span>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-800">
                <strong>New Feature:</strong> You can now upload Excel files directly! 
                No need to convert to CSV first.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-medium">Required Columns</h3>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">VIN</span>
                <span className="text-slate-600">Required</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Make</span>
                <span className="text-slate-600">Required</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Model</span>
                <span className="text-slate-600">Required</span>
              </div>
              <div className="flex justify-between">
                <span>Year, Price, Mileage</span>
                <span className="text-slate-600">Optional</span>
              </div>
              <div className="flex justify-between">
                <span>Stock Number, Trim</span>
                <span className="text-slate-600">Optional</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> Column names are flexible - the system will automatically 
                detect common variations like "VIN", "vin", "Vin", etc.
              </p>
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
              ({uploadResult.fileType.toUpperCase()} file: {uploadResult.fileName})
            </span>
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
              <strong>Condition Set:</strong> All vehicles were imported as "{uploadResult.condition}" condition.
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
