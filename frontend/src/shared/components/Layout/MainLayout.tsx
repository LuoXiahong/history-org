import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '../../../components/error/ErrorBoundary';
import { SuspenseWrapper } from '../../../components/loading/SuspenseWrapper';
import { useToast } from '../../../components/feedback/useToast';

interface MainLayoutProps {
  children?: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const toast = useToast();

  const handleError = (error: Error) => {
    toast.error('An error occurred', {
      description: error.message,
    });
  };

  const handleReset = () => {
    // Clear any cached queries or state
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <ErrorBoundary
          fallbackTitle="Something went wrong"
          onError={handleError}
          onReset={handleReset}
        >
          <SuspenseWrapper message="Loading page...">
            {children ?? <Outlet />}
          </SuspenseWrapper>
        </ErrorBoundary>
      </main>
    </div>
  );
}
