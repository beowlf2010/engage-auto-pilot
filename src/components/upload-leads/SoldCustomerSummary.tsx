import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users, ArrowRight, Calendar, Building } from 'lucide-react';
import { SoldCustomerUploadSummary } from '@/services/soldCustomerTracker';

interface SoldCustomerSummaryProps {
  summary: SoldCustomerUploadSummary;
  uploadDate?: string;
  filename?: string;
}

const SoldCustomerSummary = ({ summary, uploadDate, filename }: SoldCustomerSummaryProps) => {
  if (summary.totalSoldCustomers === 0) return null;

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-green-800">
          <CheckCircle className="w-5 h-5" />
          <span>Sold Customers Detected</span>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {summary.totalSoldCustomers}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {summary.totalSoldCustomers}
              </div>
              <div className="text-sm text-green-600">Total Sold</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {summary.postSaleAssignments}
              </div>
              <div className="text-sm text-blue-600">Post-Sale Assigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {summary.duplicateSoldCustomers}
              </div>
              <div className="text-sm text-orange-600">Duplicates</div>
            </div>
          </div>

          {/* Upload Info */}
          {(uploadDate || filename) && (
            <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
              {filename && (
                <div className="flex items-center space-x-1">
                  <Building className="w-4 h-4" />
                  <span>{filename}</span>
                </div>
              )}
              {uploadDate && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(uploadDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Sold Customers List */}
          {summary.soldCustomersData.length > 0 && (
            <div className="pt-3 border-t">
              <h4 className="font-medium text-gray-700 mb-3 flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Sold Customers</span>
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {summary.soldCustomersData.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800">
                        {customer.firstName} {customer.lastName}
                      </div>
                      <div className="text-xs text-gray-600">
                        {customer.source} • {customer.vehicleInterest}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {customer.assignedToPostSale && (
                        <Badge variant="outline" className="text-xs border-green-300 text-green-600">
                          <ArrowRight className="w-3 h-3 mr-1" />
                          Post-Sale
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post-Sale Assignment Info */}
          {summary.postSaleAssignments > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>{summary.postSaleAssignments}</strong> sold customers have been automatically assigned to post-sale follow-up processes for referral requests and service reminders.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SoldCustomerSummary;