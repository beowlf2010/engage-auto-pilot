
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download, FileText, Printer, ExternalLink } from "lucide-react";
import { Deal } from "./DealManagementTypes";
import { exportToCSV, printReport, openPrintableView } from "./ExportUtils";

interface ExportDropdownProps {
  deals: Deal[];
  packAdjustment: number;
  packAdjustmentEnabled: boolean;
  reportType?: string;
}

const ExportDropdown = ({ 
  deals, 
  packAdjustment, 
  packAdjustmentEnabled,
  reportType = "deal-management"
}: ExportDropdownProps) => {
  const handlePrint = () => {
    printReport();
  };

  const handleCSVExport = () => {
    const filename = `${reportType}-${new Date().toISOString().split('T')[0]}`;
    exportToCSV(deals, packAdjustment, filename);
  };

  const handlePrintableView = () => {
    openPrintableView(deals, packAdjustment, packAdjustmentEnabled);
  };

  const handlePrintToPDF = () => {
    // Open print dialog with instructions
    if (window.confirm('This will open the print dialog. To save as PDF, select "Save as PDF" as your printer destination.')) {
      printReport();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" className="print:hidden">
          <Download className="w-4 h-4 mr-2" />
          Export Report
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handlePrintToPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Save as PDF
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handlePrintableView}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Printable View
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleCSVExport}>
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportDropdown;
