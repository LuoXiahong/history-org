# REQ-0013: Frontend Architecture Improvements

| Field | Value |
|-------|-------|
| **Status** | `DONE` |
| **Priority** | Medium |
| **Complexity** | Medium |
| **Estimated Effort** | 6-8 hours |
| **Dependencies** | None |
| **Affects** | Frontend infrastructure (`App.tsx`, layouts, routing) |

---

## 1. Overview

This requirement implements essential frontend architecture patterns to improve reliability, performance, and user experience. It includes error boundaries for graceful error handling, code splitting for faster initial loads, and a toast notification system for user feedback.

## 2. Objectives

- Implement React Error Boundaries using `react-error-boundary`
- Add route-based code splitting with `React.lazy()` and `Suspense`
- Integrate toast notification system using `sonner`
- Create reusable loading states and fallback components
- Improve perceived performance with skeleton loaders

## 3. Scope

### In Scope
- Error boundary wrapper components
- Route-based lazy loading configuration
- Toast notification provider and hooks
- Loading/skeleton components
- Fallback UI for error states

### Out of Scope
- State management library integration
- API client refactoring
- Component library changes
- Authentication UI (handled by REQ-0010 integration)

---

## 4. Technical Specification

### 4.1 Required Dependencies

```bash
npm install react-error-boundary sonner
```

### 4.2 Module Structure

```
frontend/src/
├── components/
│   ├── error/
│   │   ├── ErrorBoundary.tsx
│   │   ├── ErrorFallback.tsx
│   │   └── NotFound.tsx
│   ├── loading/
│   │   ├── PageLoader.tsx
│   │   ├── Skeleton.tsx
│   │   └── SuspenseWrapper.tsx
│   └── feedback/
│       ├── ToastProvider.tsx
│       └── useToast.ts
├── layouts/
│   └── MainLayout.tsx
├── routes/
│   └── routes.tsx
└── App.tsx
```

### 4.3 Error Boundary Components

**Location:** `frontend/src/components/error/ErrorFallback.tsx`

```typescript
import { FallbackProps } from 'react-error-boundary';

interface ErrorFallbackProps extends FallbackProps {
  title?: string;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
}: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Go to homepage
          </button>
        </div>

        {/* Debug Info (development only) */}
        {import.meta.env.DEV && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Technical details
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs text-gray-800 overflow-auto max-h-48">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
```

**Location:** `frontend/src/components/error/ErrorBoundary.tsx`

```typescript
import { ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  onError?: (error: Error, info: { componentStack: string }) => void;
}

export function ErrorBoundary({
  children,
  fallbackTitle,
  onReset,
  onError,
}: ErrorBoundaryProps) {
  const handleError = (error: Error, info: { componentStack: string }) => {
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
```

**Location:** `frontend/src/components/error/NotFound.tsx`

```typescript
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-9xl font-bold text-gray-200">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mt-4 mb-2">
          Page not found
        </h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to home
        </Link>
      </div>
    </div>
  );
}
```

### 4.4 Loading Components

**Location:** `frontend/src/components/loading/PageLoader.tsx`

```typescript
interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
      <div className="relative">
        {/* Spinner */}
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />
      </div>
      <p className="mt-4 text-gray-600 animate-pulse">{message}</p>
    </div>
  );
}
```

**Location:** `frontend/src/components/loading/Skeleton.tsx`

```typescript
import { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  className = '',
  ...props
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses.text} ${className}`}
            style={{
              ...style,
              width: i === lines - 1 ? '75%' : style.width,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      {...props}
    />
  );
}

// Pre-built skeleton patterns
export function CardSkeleton() {
  return (
    <div className="p-4 border rounded-lg space-y-4">
      <Skeleton height={200} />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" lines={3} />
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="70%" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Location:** `frontend/src/components/loading/SuspenseWrapper.tsx`

```typescript
import { ReactNode, Suspense } from 'react';
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
```

### 4.5 Toast Notification System

**Location:** `frontend/src/components/feedback/ToastProvider.tsx`

```typescript
import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          padding: '16px',
          borderRadius: '8px',
        },
        className: 'toast-custom',
      }}
    />
  );
}
```

**Location:** `frontend/src/components/feedback/useToast.ts`

```typescript
import { toast } from 'sonner';

interface ToastOptions {
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const success = (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: options?.duration,
      description: options?.description,
      action: options?.action,
    });
  };

  const error = (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: options?.duration ?? 6000, // Longer duration for errors
      description: options?.description,
      action: options?.action,
    });
  };

  const warning = (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      duration: options?.duration,
      description: options?.description,
      action: options?.action,
    });
  };

  const info = (message: string, options?: ToastOptions) => {
    toast.info(message, {
      duration: options?.duration,
      description: options?.description,
      action: options?.action,
    });
  };

  const loading = (message: string) => {
    return toast.loading(message);
  };

  const dismiss = (toastId?: string | number) => {
    toast.dismiss(toastId);
  };

  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
  ) => {
    return toast.promise(promise, messages);
  };

  return {
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    promise,
  };
}
```

### 4.6 Route Configuration with Lazy Loading

**Location:** `frontend/src/routes/routes.tsx`

```typescript
import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { NotFound } from '../components/error/NotFound';

// Lazy load page components
const HomePage = lazy(() => import('../pages/HomePage'));
const KnowledgePage = lazy(() => import('../pages/KnowledgePage'));
const KnowledgeDetailPage = lazy(() => import('../pages/KnowledgeDetailPage'));
const DocumentsPage = lazy(() => import('../pages/DocumentsPage'));
const EventsPage = lazy(() => import('../pages/EventsPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'knowledge',
        children: [
          {
            index: true,
            element: <KnowledgePage />,
          },
          {
            path: ':id',
            element: <KnowledgeDetailPage />,
          },
        ],
      },
      {
        path: 'documents',
        element: <DocumentsPage />,
      },
      {
        path: 'events',
        element: <EventsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '/auth',
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
];
```

### 4.7 Main Layout with Error Boundary

**Location:** `frontend/src/layouts/MainLayout.tsx`

```typescript
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '../components/error/ErrorBoundary';
import { SuspenseWrapper } from '../components/loading/SuspenseWrapper';
import { useToast } from '../components/feedback/useToast';

export function MainLayout() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <a href="/" className="text-xl font-bold text-gray-900">
                History Org
              </a>
            </div>
            {/* Navigation links would go here */}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary
          fallbackTitle="Something went wrong"
          onError={handleError}
          onReset={handleReset}
        >
          <SuspenseWrapper message="Loading page...">
            <Outlet />
          </SuspenseWrapper>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} History Org. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
```

### 4.8 Updated App.tsx

**Location:** `frontend/src/App.tsx`

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { ToastProvider } from './components/feedback/ToastProvider';
import { PageLoader } from './components/loading/PageLoader';
import { routes } from './routes/routes';

const router = createBrowserRouter(routes);

function App() {
  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <ToastProvider />
      <RouterProvider
        router={router}
        fallbackElement={<PageLoader message="Starting application..." />}
      />
    </ErrorBoundary>
  );
}

export default App;
```

### 4.9 Example Page with Toast Usage

**Location:** `frontend/src/pages/KnowledgePage.tsx` (example)

```typescript
import { useState, useEffect } from 'react';
import { useToast } from '../components/feedback/useToast';
import { ListSkeleton } from '../components/loading/Skeleton';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
}

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const fetchKnowledge = async () => {
    try {
      const response = await fetch('/api/v1/knowledge');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      toast.error('Failed to load knowledge items', {
        description: 'Please try refreshing the page',
        action: {
          label: 'Retry',
          onClick: fetchKnowledge,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const deletePromise = fetch(`/api/v1/knowledge/${id}`, {
      method: 'DELETE',
    });

    toast.promise(deletePromise, {
      loading: 'Deleting...',
      success: 'Item deleted successfully',
      error: 'Failed to delete item',
    });
  };

  if (loading) {
    return <ListSkeleton count={5} />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Knowledge Base</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="text-gray-600 mt-2">{item.content}</p>
            <button
              onClick={() => handleDelete(item.id)}
              className="mt-4 text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. Acceptance Criteria

- [x] Error boundaries catch and display errors gracefully
- [x] Users can recover from errors using "Try again" button
- [x] Route components are lazy loaded (verified in network tab)
- [x] Loading states show skeleton or spinner during lazy load
- [x] Toast notifications appear for success, error, warning, and info
- [x] Toast notifications are dismissible
- [x] Toast promise shows loading → success/error flow
- [x] 404 page displays for unknown routes
- [x] Error details are hidden in production, shown in development
- [x] No white screen of death on component errors

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// ErrorBoundary.test.tsx
describe('ErrorBoundary', () => {
  it('should render children when no error', () => {});
  it('should render fallback when child throws', () => {});
  it('should call onError when error occurs', () => {});
  it('should reset when resetErrorBoundary is called', () => {});
});

// useToast.test.ts
describe('useToast', () => {
  it('should show success toast', () => {});
  it('should show error toast with longer duration', () => {});
  it('should handle promise toast', () => {});
  it('should dismiss toast by id', () => {});
});

// Skeleton.test.tsx
describe('Skeleton', () => {
  it('should render with correct variant classes', () => {});
  it('should render multiple lines', () => {});
});
```

### 6.2 E2E Tests (Playwright)

```typescript
test.describe('Error Handling', () => {
  test('should show error fallback on component error', async ({ page }) => {
    await page.goto('/error-test'); // Special route that throws
    await expect(page.locator('text=Something went wrong')).toBeVisible();
  });

  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    await expect(page.locator('text=Page not found')).toBeVisible();
  });
});

test.describe('Toast Notifications', () => {
  test('should show success toast on action', async ({ page }) => {
    await page.goto('/knowledge');
    await page.click('[data-testid="create-button"]');
    await page.fill('[name="title"]', 'Test');
    await page.click('[type="submit"]');
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});

test.describe('Code Splitting', () => {
  test('should lazy load route components', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => requests.push(req.url()));
    
    await page.goto('/');
    const initialChunks = requests.filter((r) => r.includes('.js'));
    
    await page.click('a[href="/settings"]');
    const settingsChunks = requests.filter(
      (r) => r.includes('.js') && !initialChunks.includes(r)
    );
    
    expect(settingsChunks.length).toBeGreaterThan(0);
  });
});
```

---

## 7. Performance Considerations

### Code Splitting Benefits
- Reduced initial bundle size
- Faster Time to First Contentful Paint (FCP)
- Routes only loaded when needed

### Recommended Chunk Strategy
- One chunk per route
- Shared components in common chunk
- Vendor libraries in separate chunk (configured in Vite)

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['sonner', 'react-error-boundary'],
        },
      },
    },
  },
});
```

---

## 8. References

- [react-error-boundary](https://github.com/bvaughn/react-error-boundary)
- [Sonner Toast](https://sonner.emilkowal.ski/)
- [React Lazy and Suspense](https://react.dev/reference/react/lazy)
- [React Router Code Splitting](https://reactrouter.com/en/main/route/lazy)
- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategy)
