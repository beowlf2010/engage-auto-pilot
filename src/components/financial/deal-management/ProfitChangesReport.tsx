
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  getProfitChangesForPeriod, 
  calculateProfitChangesSummary,
  ProfitHistoryRecord 
} from "@/services/financial/profitHistoryService";
import ProfitChangesSummaryCards from "./profit-changes/ProfitChangesSummaryCards";
import ProfitChangesPrintHeader from "./profit-changes/ProfitChangesPrintHeader";
import ProfitChangesTable from "./profit-changes/ProfitChangesTable";
import ExportDropdown from "./ExportDropdown";

interface ProfitChangesReportProps {
  startDate?: string;
  endDate?: string;
}

const ProfitChangesReport = ({ 
  startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate = new Date().toISOString().split('T')[0]
}: ProfitChangesReportProps) => {
  const [profitHistory, setProfitHistory] = useState<ProfitHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfitChanges();
  }, [startDate, endDate]);

  const fetchProfitChanges = async () => {
    try {
      setLoading(true);
      const history = await getProfitChangesForPeriod(startDate, endDate);
      setProfitHistory(history);
    } catch (error) {
      console.error('Error fetching profit changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const summary = calculateProfitChangesSummary(profitHistory);

  // Convert profit history records to Deal format for export
  const dealsForExport = summary.changesDetected.map(record => ({
    id: record.id,
    stock_number: record.stock_number,
    year_model: record.stock_number || 'Unknown',
    buyer_name: 'N/A',
    deal_type: 'N/A',
    sale_amount: 0,
    gross_profit: record.gross_profit || 0,
    fi_profit: record.fi_profit || 0,
    total_profit: record.total_profit || 0,
    upload_date: record.snapshot_date,
    age: 0,
    deal_type_locked: false
  }));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading profit changes...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ProfitChangesPrintHeader 
        startDate={startDate} 
        endDate={endDate} 
        summary={summary} 
      />

      <ProfitChangesSummaryCards summary={summary} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between print:block">
          <div>
            <CardTitle>Profit Changes Detail</CardTitle>
            <CardDescription>
              Deals with profit changes in the selected period (Total Profit includes pack adjustments)
            </CardDescription>
          </div>
          <ExportDropdown 
            deals={dealsForExport}
            packAdjustment={0}
            packAdjustmentEnabled={false}
            reportType="profit-changes"
          />
        </CardHeader>
        <CardContent>
          <ProfitChangesTable summary={summary} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitChangesReport;
