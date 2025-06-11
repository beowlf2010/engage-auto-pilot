
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";

interface SheetInfo {
  name: string;
  rowCount: number;
}

interface SheetSelectorProps {
  sheets: SheetInfo[];
  onSheetSelected: (sheetName: string) => void;
  fileName: string;
}

const SheetSelector = ({ sheets, onSheetSelected, fileName }: SheetSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <FileSpreadsheet className="w-12 h-12 text-blue-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">Multiple Sheets Detected</h3>
        <p className="text-slate-600">
          Your Excel file "{fileName}" contains multiple sheets. Please select which sheet to import.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sheets.map((sheet) => (
          <Card key={sheet.name} className="p-4 hover:bg-slate-50 cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-800">{sheet.name}</h4>
                <p className="text-sm text-slate-600">{sheet.rowCount} rows</p>
              </div>
              <Button onClick={() => onSheetSelected(sheet.name)}>
                Select Sheet
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SheetSelector;
