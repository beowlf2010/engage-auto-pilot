
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

interface DealFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  showProfitChanges: boolean;
  setShowProfitChanges: (show: boolean) => void;
}

const DealFilters = ({
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  showProfitChanges,
  setShowProfitChanges
}: DealFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by stock number, customer, or vehicle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="retail">Retail</SelectItem>
            <SelectItem value="dealer_trade">Dealer Trade</SelectItem>
            <SelectItem value="wholesale">Wholesale</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="profit-changes"
          checked={showProfitChanges}
          onChange={(e) => setShowProfitChanges(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="profit-changes" className="text-sm font-medium">
          Show Profit Changes Only
        </label>
      </div>
    </div>
  );
};

export default DealFilters;
