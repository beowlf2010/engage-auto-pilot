
import { CheckCircle, AlertTriangle } from "lucide-react";

interface UploadResultProps {
  result: {
    totalRows: number;
    successfulImports: number;
    errors: number;
    duplicates: number;
    phoneNumberStats?: {
      multipleNumbers: number;
    };
    duplicateDetails?: Array<{
      rowIndex: number;
      duplicateType: string;
      leadName: string;
      conflictingName: string;
    }>;
  };
}

const UploadResult = ({ result }: UploadResultProps) => {
  const hasDuplicates = result.duplicates > 0;
  
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
            hasDuplicates ? 'text-yellow-800' : 'text-green-800'
          }`}>
            {hasDuplicates ? 'Upload completed with duplicates detected!' : 'Upload completed successfully!'}
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
              <span className={hasDuplicates ? 'text-yellow-700' : 'text-green-700'}>Duplicates:</span>
              <span className="font-medium ml-2">{result.duplicates}</span>
            </div>
          </div>
          
          {hasDuplicates && result.duplicateDetails && (
            <div className="mb-3">
              <h5 className="font-medium text-yellow-800 mb-2">Duplicate Details:</h5>
              <div className="text-xs text-yellow-700 space-y-1 max-h-24 overflow-y-auto">
                {result.duplicateDetails.slice(0, 5).map((duplicate, index) => (
                  <p key={index}>
                    Row {duplicate.rowIndex}: {duplicate.leadName} ({duplicate.duplicateType} matches {duplicate.conflictingName})
                  </p>
                ))}
                {result.duplicateDetails.length > 5 && (
                  <p className="italic">+ {result.duplicateDetails.length - 5} more duplicates...</p>
                )}
              </div>
            </div>
          )}

          <div className={`text-xs ${hasDuplicates ? 'text-yellow-700' : 'text-green-700'}`}>
            <p>✓ Phone priority: Cell → Day → Evening</p>
            <p>✓ Contact preferences applied</p>
            <p>✓ Real-time duplicate detection by phone, email, and name</p>
            {hasDuplicates && <p>⚠ Duplicates were automatically skipped</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadResult;
