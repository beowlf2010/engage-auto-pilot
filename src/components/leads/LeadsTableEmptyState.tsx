
import React from "react";

interface LeadsTableEmptyStateProps {
  searchTerm: string;
}

const LeadsTableEmptyState: React.FC<LeadsTableEmptyStateProps> = ({ searchTerm }) => (
  <div className="text-center py-8 text-muted-foreground">
    {searchTerm ? `No leads found matching "${searchTerm}"` : "No leads found"}
  </div>
);

export default LeadsTableEmptyState;
