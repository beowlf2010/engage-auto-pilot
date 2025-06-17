
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { performInventoryCleanup } from "@/services/inventory/core/inventoryCleanupService";
import { resetIncorrectlySoldVehicles } from "@/services/inventory/vehicleStatusCleanup";

const InventoryCleanupButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showStatusReset, setShowStatusReset] = useState(false);

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      await performInventoryCleanup();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusReset = async () => {
    setIsLoading(true);
    try {
      await resetIncorrectlySoldVehicles();
    } finally {
      setIsLoading(false);
      setShowStatusReset(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2 text-orange-600 border-orange-200 hover:bg-orange-50">
            <Trash2 className="w-4 h-4" />
            <span>Clean Up Inventory</span>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Fix Count
            </Badge>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span>Clean Up Inventory Data</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will identify the most recent upload batches and mark older vehicles as "sold" 
                to fix the inventory count and remove duplicates.
              </p>
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>What this does:</strong>
                </p>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  <li>• Identifies the 3 most recent upload batches</li>
                  <li>• Keeps only vehicles from these recent uploads</li>
                  <li>• Handles GM Global orders separately</li>
                  <li>• Marks older duplicate vehicles as "sold"</li>
                  <li>• Preserves all data - no vehicles are deleted</li>
                  <li>• Updates dashboard counts to show accurate numbers</li>
                </ul>
              </div>
              <p className="text-sm text-slate-600">
                This action is safe and can be undone by manually updating vehicle statuses if needed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanup} disabled={isLoading}>
              {isLoading ? "Processing..." : "Clean Up Inventory"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showStatusReset} onOpenChange={setShowStatusReset}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2 text-blue-600 border-blue-200 hover:bg-blue-50">
            <RefreshCw className="w-4 h-4" />
            <span>Reset Sold Status</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <span>Reset Incorrectly Sold Vehicles</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will find vehicles marked as "sold" that don't have corresponding financial deals 
                and reset them back to "available" status.
              </p>
              <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>What this does:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• Finds vehicles marked as sold without deals</li>
                  <li>• Resets them to available status</li>
                  <li>• Ensures only vehicles with financial data are marked as sold</li>
                  <li>• Corrects inflated vehicle counts</li>
                </ul>
              </div>
              <p className="text-sm text-slate-600">
                This helps fix the vehicle counting issue where vehicles were incorrectly marked as sold.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusReset} disabled={isLoading}>
              {isLoading ? "Processing..." : "Reset Vehicle Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InventoryCleanupButton;
