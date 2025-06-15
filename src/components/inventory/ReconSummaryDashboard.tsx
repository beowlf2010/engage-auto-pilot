import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import FiltersPanel from "./ReconSummaryFiltersPanel";
import ReconItemsTable from "./ReconItemsTable";

// Use the correct Lucide icon import
import { Search } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>Recon Summary</span>
          {/* Use a valid icon, e.g. Search, or remove if you don't want an icon */}
          <Search className="w-6 h-6 text-blue-600" />
        </h1>
        <Link to="/inventory-dashboard">
          <Button variant="secondary">Back to Inventory</Button>
        </Link>
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
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex items-center gap-2">
          <CardTitle>Recon Items ({filteredLines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ReconItemsTable
            lines={filteredLines}
            isLoading={isLoading}
            getAssignedUserName={getAssignedUserName}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ReconSummaryDashboard;

// --- The file is getting long. Please consider refactoring into smaller components for maintainability!
