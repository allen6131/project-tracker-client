import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
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

  // Load invoices and data
  useEffect(() => {
    loadInvoices();
    loadCustomers();
    loadEstimates();
    loadProjects();
  }, [currentPage, searchTerm, statusFilter]);

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
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'sent':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'paid':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'overdue':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'cancelled':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const { subtotal, taxAmount, total } = calculateTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-lg transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard">
                <Logo size="md" />
              </Link>
              <span className="ml-4 text-lg text-gray-600 dark:text-gray-300">Invoices</span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle size="sm" />
              <span className="text-gray-700 dark:text-gray-300">Welcome, {user?.username}</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
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
        <div className="mb-6 bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">Loading invoices...</div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.title}</div>
                        <div className="text-sm text-gray-500">{invoice.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.customer_name || 'No customer'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.project_id ? (
                          <span className="text-blue-600">
                            Project #{invoice.project_id}
                          </span>
                        ) : (
                          <span className="text-gray-400">No project</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(invoice.status)}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${invoice.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'No due date'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-1">
                          {/* Primary Actions */}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditInvoice(invoice)}
                              className="text-indigo-600 hover:text-indigo-900 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-red-600 hover:text-red-900 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                          
                          {/* Payment Actions */}
                          <div className="flex space-x-1 mb-1">
                            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                              <button
                                onClick={() => handlePayInvoice(invoice)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded text-xs font-medium"
                              >
                                💳 Pay Invoice
                              </button>
                            )}
                          </div>
                          
                          {/* Quick Status Actions */}
                          <div className="flex space-x-1">
                            {invoice.status === 'draft' && (
                              <button
                                onClick={() => handleQuickStatusUpdate(invoice.id, 'sent')}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                              >
                                Send
                              </button>
                            )}
                            {invoice.status === 'sent' && (
                              <button
                                onClick={() => handleQuickStatusUpdate(invoice.id, 'paid')}
                                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                              >
                                Mark Paid
                              </button>
                            )}
                            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                              <button
                                onClick={() => handleQuickStatusUpdate(invoice.id, 'cancelled')}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
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
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
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
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Select Estimate to Convert to Invoice
                </h3>
                
                <div className="max-h-96 overflow-y-auto">
                  {estimates.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No approved estimates available</p>
                  ) : (
                    <div className="space-y-2">
                      {estimates.map((estimate) => (
                        <div key={estimate.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium text-gray-900">{estimate.title}</h4>
                              <p className="text-sm text-gray-500">Project: {estimate.project_name}</p>
                              <p className="text-sm text-gray-500">Customer: {estimate.customer_name || 'No customer'}</p>
                              <p className="text-sm text-gray-600 font-medium">${estimate.total_amount.toFixed(2)}</p>
                              {estimate.document_path && (
                                <p className="text-sm text-gray-500">📄 Document attached</p>
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
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
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
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
                </h3>
                
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer</label>
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
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700">Project (Optional)</label>
                      <select
                        value={formData.project_id || ''}
                        onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? parseInt(e.target.value) : null })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                          value={formData.status || 'draft'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

        {/* Percentage Modal */}
        {showPercentageModal && selectedEstimate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create Partial Invoice from Estimate
                </h3>
                
                <form onSubmit={handlePercentageSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Percentage of Estimate Amount to Invoice
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max="100"
                      value={percentageData.percentage}
                      onChange={(e) => setPercentageData({ ...percentageData, percentage: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Invoice Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={percentageData.title}
                      onChange={(e) => setPercentageData({ ...percentageData, title: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={percentageData.due_date}
                      onChange={(e) => setPercentageData({ ...percentageData, due_date: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowPercentageModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
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
    </div>
  );
};

export default Invoices; 