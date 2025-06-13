
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle } from "lucide-react";
import { performInventoryCleanup } from "@/services/inventory/core/inventoryCleanupService";

const InventoryCleanupButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      await performInventoryCleanup();
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
              This will identify the latest upload for each inventory type (GM Global, New, Used) 
              and mark older vehicles as "sold" to fix the inventory count.
            </p>
            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>What this does:</strong>
              </p>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Keeps only vehicles from the most recent upload of each type</li>
                <li>• Marks older duplicate vehicles as "sold"</li>
                <li>• Preserves all data - no vehicles are deleted</li>
                <li>• Updates the dashboard counts to show accurate numbers</li>
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
  );
};

export default InventoryCleanupButton;
