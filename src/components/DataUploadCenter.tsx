import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Users, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UploadLeads from "./UploadLeads";

interface DataUploadCenterProps {
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

interface UploadStatus {
  leads: { count: number; lastUpload?: string };
}

const DataUploadCenter = ({ user }: DataUploadCenterProps) => {
  // Mock data - in real implementation, fetch from database
  const uploadStatus: UploadStatus = {
    leads: { count: 1250, lastUpload: "2 hours ago" }
  };


  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Lead Upload Center</h1>
        <p className="text-slate-600">
          Upload your CSV lead files with intelligent processing and field mapping
        </p>
      </div>

      {/* Current Status Overview */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Current Leads</span>
          </CardTitle>
          <FileText className="h-8 w-8 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{uploadStatus.leads.count.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground mt-1">
            Last upload: {uploadStatus.leads.lastUpload}
          </p>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5" />
        </CardContent>
      </Card>

      {/* CSV Processing Info */}
      <Alert className="border-primary/20 bg-primary/5">
        <Upload className="h-4 w-4 text-primary" />
        <AlertDescription className="text-primary/80">
          <strong>CSV Lead Processing:</strong> Automatically maps fields, detects duplicates, 
          validates data quality, and applies AI-powered lead source strategies.
        </AlertDescription>
      </Alert>

      {/* Upload Component */}
      <UploadLeads user={user} />
    </div>
  );
};

export default DataUploadCenter;