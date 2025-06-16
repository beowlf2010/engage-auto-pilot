
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
    if (window.confirm('This will open the print dialog. To save as PDF, select "Save as PDF" or "Microsoft Print to PDF" as your printer destination.')) {
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
      <DropdownMenuContent align="end" className="w-56 bg-white border shadow-lg z-50">
        <DropdownMenuItem onClick={handlePrintToPDF} className="cursor-pointer">
          <FileText className="w-4 h-4 mr-2" />
          Save as PDF
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
          <Printer className="w-4 h-4 mr-2" />
          Quick Print
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handlePrintableView} className="cursor-pointer">
          <ExternalLink className="w-4 h-4 mr-2" />
          Multi-Page Report View
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleCSVExport} className="cursor-pointer">
          <Download className="w-4 h-4 mr-2" />
          Export to CSV/Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportDropdown;
