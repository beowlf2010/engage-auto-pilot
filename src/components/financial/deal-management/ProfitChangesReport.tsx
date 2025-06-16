
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { 
  getProfitChangesForPeriod, 
  calculateProfitChangesSummary,
  ProfitHistoryRecord 
} from "@/services/financial/profitHistoryService";
import ProfitChangesSummaryCards from "./profit-changes/ProfitChangesSummaryCards";
import ProfitChangesPrintHeader from "./profit-changes/ProfitChangesPrintHeader";
import ProfitChangesTable from "./profit-changes/ProfitChangesTable";

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

  const handlePrint = () => {
    window.print();
  };

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
          <Button onClick={handlePrint} className="print:hidden">
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </CardHeader>
        <CardContent>
          <ProfitChangesTable summary={summary} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitChangesReport;
