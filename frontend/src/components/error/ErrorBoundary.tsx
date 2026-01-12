import type { ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  onError?: (error: Error, info: { componentStack?: string | null }) => void;
}

export function ErrorBoundary({
  children,
  fallbackTitle,
  onReset,
  onError,
}: ErrorBoundaryProps) {
  const handleError = (error: Error, info: { componentStack?: string | null }) => {
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, info);
    
    // Call custom error handler if provided
    onError?.(error, info);
  };

  const handleReset = () => {
    // Clear any cached data or state
    onReset?.();
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => (
        <ErrorFallback {...props} title={fallbackTitle} />
      )}
      onError={handleError}
      onReset={handleReset}
    >
      {children}
    </ReactErrorBoundary>
  );
}
