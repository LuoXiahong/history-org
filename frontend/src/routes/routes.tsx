import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { NotFound } from '../components/error/NotFound';
import { ProtectedRoute } from '../features/auth';

// Lazy load page components
const Dashboard = lazy(() => import('../pages/Dashboard'));
const UploadPage = lazy(
  () => import('../features/ingestion/pages/UploadPage'),
);
const PeoplePage = lazy(
  () => import('../features/knowledge/pages/PeoplePage'),
);
const PersonDetailsPage = lazy(
  () => import('../features/knowledge/pages/PersonDetailsPage'),
);
const EventsPage = lazy(
  () => import('../features/knowledge/pages/EventsPage'),
);
const SearchPage = lazy(
  () => import('../features/knowledge/pages/SearchPage'),
);
const TimelinePage = lazy(
  () => import('../features/knowledge/pages/TimelinePage'),
);
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));

export const routes: RouteObject[] = [
  // Public routes
  {
    path: 'login',
    element: <LoginPage />,
  },
  {
    path: 'register',
    element: <RegisterPage />,
  },

  // Protected routes
  {
    index: true,
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: 'upload',
    element: (
      <ProtectedRoute>
        <UploadPage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'people',
    element: (
      <ProtectedRoute>
        <PeoplePage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'people/:id',
    element: (
      <ProtectedRoute>
        <PersonDetailsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'events',
    element: (
      <ProtectedRoute>
        <EventsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'search',
    element: (
      <ProtectedRoute>
        <SearchPage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'timeline',
    element: (
      <ProtectedRoute>
        <TimelinePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
];
