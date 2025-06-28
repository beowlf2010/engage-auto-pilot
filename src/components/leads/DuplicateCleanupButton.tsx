
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cleanupDuplicateLeads, CleanupResult } from '@/utils/leadOperations/duplicateCleanupService';

interface DuplicateCleanupButtonProps {
  onCleanupComplete?: () => void;
}

const DuplicateCleanupButton = ({ onCleanupComplete }: DuplicateCleanupButtonProps) => {
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);

  const handleCleanup = async () => {
    setCleaning(true);
    setCleanupResult(null);

    try {
      const result = await cleanupDuplicateLeads();
      setCleanupResult(result);

      if (result.success) {
        toast({
          title: "Cleanup Completed",
          description: `Removed ${result.duplicatesRemoved} duplicate leads successfully`,
        });
        
        if (onCleanupComplete) {
          onCleanupComplete();
        }
      } else {
        toast({
          title: "Cleanup Issues",
          description: `Removed ${result.duplicatesRemoved} duplicates, but ${result.errors.length} errors occurred`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast({
        title: "Cleanup Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            disabled={cleaning}
            className="border-red-500 text-red-600 hover:bg-red-50"
          >
            {cleaning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            {cleaning ? 'Cleaning...' : 'Clean Duplicates'}
          </Button>
        </AlertDialogTrigger>
        
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clean Up Duplicate Leads</AlertDialogTitle>
            <AlertDialogDescription>
              This will identify and remove duplicate leads based on:
              <br />• Phone numbers
              <br />• Email addresses  
              <br />• First and last name combinations
              <br /><br />
              <strong>The oldest lead in each duplicate group will be kept.</strong>
              <br /><br />
              This action cannot be undone. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanup} className="bg-red-600 hover:bg-red-700">
              Clean Duplicates
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cleanup Results */}
      {cleanupResult && (
        <div className="mt-3 p-3 border rounded-lg bg-gray-50">
          <div className="flex items-center space-x-2 mb-2">
            {cleanupResult.success ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-orange-600" />
            )}
            <span className="text-sm font-medium">
              Cleanup Complete
            </span>
          </div>
          
          <div className="text-xs text-gray-600 space-y-1">
            <div>• Found: {cleanupResult.duplicatesFound} duplicates</div>
            <div className="text-green-600">• Removed: {cleanupResult.duplicatesRemoved} leads</div>
            {cleanupResult.errors.length > 0 && (
              <div className="text-red-600">• Errors: {cleanupResult.errors.length}</div>
            )}
          </div>

          {cleanupResult.errors.length > 0 && (
            <div className="mt-2 pt-2 border-t text-xs">
              <div className="font-medium text-gray-700 mb-1">Errors:</div>
              <div className="text-red-600 space-y-1 max-h-20 overflow-y-auto">
                {cleanupResult.errors.slice(0, 3).map((error, index) => (
                  <div key={index}>• {error.error}</div>
                ))}
                {cleanupResult.errors.length > 3 && (
                  <div>• ... and {cleanupResult.errors.length - 3} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DuplicateCleanupButton;
