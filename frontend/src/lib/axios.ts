import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Essential for cookies
});

// Response interceptor (for error handling)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors here
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as { message?: string };

      // Handle 401 Unauthorized - token expired or invalid
      if (status === 401) {
        // Clear any remaining localStorage auth data (migration cleanup)
        localStorage.removeItem('history_org_token');
        localStorage.removeItem('history_org_user');

        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }

      // Create a more descriptive error message
      const message =
        data?.message ||
        (status === 401
          ? 'Authentication required'
          : status === 403
            ? 'Access denied'
            : status === 404
              ? 'Resource not found'
              : status === 409
                ? 'Resource already exists'
                : 'An error occurred');

      const enhancedError = new Error(message);
      return Promise.reject(enhancedError);
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error:', error.request);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      // Something else happened
      console.error('Error:', error.message);
      return Promise.reject(error);
    }
  },
);
