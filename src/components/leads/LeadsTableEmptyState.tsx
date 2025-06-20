
import React from 'react';

interface LeadsTableEmptyStateProps {
  loading: boolean;
  searchTerm: string;
  leadsCount: number;
}

const LeadsTableEmptyState = ({ loading, searchTerm, leadsCount }: LeadsTableEmptyStateProps) => {
  if (loading) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <div className="text-lg font-medium text-gray-700">Loading leads...</div>
      </div>
    );
  }

  if (leadsCount === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <div className="text-lg font-medium text-gray-700 mb-2">
          {searchTerm ? `No leads found matching "${searchTerm}"` : 'No leads found'}
        </div>
        <p className="text-gray-500">
          {searchTerm ? 'Try adjusting your search or filters' : 'Add some leads to get started'}
        </p>
      </div>
    );
  }

  return null;
};

export default LeadsTableEmptyState;
