
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, RefreshCw, Archive, BarChart3, Wrench } from "lucide-react";
import { performInventoryCleanup } from "@/services/inventory/core/inventoryCleanupService";
import { resetIncorrectlySoldVehicles } from "@/services/inventory/vehicleStatusCleanup";
import { archiveOldSoldVehicles, cleanupInflatedCounts } from "@/services/inventory/core/inventoryArchiveService";
import { restoreUsedInventoryFromRecentUploads } from "@/services/inventory/usedInventoryRestoration";

const InventoryCleanupButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showStatusReset, setShowStatusReset] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showCountAnalysis, setShowCountAnalysis] = useState(false);
  const [showUsedRestore, setShowUsedRestore] = useState(false);

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

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      await archiveOldSoldVehicles();
    } finally {
      setIsLoading(false);
      setShowArchive(false);
    }
  };

  const handleCountAnalysis = async () => {
    setIsLoading(true);
    try {
      await cleanupInflatedCounts();
    } finally {
      setIsLoading(false);
      setShowCountAnalysis(false);
    }
  };

  const handleUsedRestore = async () => {
    setIsLoading(true);
    try {
      await restoreUsedInventoryFromRecentUploads();
    } finally {
      setIsLoading(false);
      setShowUsedRestore(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 flex-wrap gap-2">
      {/* NEW: Used Inventory Restore */}
      <AlertDialog open={showUsedRestore} onOpenChange={setShowUsedRestore}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2 text-blue-600 border-blue-200 hover:bg-blue-50">
            <Wrench className="w-4 h-4" />
            <span>Restore Used</span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              FIX
            </Badge>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              <span>Restore Used Inventory</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will restore used vehicles from recent Tommy Merch-Inv View uploads that were 
                incorrectly marked as "sold" by the cleanup process.
              </p>
              <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>What this does:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• Finds recent Tommy Merch-Inv View uploads (last 3 days)</li>
                  <li>• Identifies used vehicles marked as "sold" from these uploads</li>
                  <li>• Restores them to "available" status</li>
                  <li>• Fixes the immediate used inventory count issue</li>
                </ul>
              </div>
              <p className="text-sm text-slate-600">
                This is specifically designed to fix the current used inventory issue.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUsedRestore} disabled={isLoading}>
              {isLoading ? "Restoring..." : "Restore Used Inventory"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Original cleanup */}
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

      {/* Status reset */}
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

      {/* Count Analysis */}
      <AlertDialog open={showCountAnalysis} onOpenChange={setShowCountAnalysis}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2 text-green-600 border-green-200 hover:bg-green-50">
            <BarChart3 className="w-4 h-4" />
            <span>Analyze Counts</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              NEW
            </Badge>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <span>Analyze Vehicle Counts</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will analyze your current vehicle counts and show you the breakdown 
                between active inventory and sold vehicles.
              </p>
              <div className="bg-green-50 p-3 rounded-md border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>What this shows:</strong>
                </p>
                <ul className="text-sm text-green-700 mt-1 space-y-1">
                  <li>• Available vehicles for sale</li>
                  <li>• GM Global orders in progress</li>
                  <li>• Sold vehicles (excluded from active count)</li>
                  <li>• True active inventory total</li>
                </ul>
              </div>
              <p className="text-sm text-slate-600">
                This helps verify that your dashboard shows accurate counts.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCountAnalysis} disabled={isLoading}>
              {isLoading ? "Analyzing..." : "Analyze Counts"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive old sold vehicles */}
      <AlertDialog open={showArchive} onOpenChange={setShowArchive}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2 text-purple-600 border-purple-200 hover:bg-purple-50">
            <Archive className="w-4 h-4" />
            <span>Archive Old</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Archive className="w-5 h-5 text-purple-600" />
              <span>Archive Old Sold Vehicles</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will archive vehicles that have been sold for more than 90 days 
                to improve dashboard performance and count accuracy.
              </p>
              <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                <p className="text-sm text-purple-800">
                  <strong>What this does:</strong>
                </p>
                <ul className="text-sm text-purple-700 mt-1 space-y-1">
                  <li>• Finds vehicles sold over 90 days ago</li>
                  <li>• Changes their status to "archived"</li>
                  <li>• Removes them from active counts</li>
                  <li>• Preserves all data for historical reference</li>
                </ul>
              </div>
              <p className="text-sm text-slate-600">
                This is safe and helps clean up inflated vehicle counts.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isLoading}>
              {isLoading ? "Archiving..." : "Archive Old Vehicles"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InventoryCleanupButton;
