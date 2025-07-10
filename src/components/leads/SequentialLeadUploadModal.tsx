import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, ArrowRight, Check, X, RotateCcw, GripVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { parseEnhancedInventoryFile, type ParsedInventoryData } from '@/utils/enhancedFileParsingUtils';
import CSVFieldMapper from '@/components/CSVFieldMapper';
import { type FieldMapping } from '@/components/csv-mapper/types';
import { uploadLeadsWithRLSBypass, promoteToAdmin } from '@/utils/leadOperations/rlsBypassUploader';
import { processLeads } from '../upload-leads/processLeads';
import { performAutoDetection } from '../csv-mapper/fieldMappingUtils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FileQueueItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'mapping' | 'completed' | 'error';
  csvData?: ParsedInventoryData;
  mapping?: FieldMapping;
  result?: any;
  error?: string;
}

interface SequentialLeadUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SortableFileItem = ({ item, isActive }: { item: FileQueueItem; isActive: boolean }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusIcon = () => {
    switch (item.status) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'error':
        return <X className="w-4 h-4 text-red-600" />;
      case 'processing':
      case 'mapping':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-3 p-3 rounded-lg border ${
        isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      } ${item.status === 'error' ? 'bg-red-50' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      {getStatusIcon()}
      <span className="flex-1 text-sm font-medium">{item.file.name}</span>
      <span className="text-xs text-gray-500 capitalize">{item.status}</span>
    </div>
  );
};

const SequentialLeadUploadModal = ({ isOpen, onClose, onSuccess }: SequentialLeadUploadModalProps) => {
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(-1);
  const [stage, setStage] = useState<'selection' | 'processing' | 'complete'>('selection');
  const [selectedCondition, setSelectedCondition] = useState<'new' | 'used' | 'gm_global'>('used');
  const [updateExistingLeads, setUpdateExistingLeads] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFilesSelected = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const supportedFiles = fileArray.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls');
    });
    
    if (supportedFiles.length === 0) {
      toast({
        title: "No supported files found",
        description: "Please select CSV or Excel files to upload.",
        variant: "destructive",
      });
      return;
    }

    const newQueue: FileQueueItem[] = supportedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending'
    }));

    setFileQueue(newQueue);
    toast({
      title: "Files added to queue",
      description: `${supportedFiles.length} file(s) ready for processing.`,
    });
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesSelected(files);
    }
  }, [handleFilesSelected]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setFileQueue((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const processNextFile = async () => {
    const nextIndex = fileQueue.findIndex(item => item.status === 'pending');
    if (nextIndex === -1) {
      setStage('complete');
      return;
    }

    setCurrentFileIndex(nextIndex);
    const currentFile = fileQueue[nextIndex];

    // Update status to processing
    setFileQueue(prev => prev.map((item, idx) => 
      idx === nextIndex ? { ...item, status: 'processing' } : item
    ));

    try {
      const csvData = await parseEnhancedInventoryFile(currentFile.file);
      
      // Update with parsed data and move to mapping stage
      setFileQueue(prev => prev.map((item, idx) => 
        idx === nextIndex ? { ...item, status: 'mapping', csvData } : item
      ));

      console.log(`📊 Parsed ${currentFile.file.name}:`, csvData.headers);
    } catch (error) {
      console.error('Error parsing file:', error);
      setFileQueue(prev => prev.map((item, idx) => 
        idx === nextIndex ? { 
          ...item, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Failed to parse file'
        } : item
      ));
      
      toast({
        title: "File parsing failed",
        description: `Failed to parse ${currentFile.file.name}`,
        variant: "destructive",
      });
    }
  };

  const handleMappingComplete = async (mapping: FieldMapping) => {
    if (currentFileIndex === -1) return;

    const currentFile = fileQueue[currentFileIndex];
    if (!currentFile.csvData) return;

    // Save mapping and process the file
    setFileQueue(prev => prev.map((item, idx) => 
      idx === currentFileIndex ? { ...item, mapping } : item
    ));

    try {
      // First, ensure admin privileges for bypass functionality
      console.log('🔄 Ensuring admin privileges for bypass upload');
      const adminResult = await promoteToAdmin();
      
      if (!adminResult.success) {
        throw new Error(`Admin promotion failed: ${adminResult.message}`);
      }
      console.log('✅ Admin promotion successful');

      // Process leads using the field mapping
      const processResult = processLeads(currentFile.csvData, mapping);
      
      console.log('⚙️ Processing result:', {
        validLeads: processResult.validLeads.length,
        duplicates: processResult.duplicates.length,
        errors: processResult.errors.length
      });

      if (processResult.validLeads.length === 0) {
        throw new Error(`No valid leads found. ${processResult.errors.length} processing errors, ${processResult.duplicates.length} duplicates detected.`);
      }

      // Use bypass upload for database insertion
      console.log('💾 Starting bypass upload...');
      const uploadResult = await uploadLeadsWithRLSBypass(processResult.validLeads);
      console.log('💾 Bypass upload result:', uploadResult);

      const result = {
        success: uploadResult.success,
        totalProcessed: uploadResult.totalProcessed,
        successfulInserts: uploadResult.successfulInserts,
        errors: uploadResult.errors,
        errorCount: uploadResult.errorCount,
        message: uploadResult.message,
        duplicates: processResult.duplicates,
        processingErrors: processResult.errors,
        timestamp: uploadResult.timestamp
      };

      setFileQueue(prev => prev.map((item, idx) => 
        idx === currentFileIndex ? { 
          ...item, 
          status: 'completed',
          result
        } : item
      ));

      const successMessage = uploadResult.errorCount && uploadResult.errorCount > 0 
        ? `Uploaded ${uploadResult.successfulInserts} of ${uploadResult.totalProcessed} leads (${uploadResult.errorCount} errors)`
        : `Successfully uploaded ${uploadResult.successfulInserts} of ${uploadResult.totalProcessed} leads`;

      toast({
        title: "File processed successfully",
        description: `${currentFile.file.name}: ${successMessage}`,
      });

      // Move to next file after a short delay
      setTimeout(processNextFile, 1000);

    } catch (error) {
      console.error('Error uploading leads:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFileQueue(prev => prev.map((item, idx) => 
        idx === currentFileIndex ? { 
          ...item, 
          status: 'error',
          error: errorMessage
        } : item
      ));

      toast({
        title: "Upload failed",
        description: `Failed to upload leads from ${currentFile.file.name}: ${errorMessage}`,
        variant: "destructive",
      });

      // Still move to next file even if this one failed
      setTimeout(processNextFile, 2000);
    }
  };

  const startProcessing = () => {
    setStage('processing');
    processNextFile();
  };

  const resetQueue = () => {
    setFileQueue([]);
    setCurrentFileIndex(-1);
    setStage('selection');
  };

  const handleClose = () => {
    if (stage === 'processing' && currentFileIndex !== -1) {
      // Don't allow closing during active processing
      return;
    }
    
    resetQueue();
    onClose();
  };

  const currentFile = currentFileIndex >= 0 ? fileQueue[currentFileIndex] : null;
  const completedFiles = fileQueue.filter(f => f.status === 'completed');
  const totalLeadsUploaded = completedFiles.reduce((sum, f) => sum + (f.result?.success || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Sequential Lead Upload</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {stage === 'selection' && (
            <>
              {/* File Drop Area */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop CSV or Excel files here or click to browse
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Files will be processed one at a time in the order shown below
                </p>
                <input
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                  className="hidden"
                  id="sequential-file-input"
                />
                <Button asChild>
                  <label htmlFor="sequential-file-input" className="cursor-pointer">
                    Select Files
                  </label>
                </Button>
              </div>

              {/* Upload Settings */}
              {fileQueue.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">Upload Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Vehicle Condition</label>
                      <select
                        value={selectedCondition}
                        onChange={(e) => setSelectedCondition(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="used">Used</option>
                        <option value="new">New</option>
                        <option value="gm_global">GM Global</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="update-existing"
                        checked={updateExistingLeads}
                        onChange={(e) => setUpdateExistingLeads(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="update-existing" className="text-sm">
                        Update existing leads
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* File Queue */}
              {fileQueue.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Processing Queue ({fileQueue.length} files)</h4>
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={fileQueue.map(f => f.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {fileQueue.map((item, index) => (
                          <SortableFileItem 
                            key={item.id} 
                            item={item} 
                            isActive={index === currentFileIndex}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </>
          )}

          {stage === 'processing' && (
            <>
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing Progress</span>
                  <span>{completedFiles.length} of {fileQueue.length} completed</span>
                </div>
                <Progress value={(completedFiles.length / fileQueue.length) * 100} />
              </div>

              {/* Current File Processing */}
              {currentFile && currentFile.status === 'mapping' && currentFile.csvData && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800">
                      Processing: {currentFile.file.name}
                    </h4>
                    <p className="text-sm text-blue-600">
                      Map the fields for this file before uploading
                    </p>
                  </div>
                  
                  <CSVFieldMapper
                    csvHeaders={currentFile.csvData.headers}
                    sampleData={currentFile.csvData.sample}
                    onMappingComplete={handleMappingComplete}
                  />
                </div>
              )}

              {/* Queue Status */}
              <div className="space-y-2">
                <h4 className="font-medium">File Status</h4>
                {fileQueue.map((item, index) => (
                  <SortableFileItem 
                    key={item.id} 
                    item={item} 
                    isActive={index === currentFileIndex}
                  />
                ))}
              </div>
            </>
          )}

          {stage === 'complete' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium">All Files Processed!</h3>
              <p className="text-gray-600">
                Successfully uploaded {totalLeadsUploaded} leads from {completedFiles.length} files
              </p>
              
              {/* Results Summary */}
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h4 className="font-medium mb-2">Results Summary</h4>
                {fileQueue.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>{item.file.name}</span>
                    <span className={
                      item.status === 'completed' ? 'text-green-600' :
                      item.status === 'error' ? 'text-red-600' : 'text-gray-500'
                    }>
                      {item.status === 'completed' ? `${item.result?.success || 0} leads` :
                       item.status === 'error' ? 'Failed' : 'Skipped'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex space-x-2">
            {stage === 'processing' && (
              <Button
                variant="outline"
                onClick={resetQueue}
                disabled={currentFileIndex !== -1}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Queue
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose}>
              {stage === 'complete' ? 'Close' : 'Cancel'}
            </Button>
            
            {stage === 'selection' && fileQueue.length > 0 && (
              <Button onClick={startProcessing}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Start Processing
              </Button>
            )}
            
            {stage === 'complete' && onSuccess && (
              <Button onClick={() => { onSuccess(); handleClose(); }}>
                View Leads
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SequentialLeadUploadModal;