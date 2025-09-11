import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Trash2, FileX, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const DataPurgePanel = () => {
  const { toast } = useToast();
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResults, setPurgeResults] = useState<any>(null);

  const handlePurgeAllData = async () => {
    if (!confirm('⚠️ CRITICAL WARNING: This will permanently delete ALL leads, inventory, and related data. This action cannot be undone. Are you absolutely sure?')) {
      return;
    }

    if (!confirm('This is your final confirmation. You are about to delete ALL data from the previous dealership. Type "DELETE ALL" in your mind and click OK to proceed.')) {
      return;
    }

    setIsPurging(true);
    try {
      // First, let's try a dry run to see what will be deleted
      const { data: dryRun, error: dryRunError } = await supabase.rpc('purge_all_leads', {
        p_dry_run: true
      });

      if (dryRunError) {
        throw dryRunError;
      }

      console.log('Dry run results:', dryRun);

      // If dry run is successful, proceed with actual purge
      const { data: purgeResult, error: purgeError } = await supabase.rpc('purge_all_leads', {
        p_dry_run: false
      });

      if (purgeError) {
        throw purgeError;
      }

      // Also purge inventory data
      const { error: inventoryError } = await supabase
        .from('inventory')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy record

      if (inventoryError) {
        console.warn('Inventory purge warning:', inventoryError);
      }

      // Purge upload history
      const { error: uploadError } = await supabase
        .from('upload_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (uploadError) {
        console.warn('Upload history purge warning:', uploadError);
      }

      setPurgeResults(purgeResult);
      
      toast({
        title: "Data Purged Successfully",
        description: `Deleted ${(purgeResult as any)?.leads_deleted || 0} leads and reassigned ${(purgeResult as any)?.conversations_reassigned || 0} conversations. Ready for fresh start at U-J Chevrolet.`,
      });

    } catch (error) {
      console.error('Purge error:', error);
      toast({
        title: "Purge Failed",
        description: "Failed to purge data. Please contact support if this continues.",
        variant: "destructive"
      });
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Data Cleanup for New Dealership
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Since you're starting at U-J Chevrolet, you need to purge all data from your previous dealership. 
          This will delete:
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Badge variant="outline" className="flex items-center gap-1 p-2">
            <FileX className="h-3 w-3" />
            All Leads
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 p-2">
            <Database className="h-3 w-3" />
            Inventory Data
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 p-2">
            <Trash2 className="h-3 w-3" />
            Upload History
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
          <strong>Note:</strong> Conversations will be preserved but anonymized for compliance. 
          AI learning data will be reset for your new dealership context.
        </div>

        {purgeResults && (
          <div className="p-3 bg-success/10 border border-success/20 rounded text-sm">
            ✅ Purge completed: {(purgeResults as any)?.leads_deleted || 0} leads deleted, 
            {(purgeResults as any)?.conversations_reassigned || 0} conversations anonymized
          </div>
        )}

        <Button 
          onClick={handlePurgeAllData}
          disabled={isPurging || !!purgeResults}
          variant="destructive"
          className="w-full"
          size="lg"
        >
          {isPurging ? (
            <>Purging Data...</>
          ) : purgeResults ? (
            <>Data Purged Successfully</>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Purge All Previous Dealership Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};