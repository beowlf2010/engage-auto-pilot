
import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

interface FilterPanelProps {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  assignedUserFilter: string;
  setAssignedUserFilter: (v: string) => void;
  vehicleFilter: string;
  setVehicleFilter: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  users: User[] | undefined;
  statusOptions: Array<{ value: string; label: string }>;
}

const statusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-400";
    case "approved":
      return "bg-green-500";
    case "declined":
      return "bg-red-500";
    case "completed":
      return "bg-blue-500";
    default:
      return "bg-gray-300";
  }
};

const FiltersPanel: React.FC<FilterPanelProps> = ({
  statusFilter,
  setStatusFilter,
  assignedUserFilter,
  setAssignedUserFilter,
  vehicleFilter,
  setVehicleFilter,
  searchTerm,
  setSearchTerm,
  users,
  statusOptions,
}) => (
  <div className="flex gap-4 flex-wrap">
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="block text-xs text-slate-500 mb-1">Status</label>
        </TooltipTrigger>
        <TooltipContent>Filter by the current status of the recon line.</TooltipContent>
      </Tooltip>
      <select
        className="border rounded px-2 py-1 min-w-[120px]"
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value)}
      >
        <option value="">All</option>
        {statusOptions.map(opt => (
          <option value={opt.value} key={opt.value}>
            {/* 
              HTML option element cannot render JSX directly. 
              So prepend a color dot using unicode colored circles, 
              or set the color via emoji for a simple, cross-browser effect.
            */}
            {opt.value === "pending" && "🟡 "}
            {opt.value === "approved" && "🟢 "}
            {opt.value === "declined" && "🔴 "}
            {opt.value === "completed" && "🔵 "}
            {opt.label}
          </option>
        ))}
      </select>
    </div>
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="block text-xs text-slate-500 mb-1">Assigned to</label>
        </TooltipTrigger>
        <TooltipContent>Show only recon lines assigned to a specific user.</TooltipContent>
      </Tooltip>
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
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="block text-xs text-slate-500 mb-1">Vehicle</label>
        </TooltipTrigger>
        <TooltipContent>Search by VIN, stock number, make, or model.</TooltipContent>
      </Tooltip>
      <input
        type="text"
        className="border rounded px-2 py-1"
        value={vehicleFilter}
        onChange={e => setVehicleFilter(e.target.value)}
        placeholder="VIN, stock number, make, model"
      />
    </div>
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="block text-xs text-slate-500 mb-1">Keyword</label>
        </TooltipTrigger>
        <TooltipContent>Search for keywords in the description or vehicle info.</TooltipContent>
      </Tooltip>
      <input
        type="text"
        className="border rounded px-2 py-1"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Description or vehicle"
      />
    </div>
  </div>
);

export default FiltersPanel;

