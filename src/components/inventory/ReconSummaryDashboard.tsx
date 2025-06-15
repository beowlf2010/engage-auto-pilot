
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import FiltersPanel from "./ReconSummaryFiltersPanel";
import ReconItemsTable from "./ReconItemsTable";
import { Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ReconLine {
  id: string;
  description: string;
  status: string;
  assigned_to: string | null;
  inventory_id: string;
  cost?: number | null;
  due_date?: string | null;
  inventory?: any; // Enriched
  approvals?: any[]; // Enriched
}

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "completed", label: "Completed" }
];

const ReconSummaryDashboard = () => {
  const [statusFilter, setStatusFilter] = useState("");
  const [assignedUserFilter, setAssignedUserFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  // New: due date range state
  const [dueDateFrom, setDueDateFrom] = useState<string>("");
  const [dueDateTo, setDueDateTo] = useState<string>("");
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ sortBy: string; direction: "asc" | "desc" } | null>(null);

  const { data: lines, isLoading } = useQuery({
    queryKey: ["recon_summary_lines"],
    queryFn: async () => {
      // Get all recon lines + inventory join + approval join
      const { data: linesRaw, error } = await supabase
        .from("recon_service_lines")
        .select(`
          *,
          inventory:inventory_id (
            id, make, model, year, vin, stock_number
          ),
          approvals:recon_approvals (
            id, approval_status, user_id, notes
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return linesRaw || [];
    }
  });

  // Fetch all users (for filtering by assigned)
  const { data: users } = useQuery({
    queryKey: ["profiles-for-recon-dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name");
      return data || [];
    }
  });

  // Helper: Enrich line with assigned user name
  const getAssignedUserName = (userId: string | null) => {
    if (!userId) return "";
    const user = users?.find(u => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : userId;
  };

  // Clear all filters helper
  const handleClearFilters = () => {
    setStatusFilter("");
    setAssignedUserFilter("");
    setVehicleFilter("");
    setSearchTerm("");
    setDueDateFrom("");
    setDueDateTo("");
  };

  // Filtering logic
  const filteredLines = (lines || []).filter((line: any) => {
    let pass = true;
    if (statusFilter && line.status !== statusFilter) pass = false;
    if (assignedUserFilter && line.assigned_to !== assignedUserFilter) pass = false;
    if (
      vehicleFilter &&
      line.inventory &&
      ![line.inventory.vin, line.inventory.stock_number, line.inventory.make, line.inventory.model]
        .some(val =>
          val &&
          val.toLowerCase().includes(vehicleFilter.toLowerCase())
        )
    ) {
      pass = false;
    }
    // Date range filter on due_date
    if (dueDateFrom) {
      if (!line.due_date || new Date(line.due_date) < new Date(dueDateFrom)) {
        pass = false;
      }
    }
    if (dueDateTo) {
      if (!line.due_date || new Date(line.due_date) > new Date(dueDateTo)) {
        pass = false;
      }
    }
    if (
      searchTerm &&
      !(
        line.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (line.inventory && (
          [line.inventory.vin, line.inventory.stock_number, line.inventory.make, line.inventory.model]
            .some(val =>
              val &&
              val.toLowerCase().includes(searchTerm.toLowerCase())
            )
        ))
      )
    ) {
      pass = false;
    }
    return pass;
  });

  // Sorting logic
  const sortedLines = React.useMemo(() => {
    if (!sortConfig) return filteredLines;
    const { sortBy, direction } = sortConfig;
    return [...filteredLines].sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortBy) {
        case "status": aValue = a.status; bValue = b.status; break;
        case "assigned_to": aValue = getAssignedUserName(a.assigned_to); bValue = getAssignedUserName(b.assigned_to); break;
        case "cost": aValue = a.cost ?? 0; bValue = b.cost ?? 0; break;
        case "due_date": aValue = a.due_date ? new Date(a.due_date).getTime() : 0; bValue = b.due_date ? new Date(b.due_date).getTime() : 0; break;
        default: aValue = ""; bValue = "";
      }
      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredLines, sortConfig]);

  const handleSort = (sortBy: string) => {
    setSortConfig(prev => {
      if (prev && prev.sortBy === sortBy) {
        // toggle direction
        return { sortBy, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { sortBy, direction: "asc" };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>Recon Summary</span>
            </TooltipTrigger>
            <TooltipContent>This page summarizes all recon service lines and their statuses.</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Search className="w-6 h-6 text-blue-600" />
            </TooltipTrigger>
            <TooltipContent>Search or filter recon lines below.</TooltipContent>
          </Tooltip>
        </h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/inventory-dashboard">
              <Button variant="secondary">Back to Inventory</Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>Go back to the main inventory dashboard.</TooltipContent>
        </Tooltip>
      </div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <FiltersPanel
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            assignedUserFilter={assignedUserFilter}
            setAssignedUserFilter={setAssignedUserFilter}
            vehicleFilter={vehicleFilter}
            setVehicleFilter={setVehicleFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            users={users}
            statusOptions={statusOptions}
            onClearFilters={handleClearFilters}
            // New
            dueDateFrom={dueDateFrom}
            dueDateTo={dueDateTo}
            setDueDateFrom={setDueDateFrom}
            setDueDateTo={setDueDateTo}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex items-center gap-2">
          <CardTitle>Recon Items ({sortedLines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ReconItemsTable
            lines={sortedLines}
            isLoading={isLoading}
            getAssignedUserName={getAssignedUserName}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ReconSummaryDashboard;

// --- This file is getting long. Please consider refactoring into smaller components for maintainability!
