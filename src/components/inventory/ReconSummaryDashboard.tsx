
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

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
  const filteredLines = (lines || []).filter((line: ReconLine) => {
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
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Status</label>
              <select
                className="border rounded px-2 py-1"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                {statusOptions.map(opt => (
                  <option value={opt.value} key={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Assigned to</label>
              <select
                className="border rounded px-2 py-1"
                value={assignedUserFilter}
                onChange={e => setAssignedUserFilter(e.target.value)}
              >
                <option value="">All</option>
                {users?.map(u => (
                  <option value={u.id} key={u.id}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Vehicle</label>
              <input
                type="text"
                className="border rounded px-2 py-1"
                value={vehicleFilter}
                onChange={e => setVehicleFilter(e.target.value)}
                placeholder="VIN, stock number, make, model"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Keyword</label>
              <input
                type="text"
                className="border rounded px-2 py-1"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Description or vehicle"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex items-center gap-2">
          <CardTitle>Recon Items ({filteredLines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-2">Description</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Assigned To</th>
                  <th className="p-2">Cost</th>
                  <th className="p-2">Due Date</th>
                  <th className="p-2">Vehicle</th>
                  <th className="p-2">Approvals</th>
                  <th className="p-2">View</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredLines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      No recon items found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLines.map((line: ReconLine) => (
                    <tr key={line.id} className="border-b">
                      <td className="p-2">{line.description}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            line.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : line.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : line.status === "declined"
                              ? "bg-red-100 text-red-700"
                              : line.status === "completed"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {line.status}
                        </span>
                      </td>
                      <td className="p-2">
                        {getAssignedUserName(line.assigned_to)}
                      </td>
                      <td className="p-2">
                        {line.cost != null ? `$${Number(line.cost).toLocaleString()}` : ""}
                      </td>
                      <td className="p-2">
                        {line.due_date ? new Date(line.due_date).toLocaleDateString() : ""}
                      </td>
                      <td className="p-2">
                        {line.inventory
                          ? (
                              <>
                                <div className="font-medium">
                                  {line.inventory.year} {line.inventory.make} {line.inventory.model}
                                </div>
                                <div className="text-xs text-gray-500">
                                  VIN: {line.inventory.vin} <br />
                                  Stock: {line.inventory.stock_number}
                                </div>
                              </>
                            )
                          : ""}
                      </td>
                      <td className="p-2">
                        {line.approvals && line.approvals.length > 0
                          ? line.approvals.map((app: any) => (
                              <span
                                key={app.id}
                                className={`block px-2 rounded text-xs my-0.5 ${
                                  app.approval_status === "approved"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {app.approval_status}
                                {app.notes && (
                                  <span className="ml-1 italic text-gray-500">
                                    ({app.notes})
                                  </span>
                                )}
                              </span>
                            ))
                          : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="p-2">
                        {line.inventory && (
                          <Link
                            to={`/vehicle-detail/${line.inventory.id}`}
                            className="text-blue-700 underline hover:text-blue-900"
                          >
                            View Vehicle
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReconSummaryDashboard;

// --- The file is getting long. Please consider refactoring into smaller components for maintainability!
