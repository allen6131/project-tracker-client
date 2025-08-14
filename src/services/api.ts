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
  ProjectFolder,
  FoldersResponse,
  ProjectMaterial,
  CatalogMaterial,
  CreateCatalogMaterialRequest,
  UpdateCatalogMaterialRequest,
  CatalogMaterialsResponse,
  MaterialReceipt,
  CreateMaterialRequest,
  UpdateMaterialRequest,
  MaterialsResponse,
  ReceiptsResponse,
  TodoList,
  TodoListWithProject,
  TodoItem,
  ActiveUsersResponse,
  Customer,
  Contact,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateContactRequest,
  UpdateContactRequest,
  CustomersResponse,
  SimpleCustomersResponse,
  RFI,
  CreateRFIRequest,
  RFIResponse,
  SendRFIResponse,
  Estimate,
  CreateEstimateRequest,
  UpdateEstimateRequest,
  EstimatesResponse,
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  InvoicesResponse,
  PaymentIntent,
  CheckoutSession,
  PaymentStatus,
  CreatePaymentIntentRequest,
  CreateCheckoutSessionRequest,
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServicesResponse,
  ServiceCategoriesResponse,
  ChangeOrder,
  CreateChangeOrderRequest,
  UpdateChangeOrderRequest,
  ChangeOrdersResponse,
  TechnicianSchedule,
  CreateTechnicianScheduleRequest,
  UpdateTechnicianScheduleRequest,
  TechnicianSchedulesResponse,
  CalendarSchedulesResponse,
  ProjectComment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentsResponse,
  MentionableUsersResponse,
  CompanyProfile
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

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.post('/auth/reset-password', { token, password });
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

  getProjectsByCustomer: async (customerId: number): Promise<{ projects: Project[] }> => {
    const response: AxiosResponse<{ projects: Project[] }> = await api.get(`/projects/customer/${customerId}`);
    return response.data;
  },
};

// Files API
export const filesAPI = {
  getProjectFiles: async (projectId: number): Promise<{ files: ProjectFile[] }> => {
    const response: AxiosResponse<{ files: ProjectFile[] }> = await api.get(`/projects/${projectId}/files`);
    return response.data;
  },

  uploadFile: async (projectId: number, file: File, isPublic: boolean, folderId?: number): Promise<{ file: ProjectFile }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_public', String(isPublic));
    if (folderId) {
      formData.append('folder_id', String(folderId));
    }

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

  moveFile: async (fileId: number, folderId?: number): Promise<{ file: ProjectFile }> => {
    const response: AxiosResponse<{ file: ProjectFile }> = await api.put(`/files/${fileId}/move`, { folder_id: folderId });
    return response.data;
  },

  downloadFile: async (fileId: number): Promise<Blob> => {
    const response: AxiosResponse<Blob> = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }
};

// Folders API
export const foldersAPI = {
  getProjectFolders: async (projectId: number): Promise<FoldersResponse> => {
    const response: AxiosResponse<FoldersResponse> = await api.get(`/projects/${projectId}/folders`);
    return response.data;
  },

  createFolder: async (projectId: number, name: string): Promise<{ folder: ProjectFolder }> => {
    const response: AxiosResponse<{ folder: ProjectFolder }> = await api.post(`/projects/${projectId}/folders`, { name });
    return response.data;
  },

  deleteFolder: async (projectId: number, folderId: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/projects/${projectId}/folders/${folderId}`);
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

  getAllTodoLists: async (): Promise<{ todoLists: TodoListWithProject[] }> => {
    const response = await api.get('/todolists/all');
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
  createTodoItem: async (listId: number, content: string, assignedTo?: number | null, dueDate?: string | null): Promise<TodoItem> => {
    const response = await api.post(`/todolists/${listId}/items`, { 
      content, 
      assigned_to: assignedTo,
      due_date: dueDate
    });
    return response.data;
  },

  updateTodoItem: async (itemId: number, updates: { 
    content?: string; 
    is_completed?: boolean; 
    assigned_to?: number | null;
    due_date?: string | null;
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

// Customers API
export const customersAPI = {
  getCustomers: async (page = 1, limit = 10, search = ''): Promise<CustomersResponse> => {
    const response: AxiosResponse<CustomersResponse> = await api.get('/customers', {
      params: { page, limit, search },
    });
    return response.data;
  },

  getSimpleCustomers: async (): Promise<SimpleCustomersResponse> => {
    const response: AxiosResponse<SimpleCustomersResponse> = await api.get('/customers/simple');
    return response.data;
  },

  createCustomer: async (customerData: CreateCustomerRequest): Promise<{ customer: Customer; message: string }> => {
    const response: AxiosResponse<{ customer: Customer; message: string }> = await api.post('/customers', customerData);
    return response.data;
  },

  getCustomer: async (id: number): Promise<{ customer: Customer }> => {
    const response: AxiosResponse<{ customer: Customer }> = await api.get(`/customers/${id}`);
    return response.data;
  },

  updateCustomer: async (id: number, customerData: UpdateCustomerRequest): Promise<{ customer: Customer; message: string }> => {
    const response: AxiosResponse<{ customer: Customer; message: string }> = await api.put(`/customers/${id}`, customerData);
    return response.data;
  },

  deleteCustomer: async (id: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/customers/${id}`);
    return response.data;
  },

  getCustomerContacts: async (customerId: number): Promise<{ contacts: Contact[] }> => {
    const response: AxiosResponse<{ contacts: Contact[] }> = await api.get(`/customers/${customerId}/contacts`);
    return response.data;
  },

  // Contact methods
  createContact: async (customerId: number, contactData: CreateContactRequest): Promise<{ contact: Contact; message: string }> => {
    const response: AxiosResponse<{ contact: Contact; message: string }> = await api.post(`/customers/${customerId}/contacts`, contactData);
    return response.data;
  },

  updateContact: async (customerId: number, contactId: number, contactData: UpdateContactRequest): Promise<{ contact: Contact; message: string }> => {
    const response: AxiosResponse<{ contact: Contact; message: string }> = await api.put(`/customers/${customerId}/contacts/${contactId}`, contactData);
    return response.data;
  },

  deleteContact: async (customerId: number, contactId: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/customers/${customerId}/contacts/${contactId}`);
    return response.data;
  },
};

// RFI API
export const rfiAPI = {
  // Create RFI (draft or send immediately)
  createRFI: async (rfiData: CreateRFIRequest & { action: 'draft' | 'send' }): Promise<SendRFIResponse> => {
    const response: AxiosResponse<SendRFIResponse> = await api.post('/rfi/create', rfiData);
    return response.data;
  },

  // Send existing draft RFI
  sendRFI: async (rfiId: number, recipientEmail?: string): Promise<SendRFIResponse> => {
    const response: AxiosResponse<SendRFIResponse> = await api.post(`/rfi/send/${rfiId}`, recipientEmail ? { recipient_email: recipientEmail } : {});
    return response.data;
  },

  // Update RFI (only drafts)
  updateRFI: async (rfiId: number, data: Partial<CreateRFIRequest>): Promise<{ message: string; rfi: RFI }> => {
    const response: AxiosResponse<{ message: string; rfi: RFI }> = await api.put(`/rfi/${rfiId}`, data);
    return response.data;
  },

  getRFIHistory: async (projectId: number): Promise<RFIResponse> => {
    const response: AxiosResponse<RFIResponse> = await api.get(`/rfi/project/${projectId}`);
    return response.data;
  },
  // Global list
  getRFIs: async (page = 1, limit = 10, search = '', status = ''): Promise<{ rfis: RFI[]; pagination: any }> => {
    const response: AxiosResponse<{ rfis: RFI[]; pagination: any }> = await api.get('/rfi', {
      params: { page, limit, search, status },
    });
    return response.data;
  },
  // View/Download PDF
  viewRFIPDF: async (id: number): Promise<string> => {
    const response: AxiosResponse<Blob> = await api.get(`/rfi/${id}/pdf`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },
  downloadRFIPDF: async (id: number): Promise<Blob> => {
    const response: AxiosResponse<Blob> = await api.get(`/rfi/${id}/download`, { responseType: 'blob' });
    return response.data;
  },
};

// Estimates API
export const estimatesAPI = {
  getEstimates: async (page = 1, limit = 10, search = '', status = '', project_id = ''): Promise<EstimatesResponse> => {
    const response: AxiosResponse<EstimatesResponse> = await api.get('/estimates', {
      params: { page, limit, search, status, project_id },
    });
    return response.data;
  },

  getProjectEstimates: async (projectId: number): Promise<{ estimates: Estimate[] }> => {
    const response: AxiosResponse<{ estimates: Estimate[] }> = await api.get(`/estimates/project/${projectId}`);
    return response.data;
  },

  createEstimate: async (estimateData: CreateEstimateRequest): Promise<{ estimate: Estimate; message: string }> => {
    const response: AxiosResponse<{ estimate: Estimate; message: string }> = await api.post('/estimates', estimateData);
    return response.data;
  },

  getEstimate: async (id: number): Promise<{ estimate: Estimate }> => {
    const response: AxiosResponse<{ estimate: Estimate }> = await api.get(`/estimates/${id}`);
    return response.data;
  },

  updateEstimate: async (id: number, estimateData: UpdateEstimateRequest): Promise<{ estimate: Estimate; message: string }> => {
    const response: AxiosResponse<{ estimate: Estimate; message: string }> = await api.put(`/estimates/${id}`, estimateData);
    return response.data;
  },

  deleteEstimate: async (id: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/estimates/${id}`);
    return response.data;
  },

  downloadEstimate: async (id: number): Promise<Blob> => {
    try {
      const response: AxiosResponse<Blob> = await api.get(`/estimates/${id}/download`, {
        responseType: 'blob',
      });
      
      // Check if the response is actually a blob and not an error
      if (response.data.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      return response.data;
    } catch (error: any) {
      // If the error response is JSON, it means the server returned an error message
      if (error.response && error.response.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Failed to download estimate');
        } catch (parseError) {
          // If we can't parse the error, throw the original error
          throw error;
        }
      }
      throw error;
    }
  },

  downloadEstimatePDF: async (id: number): Promise<Blob> => {
    try {
      const response: AxiosResponse<Blob> = await api.get(`/estimates/${id}/pdf`, {
        responseType: 'blob',
      });
      
      // Check if the response is actually a blob and not an error
      if (response.data.size === 0) {
        throw new Error('Downloaded PDF is empty');
      }
      
      return response.data;
    } catch (error: any) {
      // If the error response is JSON, it means the server returned an error message
      if (error.response && error.response.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Failed to download estimate PDF');
        } catch (parseError) {
          // If we can't parse the error, throw the original error
          throw error;
        }
      }
      throw error;
    }
  },

  viewEstimatePDF: async (id: number): Promise<string> => {
    const response: AxiosResponse<Blob> = await api.get(`/estimates/${id}/view`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },

  regenerateEstimatePDF: async (id: number): Promise<{ message: string; pdf_path: string }> => {
    const response: AxiosResponse<{ message: string; pdf_path: string }> = await api.post(`/estimates/${id}/regenerate-pdf`);
    return response.data;
  },

  sendEstimateEmail: async (id: number, emailData: { recipient_email: string; sender_name?: string }): Promise<{ message: string; recipient: string }> => {
    const response: AxiosResponse<{ message: string; recipient: string }> = await api.post(`/estimates/${id}/send-email`, emailData);
    return response.data;
  },
};

// Invoices API
export const invoicesAPI = {
  getInvoices: async (page = 1, limit = 10, search = '', status = ''): Promise<InvoicesResponse> => {
    const response: AxiosResponse<InvoicesResponse> = await api.get('/invoices', {
      params: { page, limit, search, status },
    });
    return response.data;
  },

  getProjectInvoices: async (projectId: number): Promise<{ invoices: Invoice[] }> => {
    const response: AxiosResponse<{ invoices: Invoice[] }> = await api.get(`/invoices/project/${projectId}`);
    return response.data;
  },

  createInvoice: async (invoiceData: CreateInvoiceRequest): Promise<{ invoice: Invoice; message: string }> => {
    const response: AxiosResponse<{ invoice: Invoice; message: string }> = await api.post('/invoices', invoiceData);
    return response.data;
  },

  createInvoiceFromEstimate: async (estimateId: number, invoiceData: { title?: string; due_date?: string; percentage?: number; amount?: number }): Promise<{ invoice: Invoice; message: string }> => {
    const response: AxiosResponse<{ invoice: Invoice; message: string }> = await api.post(`/invoices/from-estimate/${estimateId}`, invoiceData);
    return response.data;
  },

  getInvoice: async (id: number): Promise<{ invoice: Invoice }> => {
    const response: AxiosResponse<{ invoice: Invoice }> = await api.get(`/invoices/${id}`);
    return response.data;
  },

  updateInvoice: async (id: number, invoiceData: UpdateInvoiceRequest): Promise<{ invoice: Invoice; message: string }> => {
    const response: AxiosResponse<{ invoice: Invoice; message: string }> = await api.put(`/invoices/${id}`, invoiceData);
    return response.data;
  },

  deleteInvoice: async (id: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/invoices/${id}`);
    return response.data;
  },

  downloadInvoicePDF: async (id: number): Promise<Blob> => {
    const response: AxiosResponse<Blob> = await api.get(`/invoices/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  viewInvoicePDF: async (id: number): Promise<string> => {
    const response: AxiosResponse<Blob> = await api.get(`/invoices/${id}/view`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },

  regenerateInvoicePDF: async (id: number): Promise<{ message: string; pdf_path: string }> => {
    const response: AxiosResponse<{ message: string; pdf_path: string }> = await api.post(`/invoices/${id}/regenerate-pdf`);
    return response.data;
  },

  sendInvoiceEmail: async (id: number, emailData: { recipient_email: string; sender_name: string }): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.post(`/invoices/${id}/send-email`, emailData);
    return response.data;
  },
};

// Payments API
export const paymentsAPI = {
  createPaymentIntent: async (data: CreatePaymentIntentRequest): Promise<PaymentIntent> => {
    const response: AxiosResponse<PaymentIntent> = await api.post('/payments/create-payment-intent', data);
    return response.data;
  },

  createCheckoutSession: async (data: CreateCheckoutSessionRequest): Promise<CheckoutSession> => {
    const response: AxiosResponse<CheckoutSession> = await api.post('/payments/create-checkout-session', data);
    return response.data;
  },

  getPaymentStatus: async (invoiceId: number): Promise<PaymentStatus> => {
    const response: AxiosResponse<PaymentStatus> = await api.get(`/payments/payment-status/${invoiceId}`);
    return response.data;
  },

  getPublicKey: async (): Promise<{ publishable_key: string }> => {
    const response: AxiosResponse<{ publishable_key: string }> = await api.get('/payments/public-key');
    return response.data;
  },
};

// Materials API
export const materialsAPI = {
  getProjectMaterials: async (projectId: number): Promise<MaterialsResponse> => {
    const response: AxiosResponse<MaterialsResponse> = await api.get(`/materials/project/${projectId}`);
    return response.data;
  },

  createMaterial: async (materialData: CreateMaterialRequest): Promise<{ material: ProjectMaterial }> => {
    const response: AxiosResponse<{ material: ProjectMaterial }> = await api.post('/materials', materialData);
    return response.data;
  },

  updateMaterial: async (materialId: number, materialData: UpdateMaterialRequest): Promise<{ material: ProjectMaterial }> => {
    const response: AxiosResponse<{ material: ProjectMaterial }> = await api.put(`/materials/${materialId}`, materialData);
    return response.data;
  },

  deleteMaterial: async (materialId: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/materials/${materialId}`);
    return response.data;
  },

  uploadReceipt: async (materialId: number, receiptFile: File): Promise<{ receipt: MaterialReceipt }> => {
    const formData = new FormData();
    formData.append('receipt', receiptFile);

    const response: AxiosResponse<{ receipt: MaterialReceipt }> = await api.post(
      `/materials/${materialId}/receipts`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  getMaterialReceipts: async (materialId: number): Promise<ReceiptsResponse> => {
    const response: AxiosResponse<ReceiptsResponse> = await api.get(`/materials/${materialId}/receipts`);
    return response.data;
  },

  downloadReceipt: async (receiptId: number): Promise<Blob> => {
    const response: AxiosResponse<Blob> = await api.get(`/materials/receipts/${receiptId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteReceipt: async (receiptId: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/materials/receipts/${receiptId}`);
    return response.data;
  }
};

// Catalog Materials API
export const catalogMaterialsAPI = {
  getCatalogMaterials: async (page = 1, limit = 50, search = '', category = '', activeOnly = true): Promise<CatalogMaterialsResponse> => {
    const response: AxiosResponse<CatalogMaterialsResponse> = await api.get('/catalog-materials', {
      params: { page, limit, search, category, active_only: activeOnly },
    });
    return response.data;
  },

  getCategories: async (): Promise<{ categories: string[] }> => {
    const response: AxiosResponse<{ categories: string[] }> = await api.get('/catalog-materials/categories');
    return response.data;
  },

  getCatalogMaterial: async (materialId: number): Promise<{ material: CatalogMaterial }> => {
    const response: AxiosResponse<{ material: CatalogMaterial }> = await api.get(`/catalog-materials/${materialId}`);
    return response.data;
  },

  createCatalogMaterial: async (materialData: CreateCatalogMaterialRequest): Promise<{ material: CatalogMaterial; message: string }> => {
    const response: AxiosResponse<{ material: CatalogMaterial; message: string }> = await api.post('/catalog-materials', materialData);
    return response.data;
  },

  updateCatalogMaterial: async (materialId: number, materialData: UpdateCatalogMaterialRequest): Promise<{ material: CatalogMaterial; message: string }> => {
    const response: AxiosResponse<{ material: CatalogMaterial; message: string }> = await api.put(`/catalog-materials/${materialId}`, materialData);
    return response.data;
  },

  deleteCatalogMaterial: async (materialId: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/catalog-materials/${materialId}`);
    return response.data;
  },
};

// Services API
export const servicesAPI = {
  getServices: async (page = 1, limit = 50, search = '', category = '', activeOnly = true): Promise<ServicesResponse> => {
    const response: AxiosResponse<ServicesResponse> = await api.get('/services', {
      params: { page, limit, search, category, active_only: activeOnly },
    });
    return response.data;
  },

  getCategories: async (): Promise<ServiceCategoriesResponse> => {
    const response: AxiosResponse<ServiceCategoriesResponse> = await api.get('/services/categories');
    return response.data;
  },

  getService: async (serviceId: number): Promise<{ service: Service }> => {
    const response: AxiosResponse<{ service: Service }> = await api.get(`/services/${serviceId}`);
    return response.data;
  },

  createService: async (serviceData: CreateServiceRequest): Promise<{ service: Service; message: string }> => {
    const response: AxiosResponse<{ service: Service; message: string }> = await api.post('/services', serviceData);
    return response.data;
  },

  updateService: async (serviceId: number, serviceData: UpdateServiceRequest): Promise<{ service: Service; message: string }> => {
    const response: AxiosResponse<{ service: Service; message: string }> = await api.put(`/services/${serviceId}`, serviceData);
    return response.data;
  },

  deleteService: async (serviceId: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/services/${serviceId}`);
    return response.data;
  },
};

// Change Orders API
export const changeOrdersAPI = {
  // Get change orders for a project
  getProjectChangeOrders: async (projectId: number): Promise<ChangeOrdersResponse> => {
    const response = await api.get(`/change-orders/project/${projectId}`);
    return response.data;
  },

  // Get single change order
  getChangeOrder: async (id: number): Promise<{ changeOrder: ChangeOrder }> => {
    const response = await api.get(`/change-orders/${id}`);
    return response.data;
  },

  // Create change order
  createChangeOrder: async (data: CreateChangeOrderRequest): Promise<{ message: string; changeOrder: ChangeOrder }> => {
    const response = await api.post('/change-orders', data);
    return response.data;
  },

  // Update change order
  updateChangeOrder: async (id: number, data: UpdateChangeOrderRequest): Promise<{ message: string; changeOrder: ChangeOrder }> => {
    const response = await api.put(`/change-orders/${id}`, data);
    return response.data;
  },

  // Delete change order
  deleteChangeOrder: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/change-orders/${id}`);
    return response.data;
  },

  // Send change order email
  sendChangeOrderEmail: async (id: number, emailData: { recipient_email: string; sender_name?: string }): Promise<{ message: string }> => {
    const response = await api.post(`/change-orders/${id}/send-email`, emailData);
    return response.data;
  },

  // View change order PDF
  viewChangeOrderPDF: async (id: number): Promise<string> => {
    const response: AxiosResponse<Blob> = await api.get(`/change-orders/${id}/view`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },

  // Download change order PDF
  downloadChangeOrderPDF: async (id: number): Promise<Blob> => {
    const response: AxiosResponse<Blob> = await api.get(`/change-orders/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Regenerate change order PDF
  regenerateChangeOrderPDF: async (id: number): Promise<{ message: string; pdf_path: string }> => {
    const response: AxiosResponse<{ message: string; pdf_path: string }> = await api.post(`/change-orders/${id}/regenerate-pdf`);
    return response.data;
  }
};

// Schedules API
export const schedulesAPI = {
  // Get schedules with filtering
  getSchedules: async (filters?: {
    startDate?: string;
    endDate?: string;
    technicianId?: number;
    projectId?: number;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<TechnicianSchedulesResponse> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.technicianId) params.append('technicianId', filters.technicianId.toString());
    if (filters?.projectId) params.append('projectId', filters.projectId.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get(`/schedules?${params.toString()}`);
    return response.data;
  },

  // Get calendar schedules
  getCalendarSchedules: async (startDate: string, endDate: string, view?: string): Promise<CalendarSchedulesResponse> => {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    if (view) params.append('view', view);
    
    const response = await api.get(`/schedules/calendar?${params.toString()}`);
    return response.data;
  },

  // Create schedule
  createSchedule: async (data: CreateTechnicianScheduleRequest): Promise<TechnicianSchedule> => {
    const response = await api.post('/schedules', data);
    return response.data;
  },

  // Update schedule
  updateSchedule: async (id: number, data: UpdateTechnicianScheduleRequest): Promise<TechnicianSchedule> => {
    const response = await api.put(`/schedules/${id}`, data);
    return response.data;
  },

  // Delete schedule
  deleteSchedule: async (id: number): Promise<void> => {
    await api.delete(`/schedules/${id}`);
  }
};

// Project Comments API
export const commentsAPI = {
  // Get project comments
  getProjectComments: async (projectId: number): Promise<CommentsResponse> => {
    const response = await api.get(`/project-comments/${projectId}/comments`);
    return response.data;
  },

  // Create comment
  createComment: async (projectId: number, data: CreateCommentRequest): Promise<ProjectComment> => {
    const response = await api.post(`/project-comments/${projectId}/comments`, data);
    return response.data.comment;
  },

  // Update comment
  updateComment: async (commentId: number, data: UpdateCommentRequest): Promise<ProjectComment> => {
    const response = await api.put(`/project-comments/comments/${commentId}`, data);
    return response.data.comment;
  },

  // Delete comment
  deleteComment: async (commentId: number): Promise<void> => {
    await api.delete(`/project-comments/comments/${commentId}`);
  },

  // Get mentionable users for a project
  getMentionableUsers: async (projectId: number): Promise<MentionableUsersResponse> => {
    const response = await api.get(`/project-comments/${projectId}/users`);
    return response.data;
  }
};

// Company Profile API
export const companyProfileAPI = {
  getProfile: async (): Promise<{ profile: CompanyProfile }> => {
    const response = await api.get('/company-profile');
    return response.data;
  },

  updateProfile: async (data: FormData): Promise<{ profile: CompanyProfile; message: string }> => {
    const response = await api.put('/company-profile', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteLogo: async (): Promise<{ message: string }> => {
    const response = await api.delete('/company-profile/logo');
    return response.data;
  },

  getStatuses: async (): Promise<{ statuses: string[] }> => {
    const response = await api.get('/company-profile/statuses');
    return response.data;
  },
};

// Combined export for compatibility
const apiService = {
  ...authAPI,
  ...usersAPI,
  ...projectsAPI,
  ...filesAPI,
  ...foldersAPI,
  ...todoAPI,
  ...healthAPI,
  ...customersAPI,
  ...rfiAPI,
  ...estimatesAPI,
  ...invoicesAPI,
  ...paymentsAPI,
  ...materialsAPI,
  ...catalogMaterialsAPI,
  ...servicesAPI,
  ...changeOrdersAPI,
  ...schedulesAPI,
  ...commentsAPI,
  ...companyProfileAPI
};

export default apiService; 