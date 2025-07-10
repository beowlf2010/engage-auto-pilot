
import { useState } from "react";
import { type SheetInfo } from "@/utils/enhancedFileParsingUtils";

export interface UploadResult {
  total: number;
  success: number;
  errors: number;
  errorDetails: string[];
  fileType: string;
  fileName: string;
  condition: string;
  formatType?: string;
  uploadId?: string;
  status: string;
}

export const useUploadState = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<'new' | 'used' | 'gm_global'>('used');
  const [showHistory, setShowHistory] = useState(false);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [sheetsInfo, setSheetsInfo] = useState<SheetInfo[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  // Field mapping state
  const [showFieldMapper, setShowFieldMapper] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<Record<string, string>>({});
  const [selectedSheet, setSelectedSheet] = useState<string | undefined>(undefined);

  const resetUploadState = () => {
    setUploading(false);
    setUploadResult(null);
    setSelectedCondition('used');
    setShowHistory(false);
    setShowSheetSelector(false);
    setSheetsInfo([]);
    setPendingFile(null);
    setShowFieldMapper(false);
    setCsvHeaders([]);
    setSampleData({});
    setSelectedSheet(undefined);
  };

  return {
    uploading,
    setUploading,
    uploadResult,
    setUploadResult,
    selectedCondition,
    setSelectedCondition,
    showHistory,
    setShowHistory,
    showSheetSelector,
    setShowSheetSelector,
    sheetsInfo,
    setSheetsInfo,
    pendingFile,
    setPendingFile,
    // Field mapping state
    showFieldMapper,
    setShowFieldMapper,
    csvHeaders,
    setCsvHeaders,
    sampleData,
    setSampleData,
    selectedSheet,
    setSelectedSheet,
    // Reset function
    resetUploadState
  };
};
