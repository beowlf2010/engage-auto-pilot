import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { useEnhancedMultiFileUpload } from '@/hooks/useEnhancedMultiFileUpload';
import type { EnhancedBatchUploadResult } from '@/hooks/useEnhancedMultiFileUpload';
import DragDropFileQueue, { type QueuedFile } from './DragDropFileQueue';
import DuplicateHandlingControls from './DuplicateHandlingControls';
import EnhancedBatchUploadResultComponent from './EnhancedBatchUploadResult';

interface EnhancedInventoryUploadProps {
  userId: string;
}

const EnhancedInventoryUpload = ({ userId }: EnhancedInventoryUploadProps) => {
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'replace'>('skip');
  const [uploadResult, setUploadResult] = useState<EnhancedBatchUploadResult | null>(null);

  const { processing, processBatch } = useEnhancedMultiFileUpload({ 
    userId,
    duplicateStrategy 
  });

  const handleFileProcess = async (file: QueuedFile) => {
    try {
      const result = await processBatch([file]);
      setUploadResult(result);
    } catch (error) {
      console.error('File processing error:', error);
      throw error;
    }
  };

  const handleFilesProcessed = async (files: QueuedFile[]) => {
    try {
      const result = await processBatch(files);
      setUploadResult(result);
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Enhanced Inventory Upload</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DuplicateHandlingControls
            duplicateStrategy={duplicateStrategy}
            onStrategyChange={setDuplicateStrategy}
          />

          <DragDropFileQueue
            onFilesProcessed={handleFilesProcessed}
            onFileProcess={handleFileProcess}
            processing={processing}
          />
        </CardContent>
      </Card>

      {uploadResult && (
        <EnhancedBatchUploadResultComponent result={uploadResult} />
      )}
    </div>
  );
};

export default EnhancedInventoryUpload;