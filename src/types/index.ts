export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ msg: string; param: string }>;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UsersResponse {
  users: User[];
  pagination: PaginationInfo;
}

// Project types
export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'started' | 'active' | 'done';
  created_by: number;
  created_by_username?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: 'started' | 'active' | 'done';
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: 'started' | 'active' | 'done';
}

export interface ProjectPaginationInfo {
  currentPage: number;
  totalPages: number;
  totalProjects: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProjectsResponse {
  projects: Project[];
  pagination: ProjectPaginationInfo;
}

// File types
export interface ProjectFile {
  id: number;
  project_id: number;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  is_public: boolean;
  uploaded_by: number;
  created_at: string;
}

// Todo List Types
export interface TodoItem {
  id: number;
  todo_list_id: number;
  content: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TodoList {
  id: number;
  project_id: number;
  title: string;
  created_at: string;
  items: TodoItem[];
} 