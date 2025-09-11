import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Upload, Users, AlertTriangle, XCircle } from 'lucide-react';

interface UploadResult {
  success: boolean;
  totalProcessed: number;
  successfulInserts: number;
  errors: any[];
  duplicates: any[];
  message: string;
  timestamp: string;
}

interface LeadUploadResultProps {
  result: UploadResult;
  onUploadAnother: () => void;
}

const LeadUploadResult = ({ result, onUploadAnother }: LeadUploadResultProps) => {
  const { success, totalProcessed, successfulInserts, errors, duplicates } = result;
  const errorCount = errors.length;
  const duplicateCount = duplicates.length;

  return (
    <Card className={`bg-card shadow-card border-border ${success ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-destructive'}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-card-foreground">
          {success ? (
            <CheckCircle className="h-6 w-6 text-primary" />
          ) : (
            <AlertCircle className="h-6 w-6 text-destructive" />
          )}
          <span>Upload {success ? 'Completed' : 'Failed'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalProcessed}</div>
            <div className="text-xs text-muted-foreground">Processed</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{successfulInserts}</div>
            <div className="text-xs text-muted-foreground">Successful</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="flex items-center justify-center mb-2">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="text-2xl font-bold text-foreground">{errorCount}</div>
            <div className="text-xs text-muted-foreground">Errors</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-muted border border-border">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground">{duplicateCount}</div>
            <div className="text-xs text-muted-foreground">Duplicates</div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-primary/80">
              <strong>Success!</strong> {successfulInserts} leads have been added to your database.
              {duplicateCount > 0 && ` ${duplicateCount} duplicates were detected and skipped.`}
            </p>
          </div>
        )}

        {/* Error Details */}
        {errorCount > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-foreground flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>Upload Errors ({errorCount})</span>
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {errors.slice(0, 5).map((error, index) => (
                <div key={index} className="text-sm p-2 rounded bg-destructive/5 border border-destructive/20">
                  <span className="text-destructive">Row {index + 1}:</span>{' '}
                  <span className="text-muted-foreground">{error.error}</span>
                </div>
              ))}
              {errorCount > 5 && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  ... and {errorCount - 5} more errors
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Timestamp */}
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          Completed: {new Date(result.timestamp).toLocaleString()}
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-2">
          <Button 
            onClick={onUploadAnother}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Another File
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadUploadResult;