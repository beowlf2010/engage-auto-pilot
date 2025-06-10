
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, AlertCircle, FileText, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InventoryUploadProps {
  user: {
    role: string;
  };
}

const InventoryUpload = ({ user }: InventoryUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
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

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV must have header and at least one data row');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return { headers, rows };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      const text = await file.text();
      const { rows } = parseCSV(text);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          // Map CSV columns to database fields
          const inventoryItem = {
            vin: row.VIN || row.vin,
            stock_number: row.stock_number || row.stock || row.Stock,
            year: parseInt(row.year || row.Year) || null,
            make: row.make || row.Make,
            model: row.model || row.Model,
            trim: row.trim || row.Trim || null,
            body_style: row.body_style || row.style || null,
            color_exterior: row.color_exterior || row.exterior_color || null,
            color_interior: row.color_interior || row.interior_color || null,
            mileage: parseInt(row.mileage || row.Mileage) || null,
            price: parseFloat(row.price || row.Price) || null,
            msrp: parseFloat(row.msrp || row.MSRP) || null,
            condition: (row.condition || row.Condition || 'used').toLowerCase(),
            status: (row.status || row.Status || 'available').toLowerCase(),
            fuel_type: row.fuel_type || row.fuel || null,
            transmission: row.transmission || row.trans || null,
            drivetrain: row.drivetrain || row.drive || null,
            engine: row.engine || row.Engine || null,
            description: row.description || row.Description || null,
            location: row.location || row.Location || 'lot'
          };

          // Validate required fields
          if (!inventoryItem.vin || !inventoryItem.make || !inventoryItem.model) {
            errors.push(`Row missing required fields: VIN, Make, or Model`);
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
        total: rows.length,
        success: successCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10) // Show first 10 errors
      });

      toast({
        title: "Upload completed",
        description: `${successCount} vehicles imported, ${errorCount} errors`,
        variant: errorCount > 0 ? "default" : "default"
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Error processing the CSV file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Upload Inventory</h2>
        <p className="text-slate-600 mt-1">
          Import your vehicle inventory to enable AI-powered matching
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <Card className="p-6">
          <div className="text-center">
            <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
            <p className="text-slate-600 mb-4">
              Select a CSV file with your vehicle inventory
            </p>
            
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="inventory-upload"
            />
            
            <Button
              onClick={() => document.getElementById('inventory-upload')?.click()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? "Uploading..." : "Choose CSV File"}
            </Button>
          </div>
        </Card>

        {/* Required Fields */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-medium">Required CSV Columns</h3>
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
              <span>Year</span>
              <span className="text-slate-600">Optional</span>
            </div>
            <div className="flex justify-between">
              <span>Price</span>
              <span className="text-slate-600">Optional</span>
            </div>
            <div className="flex justify-between">
              <span>Mileage</span>
              <span className="text-slate-600">Optional</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-slate-600">Optional (defaults to available)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-medium">Upload Results</h3>
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
