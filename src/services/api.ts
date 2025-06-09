import axios, { AxiosResponse } from 'axios';
import { 
  LoginRequest, 
  LoginResponse, 
  User, 
  CreateUserRequest, 
  UpdateUserRequest,
  UsersResponse,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectsResponse
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response: AxiosResponse<LoginResponse> = await api.post('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response: AxiosResponse<{ user: User }> = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async (): Promise<{ token: string }> => {
    const response: AxiosResponse<{ token: string }> = await api.post('/auth/refresh');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getUsers: async (page = 1, limit = 10, search = ''): Promise<UsersResponse> => {
    const response: AxiosResponse<UsersResponse> = await api.get('/users', {
      params: { page, limit, search },
    });
    return response.data;
  },

  createUser: async (userData: CreateUserRequest): Promise<{ user: User; message: string }> => {
    const response: AxiosResponse<{ user: User; message: string }> = await api.post('/users', userData);
    return response.data;
  },

  getUser: async (id: number): Promise<{ user: User }> => {
    const response: AxiosResponse<{ user: User }> = await api.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id: number, userData: UpdateUserRequest): Promise<{ user: User; message: string }> => {
    const response: AxiosResponse<{ user: User; message: string }> = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// Projects API
export const projectsAPI = {
  getProjects: async (page = 1, limit = 10, search = '', status = ''): Promise<ProjectsResponse> => {
    const response: AxiosResponse<ProjectsResponse> = await api.get('/projects', {
      params: { page, limit, search, status },
    });
    return response.data;
  },

  createProject: async (projectData: CreateProjectRequest): Promise<{ project: Project; message: string }> => {
    const response: AxiosResponse<{ project: Project; message: string }> = await api.post('/projects', projectData);
    return response.data;
  },

  getProject: async (id: number): Promise<{ project: Project }> => {
    const response: AxiosResponse<{ project: Project }> = await api.get(`/projects/${id}`);
    return response.data;
  },

  updateProject: async (id: number, projectData: UpdateProjectRequest): Promise<{ project: Project; message: string }> => {
    const response: AxiosResponse<{ project: Project; message: string }> = await api.put(`/projects/${id}`, projectData);
    return response.data;
  },

  deleteProject: async (id: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/projects/${id}`);
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async (): Promise<{ status: string; timestamp: string }> => {
    const response: AxiosResponse<{ status: string; timestamp: string }> = await api.get('/health');
    return response.data;
  },
};

export default api; 