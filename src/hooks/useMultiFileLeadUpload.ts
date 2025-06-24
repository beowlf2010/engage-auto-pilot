
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from '@/hooks/use-toast';

interface QueuedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
}

interface BatchUploadResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalLeads: number;
  successfulLeads: number;
  failedLeads: number;
  duplicateLeads: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    records?: number;
    error?: string;
  }>;
}

export const useMultiFileLeadUpload = () => {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchUploadResult | null>(null);
  const { profile } = useAuth();

  const addFiles = useCallback((files: FileList) => {
    const newFiles: QueuedFile[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'pending'
    }));

    setQueuedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setQueuedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueuedFiles([]);
    setBatchResult(null);
  }, []);

  const processFile = async (queuedFile: QueuedFile): Promise<{ success: boolean; records?: number; error?: string }> => {
    try {
      console.log(`📤 [MULTI UPLOAD] Processing file: ${queuedFile.file.name}`);
      
      // Update file status to processing
      setQueuedFiles(prev => prev.map(f => 
        f.id === queuedFile.id ? { ...f, status: 'processing' } : f
      ));

      const formData = new FormData();
      formData.append('file', queuedFile.file);

      const response = await fetch('/api/upload-leads', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success && result.leads && result.leads.length > 0) {
        // Insert leads into database with AI strategy calculation
        const { data: insertedLeads, error: insertError } = await supabase
          .from('leads')
          .insert(
            result.leads.map((lead: any) => ({
              first_name: lead.firstName,
              last_name: lead.lastName,
              middle_name: lead.middleName,
              email: lead.email,
              email_alt: lead.emailAlt,
              address: lead.address,
              city: lead.city,
              state: lead.state,
              postal_code: lead.postalCode,
              vehicle_interest: lead.vehicleInterest,
              vehicle_vin: lead.vehicleVIN,
              source: lead.source,
              status: lead.status,
              do_not_call: lead.doNotCall,
              do_not_email: lead.doNotEmail,
              do_not_mail: lead.doNotMail,
              salesperson_id: profile?.id,
              // New lead factors for AI strategy
              lead_status_type_name: lead.leadStatusTypeName,
              lead_type_name: lead.leadTypeName,
              lead_source_name: lead.leadSourceName || lead.source,
            }))
          )
          .select('id, lead_status_type_name, lead_type_name, lead_source_name');

        if (insertError) {
          console.error('❌ [MULTI UPLOAD] Database insert error:', insertError);
          throw new Error(`Database insert failed: ${insertError.message}`);
        }

        // Insert phone numbers for each lead
        if (insertedLeads && insertedLeads.length > 0) {
          const phoneNumberInserts: any[] = [];
          
          insertedLeads.forEach((insertedLead, index) => {
            const leadData = result.leads[index];
            if (leadData.phoneNumbers && leadData.phoneNumbers.length > 0) {
              leadData.phoneNumbers.forEach((phone: any) => {
                phoneNumberInserts.push({
                  lead_id: insertedLead.id,
                  number: phone.number,
                  type: phone.type,
                  priority: phone.priority,
                  status: phone.status,
                  is_primary: phone.isPrimary
                });
              });
            }
          });

          if (phoneNumberInserts.length > 0) {
            const { error: phoneError } = await supabase
              .from('phone_numbers')
              .insert(phoneNumberInserts);

            if (phoneError) {
              console.error('❌ [MULTI UPLOAD] Phone numbers insert error:', phoneError);
              // Don't fail the whole upload for phone number errors
            }
          }

          // Trigger AI strategy calculation for each lead that has factors
          for (const insertedLead of insertedLeads) {
            if (insertedLead.lead_status_type_name || insertedLead.lead_type_name || insertedLead.lead_source_name) {
              try {
                await supabase.rpc('calculate_ai_strategy_for_lead', {
                  p_lead_id: insertedLead.id,
                  p_lead_status_type_name: insertedLead.lead_status_type_name,
                  p_lead_type_name: insertedLead.lead_type_name,
                  p_lead_source_name: insertedLead.lead_source_name
                });
                console.log(`✅ [MULTI UPLOAD] AI strategy calculated for lead ${insertedLead.id}`);
              } catch (error) {
                console.error('❌ [MULTI UPLOAD] AI strategy calculation error:', error);
                // Don't fail the upload for AI strategy errors
              }
            }
          }
        }

        console.log(`✅ [MULTI UPLOAD] Successfully processed ${result.leads.length} leads from ${queuedFile.file.name}`);
        
        // Update file status to completed
        setQueuedFiles(prev => prev.map(f => 
          f.id === queuedFile.id ? { ...f, status: 'completed', result } : f
        ));

        return { success: true, records: result.leads.length };
      } else {
        throw new Error(result.error || 'No leads processed');
      }

    } catch (error) {
      console.error(`❌ [MULTI UPLOAD] Error processing ${queuedFile.file.name}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update file status to error
      setQueuedFiles(prev => prev.map(f => 
        f.id === queuedFile.id ? { ...f, status: 'error', error: errorMessage } : f
      ));

      return { success: false, error: errorMessage };
    }
  };

  const processBatch = async (): Promise<BatchUploadResult> => {
    if (queuedFiles.length === 0) {
      throw new Error('No files to process');
    }

    setProcessing(true);
    
    const result: BatchUploadResult = {
      totalFiles: queuedFiles.length,
      successfulFiles: 0,
      failedFiles: 0,
      totalLeads: 0,
      successfulLeads: 0,
      failedLeads: 0,
      duplicateLeads: 0,
      results: []
    };

    try {
      console.log(`🚀 [MULTI UPLOAD] Starting batch processing of ${queuedFiles.length} files`);

      // Process files sequentially to avoid overwhelming the system
      for (const queuedFile of queuedFiles) {
        const fileResult = await processFile(queuedFile);
        
        if (fileResult.success) {
          result.successfulFiles++;
          result.successfulLeads += fileResult.records || 0;
          result.results.push({
            fileName: queuedFile.file.name,
            status: 'success',
            records: fileResult.records
          });
        } else {
          result.failedFiles++;
          result.results.push({
            fileName: queuedFile.file.name,
            status: 'error',
            error: fileResult.error
          });
        }

        // Add a small delay between files to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      result.totalLeads = result.successfulLeads + result.failedLeads;

      console.log(`🎉 [MULTI UPLOAD] Batch processing completed:`, result);

      setBatchResult(result);
      return result;

    } catch (error) {
      console.error('❌ [MULTI UPLOAD] Batch processing failed:', error);
      toast({
        title: "Batch Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  return {
    queuedFiles,
    processing,
    batchResult,
    addFiles,
    removeFile,
    clearQueue,
    processBatch
  };
};
