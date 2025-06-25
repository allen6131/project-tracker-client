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
  description: string;
  status: 'started' | 'active' | 'done';
  customer_id?: number | null;
  customer_name?: string | null;
  created_by: number;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: 'started' | 'active' | 'done';
  customer_id?: number | null;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: 'started' | 'active' | 'done';
  customer_id?: number | null;
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
  pagination: {
    currentPage: number;
    totalPages: number;
    totalProjects: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
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
  assigned_to?: number | null;
  assigned_username?: string | null;
  assigned_user_role?: 'admin' | 'user' | null;
  due_date?: string | null;
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

// Users for assignment
export interface ActiveUsersResponse {
  users: User[];
}

// Customer types
export interface Customer {
  id: number;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  created_by?: number;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
  contacts?: Contact[];
}

export interface Contact {
  id: number;
  customer_id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  description?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

export interface CreateContactRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  is_primary?: boolean;
  notes?: string;
}

export interface UpdateContactRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  is_primary?: boolean;
  notes?: string;
}

export interface CustomersResponse {
  customers: Customer[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCustomers: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface SimpleCustomersResponse {
  customers: { id: number; name: string }[];
} 