import React, { useState, useEffect } from 'react';
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
import PDFViewer from './PDFViewer';
import PaymentForm from './PaymentForm';

const InvoicesManagement: React.FC = () => {
  const { user, isAdmin } = useAuth();
  
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
  
  // PDF viewer state
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [currentPDFInvoice, setCurrentPDFInvoice] = useState<Invoice | null>(null);
  
  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const toggleDropdown = (invoiceId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDropdown(openDropdown === invoiceId ? null : invoiceId);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadInvoices();
  };

  const handlePaymentClick = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setShowPaymentForm(true);
  };

  const handleViewPDF = async (invoice: Invoice) => {
    try {
      setPdfLoading(true);
      setPdfTitle(`Invoice PDF - ${invoice.title}`);
      setCurrentPDFInvoice(invoice);
      
      const url = await invoicesAPI.viewInvoicePDF(invoice.id);
      setPdfUrl(url);
      setShowPDFViewer(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentPDFInvoice) return;
    
    try {
      const blob = await invoicesAPI.downloadInvoicePDF(currentPDFInvoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${currentPDFInvoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to download PDF');
    }
  };

  const handleRegeneratePDF = async () => {
    if (!currentPDFInvoice) return;
    
    try {
      setPdfLoading(true);
      await invoicesAPI.regenerateInvoicePDF(currentPDFInvoice.id);
      
      // Refresh the PDF view
      const url = await invoicesAPI.viewInvoicePDF(currentPDFInvoice.id);
      setPdfUrl(url);
      setSuccess('PDF regenerated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to regenerate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePDFViewer = () => {
    setShowPDFViewer(false);
    setPdfUrl(null);
    setCurrentPDFInvoice(null);
    setPdfTitle('');
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(String(item.quantity)) * parseFloat(String(item.unit_price)));
    }, 0);
    const taxAmount = subtotal * (formData.tax_rate / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      const invoiceData: CreateInvoiceRequest = {
        title: formData.title,
        description: formData.description,
        customer_id: formData.customer_id,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        customer_address: formData.customer_address,
        estimate_id: formData.estimate_id,
        project_id: formData.project_id,
        tax_rate: formData.tax_rate,
        due_date: formData.due_date || undefined,
        notes: formData.notes,
        items: items.filter(item => item.description.trim() !== '')
      };

      if (editingInvoice) {
        await invoicesAPI.updateInvoice(editingInvoice.id, { ...invoiceData, status: formData.status });
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
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </form>

          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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

      {/* Invoices Table */}
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
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer
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
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{invoice.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{invoice.customer_name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{invoice.customer_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${invoice.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {invoice.due_date ? formatDate(invoice.due_date) : 'Not set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={(e) => toggleDropdown(invoice.id, e)}
                          className="inline-flex items-center justify-center w-8 h-8 text-gray-400 dark:text-gray-500 bg-transparent border-0 rounded-full hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-colors"
                        >
                          <span className="sr-only">Open options</span>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {openDropdown === invoice.id && (
                          <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-50">
                            <button
                              onClick={() => {
                                handleViewPDF(invoice);
                                setOpenDropdown(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              View PDF
                            </button>
                            
                            <button
                              onClick={() => {
                                handleEditInvoice(invoice);
                                setOpenDropdown(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Invoice
                            </button>

                            {invoice.status === 'sent' && (
                              <button
                                onClick={() => {
                                  handlePaymentClick(invoice);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Process Payment
                              </button>
                            )}

                            <div className="border-t border-gray-100 dark:border-gray-600 my-1"></div>
                            
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this invoice?')) {
                                  // Delete logic would go here
                                }
                                setOpenDropdown(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Invoice
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
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
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}

          {invoices.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No invoices</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new invoice.</p>
              <div className="mt-6">
                <button
                  onClick={handleCreateInvoice}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Invoice
                </button>
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
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowEstimateSelector(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Percentage Selection Modal */}
      {showPercentageModal && selectedEstimate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create Invoice from Estimate
              </h3>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900">{selectedEstimate.title}</h4>
                <p className="text-sm text-gray-500">Project: {selectedEstimate.project_name}</p>
                <p className="text-sm text-gray-600">Estimate Total: <span className="font-medium">${selectedEstimate.total_amount.toFixed(2)}</span></p>
              </div>
              
              <form onSubmit={handlePercentageSubmit} className="space-y-4">
                <div>
                  <label htmlFor="percentage" className="block text-sm font-medium text-gray-700 mb-1">
                    Percentage of Estimate *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="percentage"
                      value={percentageData.percentage}
                      onChange={(e) => setPercentageData({ ...percentageData, percentage: e.target.value })}
                      min="0.01"
                      max="100"
                      step="0.01"
                      className="block w-full pr-8 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                  {percentageData.percentage && (
                    <p className="mt-1 text-sm text-gray-600">
                      Invoice Amount: <span className="font-medium text-green-600">
                        ${((selectedEstimate.total_amount * parseFloat(percentageData.percentage || '0')) / 100).toFixed(2)}
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="invoice_title" className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Title
                  </label>
                  <input
                    type="text"
                    id="invoice_title"
                    value={percentageData.title}
                    onChange={(e) => setPercentageData({ ...percentageData, title: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Invoice title..."
                  />
                </div>

                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    value={percentageData.due_date}
                    onChange={(e) => setPercentageData({ ...percentageData, due_date: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPercentageModal(false);
                      setSelectedEstimate(null);
                      resetPercentageForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading || !percentageData.percentage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {formLoading ? 'Creating Invoice...' : 'Create Invoice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && paymentInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Payment for Invoice {paymentInvoice.invoice_number}
              </h3>
              
              <PaymentForm
                invoice={paymentInvoice}
                onPaymentSuccess={() => {
                  setShowPaymentForm(false);
                  setPaymentInvoice(null);
                  setSuccess('Payment completed successfully!');
                  loadInvoices();
                }}
                onPaymentError={(error) => {
                  setError(error);
                }}
                onClose={() => {
                  setShowPaymentForm(false);
                  setPaymentInvoice(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Form and other modals would go here - keeping same structure as original */}
      {/* Note: For brevity, I'm not including the full modal code, but it would be the same as in the original Invoices.tsx */}
      
      {/* Create/Edit Form Modal */}
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

                {/* Items Section */}
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
      
      {/* PDF Viewer */}
      <PDFViewer
        isOpen={showPDFViewer}
        onClose={handleClosePDFViewer}
        pdfUrl={pdfUrl}
        title={pdfTitle}
        onDownload={handleDownloadPDF}
        onRegenerate={handleRegeneratePDF}
        loading={pdfLoading}
      />
    </div>
  );
};

export default InvoicesManagement; 