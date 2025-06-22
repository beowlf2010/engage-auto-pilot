import { toast } from '@/hooks/use-toast';

export interface ErrorContext {
  operation: string;
  leadId?: string;
  userId?: string;
  additionalData?: any;
}

export interface ErrorDetails {
  message: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorContext;
  timestamp: number;
  userFriendlyMessage?: string;
}

class ErrorHandlingService {
  private errorLog: ErrorDetails[] = [];
  private readonly MAX_LOG_SIZE = 100;

  // Handle different types of errors with appropriate user feedback
  handleError(error: any, context: ErrorContext): void {
    const errorDetails = this.parseError(error, context);
    this.logError(errorDetails);
    this.showUserFeedback(errorDetails);
    
    // Log to console for debugging
    console.error(`[${errorDetails.severity.toUpperCase()}] ${context.operation}:`, {
      error,
      context,
      timestamp: new Date(errorDetails.timestamp).toISOString()
    });
  }

  private parseError(error: any, context: ErrorContext): ErrorDetails {
    let message = 'An unexpected error occurred';
    let code = 'UNKNOWN_ERROR';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let userFriendlyMessage = 'Something went wrong. Please try again.';

    if (error instanceof Error) {
      message = error.message;
      
      // Categorize common errors
      if (message.includes('Network')) {
        severity = 'high';
        userFriendlyMessage = 'Network connection issue. Please check your internet connection.';
        code = 'NETWORK_ERROR';
      } else if (message.includes('timeout')) {
        severity = 'medium';
        userFriendlyMessage = 'Request timed out. Please try again.';
        code = 'TIMEOUT_ERROR';
      } else if (message.includes('Profile validation failed')) {
        severity = 'high';
        userFriendlyMessage = 'Authentication issue. Please refresh the page.';
        code = 'AUTH_ERROR';
      } else if (message.includes('Lead validation failed')) {
        severity = 'medium';
        userFriendlyMessage = 'Lead information unavailable. Please select a different conversation.';
        code = 'LEAD_ERROR';
      } else if (message.includes('SMS sending failed')) {
        severity = 'high';
        userFriendlyMessage = 'Message could not be sent. Please try again.';
        code = 'SMS_ERROR';
      }
    }

    // Determine severity based on operation - ensure proper type handling
    if (context.operation.includes('send') || context.operation.includes('load')) {
      // Create a new severity value to avoid type narrowing issues
      const currentSeverity = severity;
      if (currentSeverity === 'low') {
        severity = 'medium';
      }
    }

    return {
      message,
      code,
      severity,
      context,
      timestamp: Date.now(),
      userFriendlyMessage
    };
  }

  private logError(errorDetails: ErrorDetails): void {
    this.errorLog.unshift(errorDetails);
    
    // Keep log size manageable
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE);
    }
  }

  private showUserFeedback(errorDetails: ErrorDetails): void {
    const isHighPriority = errorDetails.severity === 'critical' || errorDetails.severity === 'high';
    const variant = isHighPriority ? 'destructive' : 'default';

    toast({
      title: this.getErrorTitle(errorDetails.severity),
      description: errorDetails.userFriendlyMessage || errorDetails.message,
      variant,
      duration: errorDetails.severity === 'critical' ? 10000 : 5000
    });
  }

  private getErrorTitle(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (severity) {
      case 'critical': return 'Critical Error';
      case 'high': return 'Error';
      case 'medium': return 'Warning';
      case 'low': return 'Notice';
      default: return 'Error';
    }
  }

  // Get recent errors for debugging
  getRecentErrors(count = 10): ErrorDetails[] {
    return this.errorLog.slice(0, count);
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Check if we have recurring errors
  hasRecurringErrors(operation: string, timeWindow = 60000): boolean {
    const now = Date.now();
    const recentErrors = this.errorLog.filter(
      err => err.context.operation === operation && (now - err.timestamp) < timeWindow
    );
    return recentErrors.length >= 3;
  }
}

export const errorHandlingService = new ErrorHandlingService();
