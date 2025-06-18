
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, Eye, X, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { getComplianceViolations, reviewComplianceViolation } from '@/services/complianceMonitoringService';
import type { ComplianceViolation } from '@/services/complianceMonitoringService';

const ComplianceMonitoringPanel = () => {
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingViolation, setProcessingViolation] = useState<string | null>(null);

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    try {
      // Get all violations from the database
      const { data, error } = await supabase
        .from('compliance_violations')
        .select(`
          *,
          conversations!inner(
            lead_id,
            leads!inner(first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedViolations: ComplianceViolation[] = data?.map(item => ({
        id: item.id,
        conversationId: item.conversation_id,
        leadId: item.lead_id,
        violationType: item.violation_type,
        severity: item.severity as 'low' | 'medium' | 'high' | 'critical',
        description: item.description,
        detectedContent: item.detected_content,
        confidenceScore: item.confidence_score,
        reviewed: item.reviewed,
        reviewedBy: item.reviewed_by,
        reviewedAt: item.reviewed_at,
        status: item.status as 'open' | 'resolved' | 'false_positive',
        createdAt: item.created_at
      })) || [];

      setViolations(formattedViolations);
    } catch (error) {
      console.error('Error fetching compliance violations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewViolation = async (violationId: string, status: 'resolved' | 'false_positive') => {
    setProcessingViolation(violationId);
    
    try {
      const success = await reviewComplianceViolation(violationId, status, 'current-user-id');
      
      if (success) {
        // Update the violation in the local state
        setViolations(prev => prev.map(v => 
          v.id === violationId 
            ? { ...v, status, reviewed: true, reviewedAt: new Date().toISOString() }
            : v
        ));
      }
    } catch (error) {
      console.error('Error reviewing violation:', error);
    } finally {
      setProcessingViolation(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const openViolations = violations.filter(v => v.status === 'open');
  const resolvedViolations = violations.filter(v => v.status !== 'open');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading compliance data...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={openViolations.length > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
              Open Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{openViolations.length}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedViolations.length}</div>
            <p className="text-xs text-muted-foreground">Successfully handled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Shield className="w-4 h-4 mr-2 text-blue-600" />
              Compliance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {violations.length > 0 ? Math.round((resolvedViolations.length / violations.length) * 100) : 100}%
            </div>
            <p className="text-xs text-muted-foreground">Overall compliance</p>
          </CardContent>
        </Card>
      </div>

      {/* Open Violations */}
      {openViolations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                Open Violations ({openViolations.length})
              </span>
              <Badge variant="destructive">Action Required</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {openViolations.map((violation) => (
              <div key={violation.id} className={`p-4 rounded-lg border ${getSeverityColor(violation.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={getSeverityBadgeVariant(violation.severity)} className="text-xs">
                        {violation.severity.toUpperCase()}
                      </Badge>
                      <span className="font-medium text-sm">{violation.violationType}</span>
                      <span className="text-xs text-muted-foreground">
                        Confidence: {Math.round(violation.confidenceScore * 100)}%
                      </span>
                    </div>
                    
                    <p className="text-sm mb-2">{violation.description}</p>
                    
                    <div className="text-xs text-muted-foreground bg-white p-2 rounded border">
                      <strong>Detected Content:</strong> "{violation.detectedContent.substring(0, 100)}..."
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      Created: {new Date(violation.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={processingViolation === violation.id}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem 
                          onClick={() => handleReviewViolation(violation.id, 'resolved')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Resolved
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleReviewViolation(violation.id, 'false_positive')}
                        >
                          <X className="w-4 h-4 mr-2" />
                          False Positive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Open Violations */}
      {openViolations.length === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>All clear!</strong> No open compliance violations found. Your AI messaging is operating within compliance guidelines.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Activity */}
      {resolvedViolations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Recent Resolutions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resolvedViolations.slice(0, 5).map((violation) => (
                <div key={violation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-xs">
                      {violation.violationType}
                    </Badge>
                    <span className="text-sm">{violation.description}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={violation.status === 'resolved' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {violation.status === 'resolved' ? 'Resolved' : 'False Positive'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(violation.reviewedAt || violation.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComplianceMonitoringPanel;
