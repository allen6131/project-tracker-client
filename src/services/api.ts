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
  ServiceCategoriesResponse
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
  sendRFI: async (rfiData: CreateRFIRequest): Promise<SendRFIResponse> => {
    const response: AxiosResponse<SendRFIResponse> = await api.post('/rfi/send', rfiData);
    return response.data;
  },

  getRFIHistory: async (projectId: number): Promise<RFIResponse> => {
    const response: AxiosResponse<RFIResponse> = await api.get(`/rfi/project/${projectId}`);
    return response.data;
  },
};

// Estimates API
export const estimatesAPI = {
  getEstimates: async (page = 1, limit = 10, search = '', status = ''): Promise<EstimatesResponse> => {
    const response: AxiosResponse<EstimatesResponse> = await api.get('/estimates', {
      params: { page, limit, search, status },
    });
    return response.data;
  },

  getCustomerEstimates: async (customerId: number): Promise<{ estimates: Estimate[] }> => {
    const response: AxiosResponse<{ estimates: Estimate[] }> = await api.get(`/estimates/customer/${customerId}`);
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

  createProjectFromEstimate: async (id: number, projectData: { project_name: string; project_description?: string }): Promise<{ project: Project; message: string; estimate_id: number }> => {
    const response: AxiosResponse<{ project: Project; message: string; estimate_id: number }> = await api.post(`/estimates/${id}/create-project`, projectData);
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

  createInvoiceFromEstimate: async (estimateId: number, invoiceData: { title?: string; due_date?: string }): Promise<{ invoice: Invoice; message: string }> => {
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

export default api; 