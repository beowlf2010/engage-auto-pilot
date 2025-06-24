
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Database, 
  Target,
  Brain,
  Calendar,
  BarChart3
} from "lucide-react";
import type { LeadDetailData } from "@/services/leadDetailService";

interface OriginalUploadDataCardProps {
  lead: LeadDetailData;
}

const OriginalUploadDataCard: React.FC<OriginalUploadDataCardProps> = ({ lead }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out common system fields and show only the original CSV data
  const getDisplayableUploadData = () => {
    if (!lead.rawUploadData || Object.keys(lead.rawUploadData).length === 0) {
      return {};
    }

    const systemFields = [
      'id', 'created_at', 'updated_at', 'ai_opt_in', 'ai_stage', 
      'next_ai_send_at', 'last_reply_at', 'salesperson_id'
    ];

    return Object.entries(lead.rawUploadData)
      .filter(([key]) => !systemFields.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, any>);
  };

  const uploadData = getDisplayableUploadData();
  const hasUploadData = Object.keys(uploadData).length > 0;

  const formatFieldName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Original Upload Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Strategy Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <Brain className="w-3 h-3" />
            AI Strategy Mapping
          </div>
          <div className="grid grid-cols-1 gap-2">
            {lead.leadTypeName && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Type:</span>
                <Badge variant="outline" className="text-xs">
                  {lead.leadTypeName}
                </Badge>
              </div>
            )}
            {lead.leadStatusTypeName && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Status:</span>
                <Badge variant="outline" className="text-xs">
                  {lead.leadStatusTypeName}
                </Badge>
              </div>
            )}
            {lead.leadSourceName && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Source:</span>
                <Badge variant="outline" className="text-xs">
                  {lead.leadSourceName}
                </Badge>
              </div>
            )}
            {lead.aiStrategyBucket && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Strategy:</span>
                <Badge variant="secondary" className="text-xs">
                  {lead.aiStrategyBucket}
                </Badge>
              </div>
            )}
            {lead.aiAggressionLevel && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Aggression:</span>
                <Badge variant="outline" className="text-xs">
                  Level {lead.aiAggressionLevel}/5
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Data Quality Score */}
        {lead.dataSourceQualityScore !== undefined && lead.dataSourceQualityScore > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <BarChart3 className="w-3 h-3" />
              Data Quality
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Score:</span>
              <Badge className={`text-xs ${getQualityScoreColor(lead.dataSourceQualityScore)}`}>
                {lead.dataSourceQualityScore}%
              </Badge>
            </div>
          </div>
        )}

        {/* Original Status Mapping */}
        {lead.originalStatus && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <Target className="w-3 h-3" />
              Status Mapping
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Original:</span>
              <Badge variant="outline" className="text-xs">
                {lead.originalStatus}
              </Badge>
              <span className="text-xs text-gray-400">→</span>
              <Badge variant="secondary" className="text-xs">
                {lead.status}
              </Badge>
            </div>
          </div>
        )}

        {/* Upload Metadata */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <Database className="w-3 h-3" />
            Upload Metadata
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {lead.uploadHistoryId && (
              <div>
                <span className="text-gray-500">Upload ID:</span>
                <div className="font-mono text-xs truncate">
                  {lead.uploadHistoryId.slice(0, 8)}...
                </div>
              </div>
            )}
            {lead.originalRowIndex && (
              <div>
                <span className="text-gray-500">Row:</span>
                <div className="font-mono text-xs">
                  #{lead.originalRowIndex}
                </div>
              </div>
            )}
            {lead.aiStrategyLastUpdated && (
              <div className="col-span-2">
                <span className="text-gray-500">Strategy Updated:</span>
                <div className="text-xs">
                  {new Date(lead.aiStrategyLastUpdated).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Original CSV Data */}
        {hasUploadData && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0 h-auto text-xs font-medium text-gray-700 hover:text-gray-900"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Original CSV Fields ({Object.keys(uploadData).length})
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
            </Button>
            
            {isExpanded && (
              <div className="space-y-2 pt-2 border-t">
                {Object.entries(uploadData).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-gray-500 truncate" title={formatFieldName(key)}>
                      {formatFieldName(key)}:
                    </div>
                    <div className="col-span-2 text-gray-900 break-words" title={formatFieldValue(value)}>
                      {formatFieldValue(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasUploadData && !lead.leadTypeName && !lead.dataSourceQualityScore && (
          <div className="text-xs text-gray-500 italic">
            No original upload data available for this lead.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OriginalUploadDataCard;
