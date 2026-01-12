import { apiClient } from '../../../lib/axios';
import type {
  LoginCredentials,
  RegisterCredentials,
  User,
} from '../types/auth.types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    const response = await apiClient.post<User>('/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
