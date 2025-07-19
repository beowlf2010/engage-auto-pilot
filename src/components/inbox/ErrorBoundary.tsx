
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Wifi } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log specific subscription errors
    if (error.message?.includes('subscribe multiple times')) {
      console.error('🚫 [ERROR BOUNDARY] Subscription conflict detected:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    } else {
      console.error('❌ [ERROR BOUNDARY] Error caught:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  isSubscriptionError = (): boolean => {
    return this.state.error?.message?.includes('subscribe multiple times') || 
           this.state.error?.message?.includes('subscription') ||
           false;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isSubscriptionError = this.isSubscriptionError();

      return (
        <Card className="m-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {isSubscriptionError ? 'Connection Issue' : 'Something went wrong'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                {isSubscriptionError ? (
                  <>
                    <strong>Real-time connection conflict detected.</strong>
                    <br />
                    This usually resolves by refreshing the page or retrying the connection.
                  </>
                ) : (
                  this.state.error?.message || 'An unexpected error occurred'
                )}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2 flex-wrap">
              {this.state.retryCount < 3 && (
                <Button onClick={this.handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({3 - this.state.retryCount} left)
                </Button>
              )}
              
              {isSubscriptionError && (
                <Button variant="outline" onClick={this.handleReload}>
                  <Wifi className="h-4 w-4 mr-2" />
                  Reconnect
                </Button>
              )}
              
              <Button variant="outline" onClick={this.handleReload}>
                Reload Page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600">
                  Debug Info (Development Only)
                </summary>
                <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
