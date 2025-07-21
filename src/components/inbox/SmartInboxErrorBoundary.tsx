
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SmartInboxErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface SmartInboxErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

class SmartInboxErrorBoundary extends React.Component<
  SmartInboxErrorBoundaryProps,
  SmartInboxErrorBoundaryState
> {
  constructor(props: SmartInboxErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SmartInboxErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 [SMART INBOX ERROR BOUNDARY] Component error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount
    });

    this.setState({
      error,
      errorInfo,
      hasError: true
    });
  }

  handleRetry = () => {
    console.log('🔄 [SMART INBOX ERROR BOUNDARY] Retry attempt:', this.state.retryCount + 1);
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <Alert className="border-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="mb-4">
                <div className="space-y-2">
                  <p className="font-medium">Smart Inbox failed to load</p>
                  <p className="text-sm text-muted-foreground">
                    {this.state.error?.message || 'An unexpected error occurred while loading the inbox.'}
                  </p>
                  {this.state.retryCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Retry attempts: {this.state.retryCount}
                    </p>
                  )}
                </div>
              </AlertDescription>
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="destructive"
                >
                  Reload Page
                </Button>
              </div>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SmartInboxErrorBoundary;
