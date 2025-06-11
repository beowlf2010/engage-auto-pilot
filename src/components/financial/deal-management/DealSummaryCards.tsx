
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryTotals {
  newRetail: { units: number; gross: number; fi: number; total: number };
  usedRetail: { units: number; gross: number; fi: number; total: number };
  totalRetail: { units: number; gross: number; fi: number; total: number };
  dealerTrade: { units: number; gross: number; fi: number; total: number };
  wholesale: { units: number; gross: number; fi: number; total: number };
}

interface DealSummaryCardsProps {
  summaryTotals: SummaryTotals;
  packAdjustmentEnabled: boolean;
  localPackAdjustment: number;
  formatCurrency: (value?: number) => string;
}

const DealSummaryCards = ({
  summaryTotals,
  packAdjustmentEnabled,
  localPackAdjustment,
  formatCurrency
}: DealSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">New Retail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold text-blue-600">
            {summaryTotals.newRetail.units} units
          </div>
          <div className="text-sm text-gray-600">
            Gross: {formatCurrency(summaryTotals.newRetail.gross)}
          </div>
          <div className="text-sm text-gray-600">
            F&I: {formatCurrency(summaryTotals.newRetail.fi)}
          </div>
          <div className="text-sm font-medium">
            Total: {formatCurrency(summaryTotals.newRetail.total)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Used Retail
            {packAdjustmentEnabled && localPackAdjustment > 0 && (
              <span className="text-xs text-green-600 ml-1">
                (+${localPackAdjustment})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold text-green-600">
            {summaryTotals.usedRetail.units} units
          </div>
          <div className="text-sm text-gray-600">
            Gross: {formatCurrency(summaryTotals.usedRetail.gross)}
          </div>
          <div className="text-sm text-gray-600">
            F&I: {formatCurrency(summaryTotals.usedRetail.fi)}
          </div>
          <div className="text-sm font-medium">
            Total: {formatCurrency(summaryTotals.usedRetail.total)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Total Retail
            {packAdjustmentEnabled && localPackAdjustment > 0 && (
              <span className="text-xs text-green-600 ml-1">
                (includes pack)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold text-indigo-600">
            {summaryTotals.totalRetail.units} units
          </div>
          <div className="text-sm text-gray-600">
            Gross: {formatCurrency(summaryTotals.totalRetail.gross)}
          </div>
          <div className="text-sm text-gray-600">
            F&I: {formatCurrency(summaryTotals.totalRetail.fi)}
          </div>
          <div className="text-sm font-medium">
            Total: {formatCurrency(summaryTotals.totalRetail.total)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Dealer Trade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold text-purple-600">
            {summaryTotals.dealerTrade.units} units
          </div>
          <div className="text-sm text-gray-600">
            Gross: {formatCurrency(summaryTotals.dealerTrade.gross)}
          </div>
          <div className="text-sm text-gray-600">
            F&I: {formatCurrency(summaryTotals.dealerTrade.fi)}
          </div>
          <div className="text-sm font-medium">
            Total: {formatCurrency(summaryTotals.dealerTrade.total)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Wholesale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold text-orange-600">
            {summaryTotals.wholesale.units} units
          </div>
          <div className="text-sm text-gray-600">
            Gross: {formatCurrency(summaryTotals.wholesale.gross)}
          </div>
          <div className="text-sm text-gray-600">
            F&I: {formatCurrency(summaryTotals.wholesale.fi)}
          </div>
          <div className="text-sm font-medium">
            Total: {formatCurrency(summaryTotals.wholesale.total)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DealSummaryCards;
