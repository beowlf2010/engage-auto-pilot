
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "./DealManagementUtils";
import { 
  getProfitChangesForPeriod, 
  calculateProfitChangesSummary,
  ProfitHistoryRecord 
} from "@/services/financial/profitHistoryService";

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

  const renderChangeIndicator = (currentValue: number, originalValue: number) => {
    const change = currentValue - originalValue;
    const isPositive = change > 0;
    
    return (
      <div className="flex items-center space-x-1">
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-green-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
        <span className={isPositive ? "text-green-600" : "text-red-600"}>
          {formatCurrency(Math.abs(change))}
        </span>
      </div>
    );
  };

  // Calculate total profit including pack adjustment
  const getTotalProfitWithPack = (record: ProfitHistoryRecord) => {
    return (record.total_profit || 0) + record.pack_adjustment_applied;
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
      {/* Print Header - Only visible when printing */}
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

      {/* Summary Cards - Screen version */}
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

      {/* Detailed Changes Table */}
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock #</TableHead>
                  <TableHead>Change Date</TableHead>
                  <TableHead>Change Type</TableHead>
                  <TableHead className="text-right">Gross Profit</TableHead>
                  <TableHead className="text-right">F&I Profit</TableHead>
                  <TableHead className="text-right">Total Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.changesDetected.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No profit changes found in the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.changesDetected.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Badge variant="outline">{record.stock_number || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(record.snapshot_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.change_type === 'update' ? 'secondary' : 'default'}>
                          {record.change_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(record.gross_profit || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(record.fi_profit || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(getTotalProfitWithPack(record))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Print Footer with Summary */}
          <div className="print:block hidden mt-8 pt-4 border-t-2 border-gray-300">
            <div className="text-center">
              <h3 className="text-lg font-bold mb-2">Report Summary</h3>
              <p className="text-sm">
                This report shows {summary.totalDealsWithChanges} deals with profit changes, 
                totaling {formatCurrency(summary.totalProfitChange)} in total profit variance (including pack adjustments).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitChangesReport;
