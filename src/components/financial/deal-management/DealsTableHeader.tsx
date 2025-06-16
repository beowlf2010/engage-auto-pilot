
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface DealsTableHeaderProps {
  selectedDeals: string[];
  totalDeals: number;
  unlockedDeals: number;
  onSelectAll: () => void;
}

const DealsTableHeader = ({
  selectedDeals,
  totalDeals,
  unlockedDeals,
  onSelectAll
}: DealsTableHeaderProps) => {
  return (
    <TableHeader>
      <TableRow className="bg-slate-50">
        <TableHead className="w-12">
          <Checkbox
            checked={selectedDeals.length === unlockedDeals && totalDeals > 0}
            onCheckedChange={onSelectAll}
          />
        </TableHead>
        <TableHead className="font-semibold">Vehicle</TableHead>
        <TableHead className="font-semibold">Stock #</TableHead>
        <TableHead className="font-semibold">Customer</TableHead>
        <TableHead className="font-semibold">Deal Type</TableHead>
        <TableHead className="font-semibold">Salesperson Code</TableHead>
        <TableHead className="font-semibold text-right">Gross Profit</TableHead>
        <TableHead className="font-semibold text-right">Pack Adjustment</TableHead>
        <TableHead className="font-semibold text-right">F&I Profit</TableHead>
        <TableHead className="font-semibold text-right">Total Profit</TableHead>
        <TableHead className="font-semibold">Date</TableHead>
        <TableHead className="font-semibold">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default DealsTableHeader;
