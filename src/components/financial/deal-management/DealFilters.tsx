
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, Calendar, X } from "lucide-react";

interface DealFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  showProfitChanges: boolean;
  setShowProfitChanges: (show: boolean) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  dateField: string;
  setDateField: (field: string) => void;
}

const DealFilters = ({
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  showProfitChanges,
  setShowProfitChanges,
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  dateField,
  setDateField
}: DealFiltersProps) => {
  
  const clearDateFilters = () => {
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };
  return (
    <div className="space-y-4 mb-6">
      {/* First row - Search and basic filters */}
      <div className="flex flex-wrap gap-4">
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

      {/* Second row - Date filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Date filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month_to_date">Month to Date</SelectItem>
              <SelectItem value="previous_month">Previous Month</SelectItem>
              <SelectItem value="year_to_date">Year to Date</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_90_days">Last 90 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={dateField} onValueChange={setDateField}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Date field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upload_date">Upload Date</SelectItem>
              <SelectItem value="first_reported_date">Report Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {dateFilter === 'custom' && (
          <>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">From:</label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">To:</label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </>
        )}

        {dateFilter !== 'all' && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearDateFilters}
            className="flex items-center space-x-1"
          >
            <X className="w-3 h-3" />
            <span>Clear Date Filters</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default DealFilters;
