
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

interface DataCompletenessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: any | null;
}

const requiredFields = [
  { key: "vin", label: "VIN" },
  { key: "stock_number", label: "Stock #" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "year", label: "Year" },
  { key: "price", label: "Price" },
  { key: "exterior_color", label: "Exterior Color" },
  { key: "mileage", label: "Mileage" },
  { key: "status", label: "Status" },
  // add more fields if needed
];

export default function DataCompletenessModal({
  open,
  onOpenChange,
  vehicle,
}: DataCompletenessModalProps) {
  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Data Completeness: {vehicle.make} {vehicle.model} ({vehicle.year})</DialogTitle>
        </DialogHeader>
        <div className="mb-2">
          <span
            className={`font-semibold px-2 py-1 rounded text-xs ${
              vehicle.data_completeness >= 80
                ? "bg-green-100 text-green-700"
                : vehicle.data_completeness >= 60
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-700"
            }`}
          >
            Score: {vehicle.data_completeness}%
          </span>
        </div>
        <div className="space-y-2">
          {requiredFields.map((field) => {
            const value = vehicle[field.key];
            const isMissing = value === null || value === undefined || value === "" || (typeof value === "number" && isNaN(value));
            return (
              <div key={field.key} className="flex items-center space-x-3">
                {isMissing ? (
                  <XCircle className="text-red-500 w-4 h-4" />
                ) : (
                  <CheckCircle className="text-green-500 w-4 h-4" />
                )}
                <span className={isMissing ? "text-red-700 font-semibold" : "text-green-900"}>
                  {field.label}
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  {isMissing ? (
                    <Badge variant="destructive">Missing</Badge>
                  ) : (
                    <Badge variant="outline">{typeof value === "number" ? value : String(value)}</Badge>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
