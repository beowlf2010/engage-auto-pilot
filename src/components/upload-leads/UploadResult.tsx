
import { CheckCircle } from "lucide-react";

interface UploadResultProps {
  result: {
    totalRows: number;
    successfulImports: number;
    errors: number;
    phoneNumberStats?: {
      multipleNumbers: number;
    };
  };
}

const UploadResult = ({ result }: UploadResultProps) => {
  return (
    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-start space-x-3">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-green-800 mb-2">
            Upload completed successfully!
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <span className="text-green-700">Total rows:</span>
              <span className="font-medium ml-2">{result.totalRows}</span>
            </div>
            <div>
              <span className="text-green-700">Imported:</span>
              <span className="font-medium ml-2">{result.successfulImports}</span>
            </div>
            <div>
              <span className="text-green-700">Errors:</span>
              <span className="font-medium ml-2">{result.errors}</span>
            </div>
            <div>
              <span className="text-green-700">Multiple phones:</span>
              <span className="font-medium ml-2">{result.phoneNumberStats?.multipleNumbers || 0}</span>
            </div>
          </div>
          <div className="text-xs text-green-700">
            <p>✓ Phone priority: Cell → Day → Evening</p>
            <p>✓ Contact preferences applied</p>
            <p>✓ Duplicate phone numbers removed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadResult;
