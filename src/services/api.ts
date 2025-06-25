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
  ProjectsResponse,
  ProjectFile,
  TodoList,
  TodoItem,
  ActiveUsersResponse
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://project-tracker-server-f1d3541c891e.herokuapp.com/api';

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

  getActiveUsers: async (): Promise<ActiveUsersResponse> => {
    const response: AxiosResponse<ActiveUsersResponse> = await api.get('/users/active');
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

// Files API
export const filesAPI = {
  getProjectFiles: async (projectId: number): Promise<{ files: ProjectFile[] }> => {
    const response: AxiosResponse<{ files: ProjectFile[] }> = await api.get(`/projects/${projectId}/files`);
    return response.data;
  },

  uploadFile: async (projectId: number, file: File, isPublic: boolean): Promise<{ file: ProjectFile }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_public', String(isPublic));

    const response: AxiosResponse<{ file: ProjectFile }> = await api.post(
      `/projects/${projectId}/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  deleteFile: async (fileId: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/files/${fileId}`);
    return response.data;
  },

  updateFile: async (fileId: number, isPublic: boolean): Promise<{ file: ProjectFile }> => {
    const response: AxiosResponse<{ file: ProjectFile }> = await api.put(`/files/${fileId}`, { is_public: isPublic });
    return response.data;
  },

  downloadFile: async (fileId: number): Promise<Blob> => {
    const response: AxiosResponse<Blob> = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }
};

// Todo API
export const todoAPI = {
  // --- Todo List Methods ---
  getTodoLists: async (projectId: number): Promise<TodoList[]> => {
    const response = await api.get(`/projects/${projectId}/todolists`);
    return response.data;
  },

  createTodoList: async (projectId: number, title: string): Promise<TodoList> => {
    const response = await api.post(`/projects/${projectId}/todolists`, { title });
    return response.data;
  },

  updateTodoList: async (listId: number, title: string): Promise<TodoList> => {
    const response = await api.put(`/todolists/${listId}`, { title });
    return response.data;
  },

  deleteTodoList: async (listId: number): Promise<void> => {
    await api.delete(`/todolists/${listId}`);
  },

  // --- Todo Item Methods ---
  createTodoItem: async (listId: number, content: string, assignedTo?: number | null): Promise<TodoItem> => {
    const response = await api.post(`/todolists/${listId}/items`, { 
      content, 
      assigned_to: assignedTo 
    });
    return response.data;
  },

  updateTodoItem: async (itemId: number, updates: { 
    content?: string; 
    is_completed?: boolean; 
    assigned_to?: number | null 
  }): Promise<TodoItem> => {
    const response = await api.put(`/todoitems/${itemId}`, updates);
    return response.data;
  },

  deleteTodoItem: async (itemId: number): Promise<void> => {
    await api.delete(`/todoitems/${itemId}`);
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