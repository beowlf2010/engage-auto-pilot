
import { CheckCircle, AlertTriangle } from "lucide-react";

interface UploadResultProps {
  result: {
    totalRows: number;
    successfulImports: number;
    errors: number;
    duplicates: number;
    duplicateVehicles?: number;
    phoneNumberStats?: {
      multipleNumbers: number;
    };
    duplicateDetails?: Array<{
      rowIndex: number;
      duplicateType: string;
      leadName: string;
      conflictingName: string;
      vehicleInfo?: string;
      reason?: string;
    }>;
  };
}

const UploadResult = ({ result }: UploadResultProps) => {
  const hasDuplicates = result.duplicates > 0 || (result.duplicateVehicles || 0) > 0;
  const totalDuplicates = result.duplicates + (result.duplicateVehicles || 0);
  const isInventoryUpload = result.duplicateVehicles !== undefined;
  
  return (
    <div className={`mt-6 p-4 border rounded-lg ${
      hasDuplicates ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
    }`}>
      <div className="flex items-start space-x-3">
        {hasDuplicates ? (
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
        )}
        <div className="flex-1">
          <h4 className={`font-medium mb-2 ${
            hasDuplicates && result.errors > 0 ? 'text-yellow-800' : hasDuplicates ? 'text-blue-800' : 'text-green-800'
          }`}>
            {hasDuplicates && result.errors > 0 
              ? 'Upload completed with some duplicates and errors' 
              : hasDuplicates && result.successfulImports === 0
              ? isInventoryUpload 
                ? 'Inventory synchronization complete - all vehicles already in system' 
                : 'All records already exist in system'
              : hasDuplicates 
              ? isInventoryUpload 
                ? 'Inventory upload successful with duplicates skipped'
                : 'Upload successful with duplicates skipped'
              : 'Upload completed successfully!'
            }
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <span className={hasDuplicates ? 'text-yellow-700' : 'text-green-700'}>Total rows:</span>
              <span className="font-medium ml-2">{result.totalRows}</span>
            </div>
            <div>
              <span className={hasDuplicates ? 'text-yellow-700' : 'text-green-700'}>Imported:</span>
              <span className="font-medium ml-2">{result.successfulImports}</span>
            </div>
            <div>
              <span className={hasDuplicates ? 'text-yellow-700' : 'text-green-700'}>Errors:</span>
              <span className="font-medium ml-2">{result.errors}</span>
            </div>
            <div>
              <span className={hasDuplicates && result.errors > 0 ? 'text-yellow-700' : hasDuplicates ? 'text-blue-700' : 'text-green-700'}>
                {isInventoryUpload ? 'Duplicates Skipped:' : 'Duplicates:'}
              </span>
              <span className="font-medium ml-2">{totalDuplicates}</span>
            </div>
          </div>
          
          {hasDuplicates && result.duplicateDetails && (
            <div className="mb-3">
              <h5 className={`font-medium mb-2 ${
                hasDuplicates && result.errors > 0 ? 'text-yellow-800' : hasDuplicates ? 'text-blue-800' : 'text-green-800'
              }`}>
                {isInventoryUpload ? 'Vehicles Already in System:' : 'Duplicate Details:'}
              </h5>
              <div className={`text-xs space-y-1 max-h-24 overflow-y-auto ${
                hasDuplicates && result.errors > 0 ? 'text-yellow-700' : hasDuplicates ? 'text-blue-700' : 'text-green-700'
              }`}>
                {result.duplicateDetails.slice(0, 5).map((duplicate, index) => (
                  <p key={index}>
                    Row {duplicate.rowIndex}: {duplicate.vehicleInfo || duplicate.leadName} 
                    {duplicate.reason ? ` (${duplicate.reason})` : duplicate.duplicateType ? ` (${duplicate.duplicateType} matches ${duplicate.conflictingName})` : ''}
                  </p>
                ))}
                {result.duplicateDetails.length > 5 && (
                  <p className="italic">+ {result.duplicateDetails.length - 5} more duplicates...</p>
                )}
              </div>
            </div>
          )}

          <div className={`text-xs ${
            hasDuplicates && result.errors > 0 ? 'text-yellow-700' : hasDuplicates ? 'text-blue-700' : 'text-green-700'
          }`}>
            {isInventoryUpload ? (
              <>
                <p>✓ Vehicle identification by VIN and Stock Number</p>
                <p>✓ Comprehensive inventory validation applied</p>
                <p>✓ Real-time duplicate detection by VIN and Stock Number</p>
                {hasDuplicates && <p>✓ Duplicates were automatically skipped (inventory up to date)</p>}
              </>
            ) : (
              <>
                <p>✓ Phone priority: Cell → Day → Evening</p>
                <p>✓ Contact preferences applied</p>
                <p>✓ Real-time duplicate detection by phone, email, and name</p>
                {hasDuplicates && <p>⚠ Duplicates were automatically skipped</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadResult;
