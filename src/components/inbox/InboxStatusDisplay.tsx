
import React from 'react';
import { Loader2, AlertCircle, RefreshCw, Inbox } from "lucide-react";
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
  // Show error state with retry option (highest priority)
  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-4">
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

  // Show loading state (second priority)
  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no conversations (lowest priority)
  if (conversationsCount === 0) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <div className="text-center">
          <Inbox className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No conversations yet</h3>
          <p className="text-slate-500 mb-4">Start a conversation with your leads to see them here.</p>
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Don't render anything if we shouldn't show a status
  return null;
};

export default InboxStatusDisplay;
