import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Info } from "lucide-react";

interface CSVPreviewCardProps {
  totalRows: number;
  validLeads: number;
  duplicates: number;
  errors: number;
  sampleData?: Record<string, string>;
  fileName?: string;
}

export const CSVPreviewCard = ({ 
  totalRows, 
  validLeads, 
  duplicates, 
  errors, 
  sampleData,
  fileName 
}: CSVPreviewCardProps) => {
  const qualityScore = totalRows > 0 ? Math.round((validLeads / totalRows) * 100) : 0;
  
  const getQualityColor = (score: number) => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          CSV Preview & Quality Check
        </CardTitle>
        {fileName && (
          <p className="text-sm text-muted-foreground">File: {fileName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quality Score */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="font-medium">Data Quality Score</span>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getQualityColor(qualityScore)}`}>
              {qualityScore}%
            </span>
            {qualityScore >= 90 ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
          </div>
        </div>

        {/* Processing Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{totalRows}</div>
            <div className="text-sm text-muted-foreground">Total Rows</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{validLeads}</div>
            <div className="text-sm text-muted-foreground">Valid Leads</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{duplicates}</div>
            <div className="text-sm text-muted-foreground">Duplicates</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{errors}</div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </div>
        </div>

        {/* Quality Indicators */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Data Quality Indicators</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant={validLeads > 0 ? "default" : "secondary"}>
              {validLeads > 0 ? "✓" : "○"} Names Parsed
            </Badge>
            <Badge variant={sampleData?.contactPhone || sampleData?.cellphone ? "default" : "secondary"}>
              {sampleData?.contactPhone || sampleData?.cellphone ? "✓" : "○"} Contact Info
            </Badge>
            <Badge variant={duplicates === 0 ? "default" : "destructive"}>
              {duplicates === 0 ? "✓" : "!"} No Duplicates
            </Badge>
            <Badge variant={errors === 0 ? "default" : "destructive"}>
              {errors === 0 ? "✓" : "!"} No Errors
            </Badge>
          </div>
        </div>

        {/* Sample Data Preview */}
        {sampleData && Object.keys(sampleData).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Sample Data Preview</h4>
            <div className="bg-muted/30 p-3 rounded-lg max-h-32 overflow-y-auto">
              <div className="grid grid-cols-1 gap-1 text-xs">
                {Object.entries(sampleData).slice(0, 5).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium w-1/3 truncate">{key}:</span>
                    <span className="text-muted-foreground w-2/3 truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};