
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText } from "lucide-react";
import { type SheetInfo } from "@/utils/enhancedFileParsingUtils";

interface SheetSelectorProps {
  sheets: SheetInfo[];
  onSheetSelected: (sheetName: string) => void;
  fileName: string;
}

const SheetSelector = ({ sheets, onSheetSelected, fileName }: SheetSelectorProps) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5" />
            <span>Multiple Sheets Detected</span>
          </CardTitle>
          <p className="text-slate-600">
            The file "{fileName}" contains multiple sheets. Please select which sheet you want to import:
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sheets.map((sheet, index) => (
          <Card key={sheet.name} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-800 flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>{sheet.name}</span>
                  </h3>
                  <Badge variant="outline">
                    {sheet.rowCount} rows
                  </Badge>
                </div>

                {sheet.hasHeaders && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-700">Preview:</h4>
                    <div className="bg-slate-50 border rounded p-3 text-xs space-y-1">
                      {sheet.preview.map((row, rowIndex) => (
                        <div key={rowIndex} className="text-slate-600 truncate">
                          {row}
                        </div>
                      ))}
                      {sheet.preview.length === 0 && (
                        <div className="text-slate-400">No data preview available</div>
                      )}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => onSheetSelected(sheet.name)}
                  className="w-full"
                  variant={index === 0 ? "default" : "outline"}
                >
                  Import "{sheet.name}"
                  {index === 0 && <span className="ml-1 text-xs">(Recommended)</span>}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Usually the first sheet contains the main inventory data. 
          If you're unsure, select the sheet with the most rows or the one containing 
          vehicle information like VIN, Make, Model, etc.
        </p>
      </div>
    </div>
  );
};

export default SheetSelector;
