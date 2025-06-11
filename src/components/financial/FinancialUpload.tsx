
import AccessDenied from "./upload/AccessDenied";
import UploadArea from "./upload/UploadArea";
import UploadInfoCard from "./upload/UploadInfoCard";
import UploadResultComponent from "./upload/UploadResult";
import { useFinancialUpload } from "@/hooks/useFinancialUpload";

interface FinancialUploadProps {
  user: {
    id: string;
    role: string;
  };
}

const FinancialUpload = ({ user }: FinancialUploadProps) => {
  const { uploading, uploadResult, handleFileUpload } = useFinancialUpload(user.id);

  // Check permissions
  if (!["manager", "admin"].includes(user.role)) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Upload Financial Data</h2>
        <p className="text-slate-600 mt-1">
          Import daily DMS Sales Analysis Detail reports to track profit and performance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UploadArea onFileUpload={handleFileUpload} uploading={uploading} />
        <UploadInfoCard />
      </div>

      {uploadResult && (
        <UploadResultComponent uploadResult={uploadResult} />
      )}
    </div>
  );
};

export default FinancialUpload;
