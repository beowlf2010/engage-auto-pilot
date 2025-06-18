
import { Button } from "@/components/ui/button";
import { BarChart3, Car } from "lucide-react";
import { Link } from "react-router-dom";
import InventoryCleanupButton from "./InventoryCleanupButton";

const InventoryDashboardHeader = () => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Inventory Dashboard</h1>
        <p className="text-slate-600 mt-1">AI-powered inventory management and analysis</p>
      </div>
      <div className="flex items-center space-x-3">
        <InventoryCleanupButton />
        <Link to="/rpo-insights">
          <Button variant="outline" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>RPO Insights</span>
          </Button>
        </Link>
        <Link to="/upload-inventory">
          <Button className="flex items-center space-x-2">
            <Car className="w-4 h-4" />
            <span>Upload Inventory</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default InventoryDashboardHeader;
