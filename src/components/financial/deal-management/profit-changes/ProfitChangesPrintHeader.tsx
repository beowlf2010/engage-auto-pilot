
import { formatCurrency } from "../DealManagementUtils";
import { ProfitChangesSummary } from "@/services/financial/profitHistoryService";

interface ProfitChangesPrintHeaderProps {
  startDate: string;
  endDate: string;
  summary: ProfitChangesSummary;
}

const ProfitChangesPrintHeader = ({ startDate, endDate, summary }: ProfitChangesPrintHeaderProps) => {
  return (
    <div className="print:block hidden">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Profit Changes Report</h1>
        <p className="text-lg text-gray-600 mb-4">
          Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
        </p>
        <p className="text-sm text-gray-500">
          Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Print Summary Section */}
      <div className="mb-8 p-6 border-2 border-gray-300">
        <h2 className="text-xl font-bold mb-4 text-center">Summary Totals</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Deals with Changes</div>
            <div className="text-2xl font-bold">{summary.totalDealsWithChanges}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Gross Change</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalGrossChange)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Total F&I Change</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalFiChange)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Profit Change (with Pack)</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalProfitChange)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitChangesPrintHeader;
