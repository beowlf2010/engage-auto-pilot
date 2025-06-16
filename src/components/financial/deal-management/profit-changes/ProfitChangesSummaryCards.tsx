
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "../DealManagementUtils";
import { ProfitChangesSummary } from "@/services/financial/profitHistoryService";

interface ProfitChangesSummaryCardsProps {
  summary: ProfitChangesSummary;
}

const ProfitChangesSummaryCards = ({ summary }: ProfitChangesSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Deals with Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalDealsWithChanges}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Total Gross Change</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalGrossChange)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Total F&I Change</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalFiChange)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Total Profit Change</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalProfitChange)}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitChangesSummaryCards;
