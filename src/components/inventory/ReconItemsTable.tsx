import React from "react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ReconLine {
  id: string;
  description: string;
  status: string;
  assigned_to: string | null;
  inventory_id: string;
  cost?: number | null;
  due_date?: string | null;
  inventory?: any;
  approvals?: any[];
}

interface Props {
  lines: ReconLine[];
  isLoading: boolean;
  getAssignedUserName: (userId: string | null) => string;
}

const ReconItemsTable: React.FC<Props> = ({ lines, isLoading, getAssignedUserName }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm text-left">
      <thead>
        <tr className="bg-slate-100">
          <th className="p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>Description</span>
              </TooltipTrigger>
              <TooltipContent>Recon work or service to be performed.</TooltipContent>
            </Tooltip>
          </th>
          <th className="p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>Status</span>
              </TooltipTrigger>
              <TooltipContent>Current status of this recon line.</TooltipContent>
            </Tooltip>
          </th>
          <th className="p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>Assigned To</span>
              </TooltipTrigger>
              <TooltipContent>Who is responsible for this task.</TooltipContent>
            </Tooltip>
          </th>
          <th className="p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>Cost</span>
              </TooltipTrigger>
              <TooltipContent>Estimated or actual cost for this service line.</TooltipContent>
            </Tooltip>
          </th>
          <th className="p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>Due Date</span>
              </TooltipTrigger>
              <TooltipContent>Deadline for completing this item.</TooltipContent>
            </Tooltip>
          </th>
          <th className="p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>Vehicle</span>
              </TooltipTrigger>
              <TooltipContent>Vehicle details relevant to this recon line.</TooltipContent>
            </Tooltip>
          </th>
          <th className="p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>Approvals</span>
              </TooltipTrigger>
              <TooltipContent>Approval status and comments from team members.</TooltipContent>
            </Tooltip>
          </th>
          <th className="p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>View</span>
              </TooltipTrigger>
              <TooltipContent>Open vehicle detail page.</TooltipContent>
            </Tooltip>
          </th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <tr>
            <td colSpan={8} className="py-8 text-center text-gray-500">
              Loading...
            </td>
          </tr>
        ) : lines.length === 0 ? (
          <tr>
            <td colSpan={8} className="py-8 text-center text-gray-500">
              No recon items found matching your criteria.
            </td>
          </tr>
        ) : (
          lines.map((line: ReconLine) => (
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={`/vehicle-detail/${line.inventory.id}`}
                        className="text-blue-700 underline hover:text-blue-900"
                        tabIndex={0}
                        aria-label="View Vehicle Details"
                        target="_blank" rel="noopener noreferrer"
                      >
                        View Vehicle
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Go to detailed info for this vehicle.</TooltipContent>
                  </Tooltip>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default ReconItemsTable;
