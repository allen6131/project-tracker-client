import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Invoice, 
  CreateInvoiceRequest, 
  UpdateInvoiceRequest,
  InvoiceItem,
  SimpleCustomersResponse,
  Estimate,
  Project
} from '../types';
import { invoicesAPI, customersAPI, estimatesAPI, projectsAPI } from '../services/api';
import PaymentForm from '../components/PaymentForm';

const Invoices: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [showEstimateSelector, setShowEstimateSelector] = useState(false);
  const [showPercentageModal, setShowPercentageModal] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Payment state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  
  // Email state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailingInvoice, setEmailingInvoice] = useState<Invoice | null>(null);
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    sender_name: ''
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailPreviewTab, setEmailPreviewTab] = useState<'email' | 'pdf'>('email');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Percentage form state
  const [percentageData, setPercentageData] = useState({
    percentage: '',
    title: '',
    due_date: ''
  });
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_id: null as number | null,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    estimate_id: null as number | null,
    project_id: null as number | null,
    tax_rate: 0,
    due_date: '',
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  });
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0 }
  ]);
  
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string; status: string }[]>([]);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);

  // Load invoices and data
  useEffect(() => {
    loadInvoices();
    loadCustomers();
    loadEstimates();
    loadProjects();
  }, [currentPage, searchTerm, statusFilter]);

  // Client-side filtering for customer
  useEffect(() => {
    if (!customerFilter) {
      setFilteredInvoices(invoices);
    } else {
      const filtered = invoices.filter(invoice => 
        invoice.customer_name && invoice.customer_name.toLowerCase().includes(customerFilter.toLowerCase())
      );
      setFilteredInvoices(filtered);
    }
  }, [invoices, customerFilter]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = (invoiceId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDropdownId(openDropdownId === invoiceId ? null : invoiceId);
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoicesAPI.getInvoices(currentPage, 10, searchTerm, statusFilter);
      setInvoices(response.invoices);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getSimpleCustomers();
      setCustomers(response.customers);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const loadEstimates = async () => {
    try {
      const response = await estimatesAPI.getEstimates(1, 100, '', 'approved');
      setEstimates(response.estimates);
    } catch (err) {
      console.error('Failed to load estimates:', err);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getProjects(1, 100, '', 'active');
      setProjects(response.projects.map((p: Project) => ({ id: p.id, name: p.name, status: p.status })));
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      customer_id: null,
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_address: '',
      estimate_id: null,
      project_id: null,
      tax_rate: 0,
      due_date: '',
      notes: '',
      status: 'draft'
    });
    setItems([{ description: '', quantity: 1, unit_price: 0 }]);
  };

  const resetPercentageForm = () => {
    setPercentageData({
      percentage: '',
      title: '',
      due_date: ''
    });
  };

  const handleCreateInvoice = () => {
    clearMessages();
    resetForm();
    setEditingInvoice(null);
    setShowForm(true);
  };

  const handleCreateFromEstimate = () => {
    clearMessages();
    setShowEstimateSelector(true);
  };

  const handleEstimateSelect = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setShowEstimateSelector(false);
    
    // Pre-fill percentage form with estimate data
    setPercentageData({
      percentage: '',
      title: `Partial Invoice - ${estimate.title}`,
      due_date: ''
    });
    
    setShowPercentageModal(true);
  };

  const handlePercentageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEstimate) return;
    
    const percentage = parseFloat(percentageData.percentage);
    
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      setError('Please enter a valid percentage between 1 and 100');
      return;
    }
    
    try {
      setFormLoading(true);
      clearMessages();
      
      // Calculate the invoice amount based on percentage
      const invoiceAmount = (selectedEstimate.total_amount * percentage) / 100;
      
      const invoiceData = {
        title: percentageData.title || `${percentage}% of ${selectedEstimate.title}`,
        due_date: percentageData.due_date || undefined,
        percentage: percentage,
        amount: invoiceAmount
      };
      
      const response = await invoicesAPI.createInvoiceFromEstimate(selectedEstimate.id, invoiceData);
      setSuccess(`Invoice created successfully for ${percentage}% (${invoiceAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}) of estimate "${selectedEstimate.title}"`);
      
      setShowPercentageModal(false);
      setSelectedEstimate(null);
      resetPercentageForm();
      loadInvoices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create invoice from estimate');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    clearMessages();
    setEditingInvoice(invoice);
    setFormData({
      title: invoice.title,
      description: invoice.description || '',
      customer_id: invoice.customer_id ?? null,
      customer_name: invoice.customer_name || '',
      customer_email: invoice.customer_email || '',
      customer_phone: invoice.customer_phone || '',
      customer_address: invoice.customer_address || '',
      estimate_id: invoice.estimate_id ?? null,
      project_id: invoice.project_id ?? null,
      tax_rate: invoice.tax_rate,
      due_date: invoice.due_date || '',
      notes: invoice.notes || '',
      status: invoice.status
    });
    setItems(invoice.items || [{ description: '', quantity: 1, unit_price: 0 }]);
    setShowForm(true);
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoicesAPI.deleteInvoice(invoiceId);
        setSuccess('Invoice deleted successfully');
        loadInvoices();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete invoice');
      }
    }
  };

  const handleQuickStatusUpdate = async (invoiceId: number, newStatus: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled') => {
    try {
      await invoicesAPI.updateInvoice(invoiceId, { status: newStatus });
      setSuccess(`Invoice status updated to ${newStatus}`);
      loadInvoices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handlePayInvoice = (invoice: Invoice) => {
    if (invoice.status === 'paid') {
      setError('Invoice is already paid');
      return;
    }
    if (invoice.status === 'cancelled') {
      setError('Cannot pay a cancelled invoice');
      return;
    }
    clearMessages();
    setPaymentInvoice(invoice);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setPaymentInvoice(null);
    setSuccess('Payment processed successfully! Invoice has been marked as paid.');
    loadInvoices();
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleClosePaymentForm = () => {
    setShowPaymentForm(false);
    setPaymentInvoice(null);
  };

  const handleSendEmail = (invoice: Invoice) => {
    clearMessages();
    setEmailingInvoice(invoice);
    setEmailData({
      recipient_email: invoice.customer_email || invoice.customer_name || '',
      sender_name: user?.username || ''
    });
    
    // Load PDF preview for the email modal
    loadEmailPDFPreview(invoice);
    setShowEmailModal(true);
  };

  const loadEmailPDFPreview = async (invoice: Invoice) => {
    try {
      const url = await invoicesAPI.viewInvoicePDF(invoice.id);
      setPdfUrl(url);
    } catch (err: any) {
      console.error('Failed to load PDF preview for email:', err);
      // Don't show error for PDF preview failure in email context
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailingInvoice) return;

    setEmailLoading(true);
    try {
      await invoicesAPI.sendInvoiceEmail(emailingInvoice.id, emailData);
      setSuccess(`Invoice sent successfully to ${emailData.recipient_email}`);
      setShowEmailModal(false);
      setEmailingInvoice(null);
      setEmailData({ recipient_email: '', sender_name: '' });
      setPdfUrl(null);
      setEmailPreviewTab('email');
      loadInvoices(); // Refresh to show updated status
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      // Clean up the form data by removing null values for optional fields
      const cleanedFormData = { ...formData };
      if (cleanedFormData.customer_id === null) {
        delete (cleanedFormData as any).customer_id;
      }
      if (cleanedFormData.estimate_id === null) {
        delete (cleanedFormData as any).estimate_id;
      }
      if (cleanedFormData.project_id === null) {
        delete (cleanedFormData as any).project_id;
      }
      if (cleanedFormData.due_date === '') {
        delete (cleanedFormData as any).due_date;
      }

      const invoiceData: CreateInvoiceRequest = {
        ...cleanedFormData,
        items: items.filter(item => item.description.trim() !== '')
      };

      if (editingInvoice) {
        await invoicesAPI.updateInvoice(editingInvoice.id, invoiceData);
        setSuccess('Invoice updated successfully');
      } else {
        await invoicesAPI.createInvoice(invoiceData);
        setSuccess('Invoice created successfully');
      }
      
      setShowForm(false);
      resetForm();
      loadInvoices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(String(item.quantity)) * parseFloat(String(item.unit_price)));
    }, 0);
    const taxAmount = subtotal * (formData.tax_rate / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
      case 'sent':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
      case 'paid':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'overdue':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      case 'cancelled':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  const { subtotal, taxAmount, total } = calculateTotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-colors">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Invoices Management</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create and manage customer invoices
              </p>
            </div>
            <div className="space-x-2">
              <button
                onClick={handleCreateFromEstimate}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Create from Estimate
              </button>
              <button
                onClick={handleCreateInvoice}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Create New Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Customers</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.name}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
          <div className="text-center text-gray-900 dark:text-white">Loading invoices...</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {customerFilter ? `No invoices found for customer "${customerFilter}".` : 'No invoices found.'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{invoice.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {invoice.customer_name || 'No customer'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {invoice.project_id ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          Project #{invoice.project_id}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">No project</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(invoice.status)}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${invoice.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'No due date'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative dropdown-container">
                        <button
                          onClick={(e) => toggleDropdown(invoice.id, e)}
                          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        
                        {openDropdownId === invoice.id && (
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleEditInvoice(invoice);
                                  setOpenDropdownId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Edit
                              </button>
                              {invoice.status !== 'cancelled' && (
                                <button
                                  onClick={() => {
                                    handleSendEmail(invoice);
                                    setOpenDropdownId(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                  Send Email
                                </button>
                              )}
                              {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                                <button
                                  onClick={() => {
                                    handlePayInvoice(invoice);
                                    setOpenDropdownId(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                  Pay Invoice
                                </button>
                              )}
                              {invoice.status === 'draft' && (
                                <button
                                  onClick={() => {
                                    handleQuickStatusUpdate(invoice.id, 'sent');
                                    setOpenDropdownId(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                  Mark as Sent
                                </button>
                              )}
                              {invoice.status === 'sent' && (
                                <button
                                  onClick={() => {
                                    handleQuickStatusUpdate(invoice.id, 'paid');
                                    setOpenDropdownId(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  Mark as Paid
                                </button>
                              )}
                              {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                                <button
                                  onClick={() => {
                                    handleQuickStatusUpdate(invoice.id, 'cancelled');
                                    setOpenDropdownId(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  Cancel Invoice
                                </button>
                              )}
                              <hr className="border-gray-200 dark:border-gray-600 my-1" />
                              <button
                                onClick={() => {
                                  handleDeleteInvoice(invoice.id);
                                  setOpenDropdownId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-300'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estimate Selector Modal */}
      {showEstimateSelector && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 transition-colors">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Select Estimate to Create Invoice From
              </h3>
              <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  You can create multiple invoices from the same estimate. Each invoice can be for a different percentage or amount of the total estimate.
                </p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {estimates.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No approved estimates available</p>
                ) : (
                  <div className="space-y-2">
                    {estimates.map((estimate) => (
                      <div key={estimate.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">{estimate.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Project: {estimate.project_name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Customer: {estimate.customer_name || 'No customer'}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                Total: ${estimate.total_amount.toFixed(2)}
                              </p>
                              {estimate.total_invoiced > 0 && (
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                  Invoiced: ${estimate.total_invoiced.toFixed(2)} ({((estimate.total_invoiced / estimate.total_amount) * 100).toFixed(0)}%)
                                </p>
                              )}
                              {estimate.total_paid > 0 && (
                                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                  Paid: ${estimate.total_paid.toFixed(2)} ({((estimate.total_paid / estimate.total_amount) * 100).toFixed(0)}%)
                                </p>
                              )}
                            </div>
                            {estimate.total_invoiced > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center space-x-2">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 max-w-32">
                                    <div 
                                      className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full"
                                      style={{ width: `${Math.min((estimate.total_invoiced / estimate.total_amount) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ${(estimate.total_amount - estimate.total_invoiced).toFixed(2)} remaining
                                  </span>
                                </div>
                              </div>
                            )}
                            {estimate.document_path && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">📄 Document attached</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleEstimateSelect(estimate)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowEstimateSelector(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal - Similar to Estimates form but adapted for invoices */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 transition-colors">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
              </h3>
              
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
                    <select
                      value={formData.customer_id || ''}
                      onChange={(e) => {
                        const customerId = e.target.value ? parseInt(e.target.value) : null;
                        const customer = customers.find(c => c.id === customerId);
                        setFormData({ 
                          ...formData, 
                          customer_id: customerId,
                          customer_name: customer?.name || ''
                        });
                      }}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project (Optional)</label>
                    <select
                      value={formData.project_id || ''}
                      onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? parseInt(e.target.value) : null })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Project (Optional)</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name} ({project.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  {editingInvoice && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                      <select
                        value={formData.status || 'draft'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Email</label>
                    <input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Phone</label>
                    <input
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Address</label>
                  <textarea
                    rows={2}
                    value={formData.customer_address}
                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Items Section - Same as estimates */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">Items</h4>
                    <button
                      type="button"
                      onClick={addItem}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Quantity</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Total</label>
                          <div className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm">
                            ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                          </div>
                        </div>
                        <div className="col-span-1">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded text-sm"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tax and Due Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Totals Display */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax ({formData.tax_rate}%):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-medium border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {formLoading ? 'Saving...' : (editingInvoice ? 'Update Invoice' : 'Create Invoice')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && paymentInvoice && (
        <PaymentForm
          invoice={paymentInvoice}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          onClose={handleClosePaymentForm}
        />
      )}

      {/* Email Modal */}
      {showEmailModal && emailingInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Send Invoice via Email
              </h3>
              
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left side - Form inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Invoice Details
                      </label>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md space-y-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{emailingInvoice.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Invoice #: {emailingInvoice.invoice_number}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Customer: {emailingInvoice.customer_name || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Total: ${emailingInvoice.total_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Recipient Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={emailData.recipient_email}
                        onChange={(e) => setEmailData({ ...emailData, recipient_email: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="customer@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Your Name (optional)
                      </label>
                      <input
                        type="text"
                        value={emailData.sender_name}
                        onChange={(e) => setEmailData({ ...emailData, sender_name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Your name or company"
                      />
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        The invoice PDF will be automatically attached to the email. Use the tabs on the right to preview both the email content and PDF attachment.
                      </p>
                    </div>
                  </div>

                  {/* Right side - Email and PDF preview */}
                  <div className="space-y-4">
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200 dark:border-gray-600">
                      <nav className="-mb-px flex space-x-8">
                        <button
                          type="button"
                          onClick={() => setEmailPreviewTab('email')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            emailPreviewTab === 'email'
                              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          Email Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmailPreviewTab('pdf')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            emailPreviewTab === 'pdf'
                              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          PDF Attachment
                        </button>
                      </nav>
                    </div>

                    {/* Tab Content */}
                    {emailPreviewTab === 'email' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email Preview
                        </label>
                        <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden">
                          <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Subject: Invoice #{emailingInvoice.invoice_number} from {emailData.sender_name || user?.username || 'AmpTrack'}
                            </p>
                          </div>
                          <div className="p-4 bg-white dark:bg-gray-800 max-h-96 overflow-y-auto">
                            {/* Email Header */}
                            <div className="bg-blue-500 text-white p-4 text-center rounded-t-lg">
                              <h2 className="text-xl font-bold">Invoice</h2>
                            </div>
                            
                            {/* Email Content */}
                            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-b-lg">
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-md mb-4">
                                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">{emailingInvoice.title}</h3>
                                {emailingInvoice.description && (
                                  <p className="text-gray-600 dark:text-gray-300 mb-3">{emailingInvoice.description}</p>
                                )}
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="text-gray-700 dark:text-gray-300">
                                    <p><strong>Invoice #:</strong> {emailingInvoice.invoice_number}</p>
                                    <p><strong>Date:</strong> {new Date(emailingInvoice.created_at).toLocaleDateString()}</p>
                                    {emailingInvoice.due_date && (
                                      <p><strong>Due Date:</strong> {new Date(emailingInvoice.due_date).toLocaleDateString()}</p>
                                    )}
                                    <p>
                                      <strong>Status:</strong> 
                                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(emailingInvoice.status)}`}>
                                        {emailingInvoice.status.toUpperCase()}
                                      </span>
                                    </p>
                                  </div>
                                  <div className="text-right text-gray-700 dark:text-gray-300">
                                    <p className="font-semibold">From: {emailData.sender_name || user?.username || 'AmpTrack'}</p>
                                    {emailingInvoice.customer_name && (
                                      <p><strong>To:</strong> {emailingInvoice.customer_name}</p>
                                    )}
                                    {emailingInvoice.project_name && (
                                      <p><strong>Project:</strong> {emailingInvoice.project_name}</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-4 text-center">
                                  <div className="border-2 border-blue-500 rounded-lg p-4 inline-block">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Amount Due</p>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                      ${emailingInvoice.total_amount.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-3 rounded-md">
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    📎 <strong>Invoice Document:</strong> Please find the detailed invoice attached to this email as a PDF.
                                  </p>
                                </div>
                                
                                {emailingInvoice.notes && (
                                  <div className="mt-4">
                                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Notes:</h4>
                                    <p className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-sm text-gray-700 dark:text-gray-300">{emailingInvoice.notes}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                <p>Thank you for your business. This invoice details the services provided and the amount due.</p>
                                {emailingInvoice.due_date && (
                                  <p>Please ensure payment is made by the due date: {new Date(emailingInvoice.due_date).toLocaleDateString()}</p>
                                                                  )}
                                  <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            PDF Attachment Preview
                          </label>
                          <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden">
                            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                📎 invoice-{emailingInvoice.invoice_number}.pdf
                              </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 h-96 flex items-center justify-center">
                              {pdfUrl ? (
                                <iframe
                                  src={pdfUrl}
                                  className="w-full h-full border-0"
                                  title="Invoice PDF Preview"
                                />
                              ) : (
                                <div className="text-gray-400 dark:text-gray-500">
                                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <p>PDF preview not available</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailModal(false);
                        setEmailingInvoice(null);
                        setEmailData({ recipient_email: '', sender_name: '' });
                        setPdfUrl(null);
                        setEmailPreviewTab('email');
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={emailLoading}
                      className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {emailLoading ? 'Sending...' : 'Send Email'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Percentage Modal */}
        {showPercentageModal && selectedEstimate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 transition-colors">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Create Invoice from Estimate
                </h3>
                
                <div className="mb-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">{selectedEstimate.title}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">
                        <strong>Total Estimate:</strong> ${selectedEstimate.total_amount.toFixed(2)}
                      </p>
                      <p className="text-blue-600 dark:text-blue-400">
                        <strong>Already Invoiced:</strong> ${selectedEstimate.total_invoiced.toFixed(2)} 
                        ({((selectedEstimate.total_invoiced / selectedEstimate.total_amount) * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-green-600 dark:text-green-400">
                        <strong>Already Paid:</strong> ${selectedEstimate.total_paid.toFixed(2)}
                        ({((selectedEstimate.total_paid / selectedEstimate.total_amount) * 100).toFixed(1)}%)
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        <strong>Remaining:</strong> ${(selectedEstimate.total_amount - selectedEstimate.total_invoiced).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {selectedEstimate.total_invoiced > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full"
                            style={{ width: `${Math.min((selectedEstimate.total_invoiced / selectedEstimate.total_amount) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {((selectedEstimate.total_invoiced / selectedEstimate.total_amount) * 100).toFixed(0)}% invoiced
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <form onSubmit={handlePercentageSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Percentage of Total Estimate to Invoice
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        value={percentageData.percentage}
                        onChange={(e) => setPercentageData({ ...percentageData, percentage: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={`Remaining: ${(((selectedEstimate.total_amount - selectedEstimate.total_invoiced) / selectedEstimate.total_amount) * 100).toFixed(1)}%`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">%</span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Amount will be: ${percentageData.percentage ? ((parseFloat(percentageData.percentage) / 100) * selectedEstimate.total_amount).toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Invoice Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={percentageData.title}
                      onChange={(e) => setPercentageData({ ...percentageData, title: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={percentageData.due_date}
                      onChange={(e) => setPercentageData({ ...percentageData, due_date: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowPercentageModal(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {formLoading ? 'Creating...' : 'Create Invoice'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Invoices; 