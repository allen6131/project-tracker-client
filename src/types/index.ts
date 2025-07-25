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
  status: 'bidding' | 'started' | 'active' | 'done';
  address?: string;
  master_permit_number?: string;
  electrical_sub_permit?: string;
  customer_id?: number | null;
  customer_name?: string | null;
  main_technician_id?: number | null;
  main_technician_username?: string | null;
  main_technician_email?: string | null;
  created_by: number;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: 'bidding' | 'started' | 'active' | 'done';
  address?: string;
  master_permit_number?: string;
  electrical_sub_permit?: string;
  customer_id?: number | null;
  main_technician_id?: number | null;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: 'bidding' | 'started' | 'active' | 'done';
  address?: string;
  master_permit_number?: string;
  electrical_sub_permit?: string;
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
  folder_id?: number | null;
  folder_name?: string | null;
  created_at: string;
}

// Folder types
export interface ProjectFolder {
  id: number;
  project_id: number;
  name: string;
  is_default: boolean;
  created_by?: number;
  created_at: string;
}

export interface CreateFolderRequest {
  name: string;
}

export interface FoldersResponse {
  folders: ProjectFolder[];
}

// Material types
export interface ProjectMaterial {
  id: number;
  project_id: number;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
  purchase_date?: string;
  notes?: string;
  created_by?: number;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
  receipt_count?: number;
}

// Global materials catalog types
export interface CatalogMaterial {
  id: number;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  standard_cost: number;
  supplier?: string;
  part_number?: string;
  notes?: string;
  is_active: boolean;
  created_by?: number;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCatalogMaterialRequest {
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  standard_cost?: number;
  supplier?: string;
  part_number?: string;
  notes?: string;
}

export interface UpdateCatalogMaterialRequest {
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  standard_cost?: number;
  supplier?: string;
  part_number?: string;
  notes?: string;
  is_active?: boolean;
}

export interface CatalogMaterialsResponse {
  materials: CatalogMaterial[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMaterials: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface MaterialReceipt {
  id: number;
  material_id: number;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by?: number;
  uploaded_by_username?: string;
  created_at: string;
}

export interface CreateMaterialRequest {
  project_id: number;
  description: string;
  quantity: number;
  unit_cost: number;
  supplier?: string;
  purchase_date?: string;
  notes?: string;
}

export interface UpdateMaterialRequest {
  description?: string;
  quantity?: number;
  unit_cost?: number;
  supplier?: string;
  purchase_date?: string;
  notes?: string;
}

export interface MaterialsResponse {
  materials: ProjectMaterial[];
}

export interface ReceiptsResponse {
  receipts: MaterialReceipt[];
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

export interface TodoListWithProject extends TodoList {
  project_name: string;
  project_location: string;
  project_status: string;
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

// RFI types
export interface RFI {
  id: number;
  project_id: number;
  customer_id: number;
  contact_id: number;
  sent_by: number;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  response_needed_by?: string;
  status: 'draft' | 'sent' | 'responded' | 'closed' | 'failed';
  sent_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name?: string;
  first_name?: string;
  last_name?: string;
  contact_email?: string;
  sent_by_username?: string;
}

export interface CreateRFIRequest {
  project_id: number;
  customer_id: number;
  contact_id: number;
  subject: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
  response_needed_by?: string;
}

export interface RFIResponse {
  rfis: RFI[];
}

export interface SendRFIResponse {
  message: string;
  rfi_id: number;
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

// Estimates types
export interface Estimate {
  id: number;
  title: string;
  description?: string;
  project_id: number;
  project_name?: string;
  customer_name?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  total_amount: number;
  document_path?: string;
  notes?: string;
  created_by: number;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEstimateRequest {
  title: string;
  description?: string;
  project_id: number;
  total_amount: number;
  notes?: string;
}

export interface UpdateEstimateRequest {
  title?: string;
  description?: string;
  status?: 'draft' | 'sent' | 'approved' | 'rejected';
  total_amount?: number;
  notes?: string;
}

export interface EstimatesResponse {
  estimates: Estimate[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalEstimates: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Invoices types
export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  created_at?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  title: string;
  description?: string;
  customer_id?: number | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  estimate_id?: number | null;
  project_id?: number | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  due_date?: string | null;
  paid_date?: string | null;
  payment_intent_id?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  stripe_session_id?: string | null;
  notes?: string;
  created_by: number;
  created_by_username?: string;
  estimate_title?: string;
  project_name?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}

export interface CreateInvoiceRequest {
  title: string;
  description?: string;
  customer_id?: number | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  estimate_id?: number | null;
  project_id?: number | null;
  tax_rate?: number;
  due_date?: string | null;
  notes?: string;
  items: InvoiceItem[];
}

export interface UpdateInvoiceRequest {
  title?: string;
  description?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  customer_id?: number | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  tax_rate?: number;
  due_date?: string | null;
  paid_date?: string | null;
  notes?: string;
}

// Payment types
export interface PaymentIntent {
  client_secret: string;
  payment_intent_id: string;
}

export interface CheckoutSession {
  session_id: string;
  url: string;
}

export interface PaymentStatus {
  invoice_status: string;
  payment_status?: string;
  payment_method?: string;
  payment_details?: {
    status: string;
    amount: number;
    currency: string;
    payment_method?: string;
  } | null;
}

export interface CreatePaymentIntentRequest {
  invoice_id: number;
}

export interface CreateCheckoutSessionRequest {
  invoice_id: number;
  success_url: string;
  cancel_url: string;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalInvoices: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Services & Products Catalog
export interface Service {
  id: number;
  name: string;
  description?: string;
  category?: string;
  unit: string; // e.g., 'hour', 'each', 'sq ft', 'linear ft'
  standard_rate: number;
  cost?: number; // internal cost if applicable
  notes?: string;
  is_active: boolean;
  created_by?: number;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  standard_rate?: number;
  cost?: number;
  notes?: string;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  standard_rate?: number;
  cost?: number;
  notes?: string;
  is_active?: boolean;
}

export interface ServicesResponse {
  services: Service[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalServices: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ServiceCategoriesResponse {
  categories: string[];
}

export interface ChangeOrderItem {
  id?: number;
  change_order_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  created_at?: string;
}

export interface ChangeOrder {
  id: number;
  change_order_number: string;
  title: string;
  description?: string;
  project_id: number;
  project_name?: string;
  customer_id?: number | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  justification?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  requested_date?: string | null;
  approved_date?: string | null;
  notes?: string;
  created_by: number;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
  items?: ChangeOrderItem[];
}

export interface CreateChangeOrderRequest {
  title: string;
  description?: string;
  project_id: number;
  customer_id?: number | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  reason?: string;
  justification?: string;
  tax_rate?: number;
  requested_date?: string | null;
  notes?: string;
  items: ChangeOrderItem[];
}

export interface UpdateChangeOrderRequest {
  title?: string;
  description?: string;
  status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled';
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  reason?: string;
  justification?: string;
  tax_rate?: number;
  requested_date?: string | null;
  approved_date?: string | null;
  notes?: string;
}

export interface ChangeOrdersResponse {
  changeOrders: ChangeOrder[];
} 

// Technician Scheduling Types
export interface TechnicianSchedule {
  id: number;
  project_id: number;
  technician_id: number;
  scheduled_date: string;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  technician_name?: string;
  technician_email?: string;
  project_name?: string;
  project_address?: string;
  project_status?: string;
  customer_name?: string;
  created_by_name?: string;
}

export interface CreateTechnicianScheduleRequest {
  project_id: number;
  technician_id: number;
  scheduled_date: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface UpdateTechnicianScheduleRequest {
  project_id?: number;
  technician_id?: number;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface TechnicianSchedulesResponse {
  schedules: TechnicianSchedule[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalSchedules: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CalendarSchedulesResponse {
  schedules: TechnicianSchedule[];
  schedulesByDate: Record<string, TechnicianSchedule[]>;
}

// Project Comments Types
export interface ProjectComment {
  id: number;
  project_id: number;
  user_id: number;
  content: string;
  mentions: number[];
  parent_id?: number | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields from query
  username: string;
  email: string;
  role: 'admin' | 'user';
  mentioned_users: MentionedUser[];
}

export interface MentionedUser {
  id: number;
  username: string;
  email: string;
}

export interface Comment {
  id: number;
  project_id: number;
  user_id: number;
  username: string;
  content: string;
  mentions: number[];
  parent_id: number | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

export interface CompanyProfile {
  id: number;
  company_name: string;
  logo_path?: string | null;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  tax_id?: string | null;
  footer_text?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  content: string;
  mentions?: number[];
  parent_id?: number;
}

export interface UpdateCommentRequest {
  content: string;
  mentions?: number[];
}

export interface CommentsResponse {
  comments: ProjectComment[];
}

export interface MentionableUsersResponse {
  users: User[];
} 