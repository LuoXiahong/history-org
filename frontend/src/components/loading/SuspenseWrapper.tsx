import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { PageLoader } from './PageLoader';

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  message?: string;
}

export function SuspenseWrapper({
  children,
  fallback,
  message,
}: SuspenseWrapperProps) {
  return (
    <Suspense fallback={fallback || <PageLoader message={message} />}>
      {children}
    </Suspense>
  );
}
