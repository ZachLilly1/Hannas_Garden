import { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and handle JavaScript errors in child components
 * Prevents the entire app from crashing when a component throws an error
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI when an error is caught
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Something went wrong</h2>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              onClick={this.resetErrorBoundary}
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="destructive"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Component-level error boundary to wrap individual components that might error
 */
export function ComponentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-800 dark:text-red-200 text-sm my-2">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
            <span className="font-medium">Component Error</span>
          </div>
          <p className="text-red-600 dark:text-red-400">
            This component encountered an error. Other parts of the app will continue to work.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-2 text-red-700 dark:text-red-300"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reload
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;