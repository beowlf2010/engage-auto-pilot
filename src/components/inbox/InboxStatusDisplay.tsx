
import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface InboxStatusDisplayProps {
  loading: boolean;
  error: string | null;
  conversationsCount: number;
  onRetry: () => void;
}

const InboxStatusDisplay: React.FC<InboxStatusDisplayProps> = ({
  loading,
  error,
  conversationsCount,
  onRetry
}) => {
  // Show error state with retry option
  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mb-4">
            {error}
          </AlertDescription>
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no conversations
  if (conversationsCount === 0) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No conversations found</p>
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default InboxStatusDisplay;
