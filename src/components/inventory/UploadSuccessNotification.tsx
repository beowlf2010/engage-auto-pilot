import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Info, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadSuccessNotificationProps {
  onReUpload: () => void;
}

const UploadSuccessNotification: React.FC<UploadSuccessNotificationProps> = ({ onReUpload }) => {
  return (
    <div className="space-y-4">
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            System Fixed & Ready
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-700">
          <p>
            The inventory upload and sync system has been repaired. Old vehicles have been properly marked as sold, 
            and the system is now ready to accept your current inventory.
          </p>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Info className="h-5 w-5" />
            What Happened
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 space-y-2">
          <p><strong>Problem:</strong> Today's uploads (175 vehicles) were recorded but not inserted into the inventory table.</p>
          <p><strong>Root Cause:</strong> Upload insertion logic was failing silently.</p>
          <p><strong>Solution:</strong> Fixed insertion logic and cleaned up inconsistent data.</p>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Next Steps Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700 space-y-3">
          <p>
            <strong>You need to re-upload today's inventory files</strong> to get your current 175 vehicles into the system.
          </p>
          <div className="bg-white p-3 rounded border border-amber-200">
            <p className="font-medium text-amber-800 mb-2">Files to re-upload:</p>
            <ul className="text-sm space-y-1">
              <li>• NEW CAR MAIN VIEW-Jason Pilger Chevrolet-2025-07-02-0938.xls (87 vehicles)</li>
              <li>• Tommy Merch-Inv View-Jason Pilger Chevrolet-2025-07-02-0937.xls (88 vehicles)</li>
            </ul>
          </div>
          <Button onClick={onReUpload} className="w-full" size="lg">
            <Upload className="h-4 w-4 mr-2" />
            Re-Upload Today's Files
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Info className="h-5 w-5" />
            What to Expect
          </CardTitle>
        </CardHeader>
        <CardContent className="text-slate-700 space-y-2">
          <p><strong>After re-upload:</strong> Available count will show 175 vehicles (your current inventory)</p>
          <p><strong>Automatic cleanup:</strong> System will now properly maintain accurate counts daily</p>
          <p><strong>Validation:</strong> Upload process now includes enhanced error detection and reporting</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadSuccessNotification;