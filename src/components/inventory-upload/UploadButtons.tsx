
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface UploadButtonsProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>, condition: 'new' | 'used' | 'gm_global') => void;
  uploading: boolean;
  selectedCondition: 'new' | 'used' | 'gm_global';
}

const UploadButtons = ({ onFileUpload, uploading, selectedCondition }: UploadButtonsProps) => {
  const uploadButtons = [
    {
      condition: 'new' as const,
      label: 'Upload New Vehicles',
      description: 'Brand new vehicles from factory',
      icon: '🆕',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      condition: 'used' as const,
      label: 'Upload Used Vehicles', 
      description: 'Pre-owned vehicles',
      icon: '🚗',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      condition: 'gm_global' as const,
      label: 'Upload GM Global Orders',
      description: 'GM orders and configuration data',
      icon: '🔧',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-slate-800 mb-4">Choose Upload Type</h3>
      
      {uploadButtons.map((button) => (
        <Card key={button.condition} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{button.icon}</span>
              <div>
                <h4 className="font-medium text-slate-800">{button.label}</h4>
                <p className="text-sm text-slate-600">{button.description}</p>
              </div>
            </div>
            
            <div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => onFileUpload(e, button.condition)}
                disabled={uploading}
                className="hidden"
                id={`upload-${button.condition}`}
              />
              
              <Button
                onClick={() => document.getElementById(`upload-${button.condition}`)?.click()}
                disabled={uploading}
                className={`${button.color} text-white`}
              >
                {uploading && selectedCondition === button.condition ? (
                  "Uploading..."
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default UploadButtons;
