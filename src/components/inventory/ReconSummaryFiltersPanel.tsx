
import React from "react";

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
);

export default FiltersPanel;
