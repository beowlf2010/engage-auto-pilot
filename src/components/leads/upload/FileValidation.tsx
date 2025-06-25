
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface FileValidationProps {
  errors: string[];
}

export const validateFiles = (files: File[]): string[] => {
  const errors: string[] = [];
  
  files.forEach(file => {
    const fileName = file.name.toLowerCase();
    
    // Check if it looks like a VIN Solutions export
    if (fileName.includes('vinsolutions') || fileName.includes('vin_solutions') || 
        fileName.includes('message') && (fileName.includes('export') || fileName.includes('log'))) {
      errors.push(`"${file.name}" appears to be a VIN Solutions message export. Please use the Message Import feature instead.`);
      return;
    }
    
    // Check file extension
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      errors.push(`"${file.name}" has an unsupported format. Please use CSV or Excel files.`);
      return;
    }
  });
  
  return errors;
};

const FileValidation = ({ errors }: FileValidationProps) => {
  if (errors.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default FileValidation;
