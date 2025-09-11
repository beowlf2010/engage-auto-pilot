import React, { useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from 'lucide-react';

interface SimpleUploadAreaProps {
  onFileSelected: (file: File) => void;
  processing: boolean;
}

const SimpleUploadArea = ({ onFileSelected, processing }: SimpleUploadAreaProps) => {
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    // Reset input for re-selection
    event.target.value = '';
  }, [onFileSelected]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer.files[0];
    if (file) {
      onFileSelected(file);
    }
  }, [onFileSelected]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <Card className="bg-card shadow-card border-border">
      <CardContent className="p-8">
        <div
          className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-foreground">
                Drop your CSV file here
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Or click to browse for lead data files (.csv, .xlsx, .xls)
              </p>
            </div>

            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-file-input"
              disabled={processing}
            />
            
            <Button 
              asChild 
              disabled={processing}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <label htmlFor="csv-file-input" className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                {processing ? 'Processing...' : 'Select File'}
              </label>
            </Button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Supports CSV and Excel formats • Maximum file size: 10MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleUploadArea;