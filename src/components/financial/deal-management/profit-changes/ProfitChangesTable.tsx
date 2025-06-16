
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "../DealManagementUtils";
import { ProfitChangesSummary, ProfitHistoryRecord } from "@/services/financial/profitHistoryService";

interface ProfitChangesTableProps {
  summary: ProfitChangesSummary;
}

const ProfitChangesTable = ({ summary }: ProfitChangesTableProps) => {
  // Calculate total profit including pack adjustment
  const getTotalProfitWithPack = (record: ProfitHistoryRecord) => {
    return (record.total_profit || 0) + record.pack_adjustment_applied;
  };

  return (
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
    </div>
  );
};

export default ProfitChangesTable;
