import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { ToastProvider } from './components/feedback/ToastProvider';
import { MainLayout } from './shared/components/Layout/MainLayout';
import { AuthProvider } from './features/auth';
import { routes } from './routes/routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: routes,
  },
]);

function App() {
  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider />
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
