import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChangeOrder, ChangeOrderItem, Project } from '../types';
import { changeOrdersAPI, projectsAPI, customersAPI } from '../services/api';

const ChangeOrders: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [projects, setProjects] = useState<{ id: number; name: string; customer_id?: number | null }[]>([]);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: 0,
    customer_id: 0,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    reason: '',
    justification: '',
    tax_rate: 0,
    requested_date: '',
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled'
  });
  
  const [items, setItems] = useState<ChangeOrderItem[]>([
    { description: '', quantity: 1, unit_price: 0 }
  ]);

  // Email state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailingChangeOrder, setEmailingChangeOrder] = useState<ChangeOrder | null>(null);
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    sender_name: ''
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // View state
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [page, search, status]);

  useEffect(() => {
    loadAuxData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await changeOrdersAPI.getChangeOrders(page, 10, search, status);
      setChangeOrders(res.changeOrders);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load change orders');
    } finally {
      setLoading(false);
    }
  };

  const loadAuxData = async () => {
    try {
      const [projRes, custRes] = await Promise.all([
        projectsAPI.getProjects(1, 100, ''),
        customersAPI.getSimpleCustomers()
      ]);
      setProjects(projRes.projects.map((p: Project) => ({ 
        id: p.id, 
        name: p.name, 
        customer_id: p.customer_id 
      })));
      setCustomers(custRes.customers);
    } catch (e) {
      console.error('Failed to load auxiliary data:', e);
    }
  };

  const toggleDropdown = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: 0,
      customer_id: 0,
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_address: '',
      reason: '',
      justification: '',
      tax_rate: 0,
      requested_date: '',
      notes: '',
      status: 'draft'
    });
    setItems([{ description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleCreate = () => {
    clearMessages();
    resetForm();
    setEditingChangeOrder(null);
    setShowForm(true);
  };

  const handleEdit = (changeOrder: ChangeOrder) => {
    navigate(`/change-orders/${changeOrder.id}/edit`);
  };

  const handleViewPDF = async (id: number) => {
    try {
      const url = await changeOrdersAPI.viewChangeOrderPDF(id);
      setViewUrl(url);
    } catch (e) {
      setError('Failed to load change order PDF');
    }
  };

  const handleDownloadPDF = async (id: number) => {
    try {
      const blob = await changeOrdersAPI.downloadChangeOrderPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `change-order-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess('Change order PDF downloaded successfully');
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      setError('Failed to download change order PDF');
    }
  };

  const handleSendEmail = async (changeOrder: ChangeOrder) => {
    clearMessages();
    setEmailingChangeOrder(changeOrder);
    setEmailData({
      recipient_email: changeOrder.customer_email || '',
      sender_name: user?.username || ''
    });
    
    // Load PDF preview
    try {
      const url = await changeOrdersAPI.viewChangeOrderPDF(changeOrder.id);
      setPdfUrl(url);
    } catch {
      setPdfUrl(null);
    }
    setShowEmailModal(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailingChangeOrder) return;

    setEmailLoading(true);
    try {
      await changeOrdersAPI.sendChangeOrderEmail(emailingChangeOrder.id, emailData);
      setSuccess(`Change order sent successfully to ${emailData.recipient_email}`);
      setShowEmailModal(false);
      setEmailingChangeOrder(null);
      setEmailData({ recipient_email: '', sender_name: '' });
      setPdfUrl(null);
      loadData(); // Refresh to show updated status
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
      if (!formData.title.trim() || !formData.project_id) {
        setError('Title and project are required');
        return;
      }

      const changeOrderData = {
        ...formData,
        customer_id: formData.customer_id || undefined,
        requested_date: formData.requested_date || undefined,
        items: items.filter(item => item.description.trim() !== '')
      };

      if (editingChangeOrder) {
        await changeOrdersAPI.updateChangeOrder(editingChangeOrder.id, changeOrderData);
        setSuccess('Change order updated successfully');
      } else {
        await changeOrdersAPI.createChangeOrder(changeOrderData);
        setSuccess('Change order created successfully');
      }
      
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleItemChange = (index: number, field: keyof ChangeOrderItem, value: string | number) => {
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
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      case 'cancelled':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  const parseDateOnly = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const ymd = dateString.split('T')[0];
      const [y, m, d] = ymd.split('-').map(Number);
      const dt = y && m && d ? new Date(y, m - 1, d) : new Date(dateString);
      return dt.toLocaleDateString();
    } catch {
      return dateString;
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
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Change Orders</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage project change orders and modifications
              </p>
            </div>
            <div className="space-x-2">
              <button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Create Change Order
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
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search change orders..."
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <select
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Change Orders List */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
          <div className="text-center text-gray-900 dark:text-white">Loading change orders...</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Change Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Project
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
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {changeOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No change orders found.
                    </td>
                  </tr>
                ) : (
                  changeOrders.map((changeOrder) => (
                  <tr key={changeOrder.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{changeOrder.change_order_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {changeOrder.project_name || 'No project'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {changeOrder.customer_name || 'No customer'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(changeOrder.status)}>
                        {changeOrder.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${changeOrder.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {parseDateOnly(changeOrder.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative dropdown-container">
                        <button
                          onClick={(e) => toggleDropdown(changeOrder.id, e)}
                          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        
                        {openDropdownId === changeOrder.id && (
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleViewPDF(changeOrder.id);
                                  setOpenDropdownId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                View PDF
                              </button>
                              <button
                                onClick={() => {
                                  handleDownloadPDF(changeOrder.id);
                                  setOpenDropdownId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Download PDF
                              </button>
                              <button
                                onClick={() => {
                                  handleEdit(changeOrder);
                                  setOpenDropdownId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Edit
                              </button>
                              {changeOrder.status !== 'cancelled' && (
                                <button
                                  onClick={() => {
                                    handleSendEmail(changeOrder);
                                    setOpenDropdownId(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                  Send Email
                                </button>
                              )}
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
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Page <span className="font-medium">{page}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === page
                            ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-300'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF View Modal */}
      {viewUrl && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Change Order PDF</h3>
              <button onClick={() => setViewUrl(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-white dark:bg-gray-800 h-96 flex items-center justify-center">
              <iframe src={viewUrl} className="w-full h-full border-0" title="Change Order PDF Preview" />
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 transition-colors">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingChangeOrder ? 'Edit Change Order' : 'Create New Change Order'}
              </h3>
              
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project *</label>
                    <select
                      value={formData.project_id || ''}
                      onChange={(e) => {
                        const projectId = e.target.value ? parseInt(e.target.value) : 0;
                        const project = projects.find(p => p.id === projectId);
                        setFormData({ 
                          ...formData, 
                          project_id: projectId,
                          customer_id: project?.customer_id || 0
                        });
                      }}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select Project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
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

                {/* Reason and Justification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason for Change</label>
                    <textarea
                      rows={3}
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Justification</label>
                    <textarea
                      rows={3}
                      value={formData.justification}
                      onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Email</label>
                    <input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Phone</label>
                    <input
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white">Items</h4>
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit Price</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total</label>
                          <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white">
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

                {/* Tax and Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Requested Date</label>
                    <input
                      type="date"
                      value={formData.requested_date}
                      onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Totals Display */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {formLoading ? 'Saving...' : (editingChangeOrder ? 'Update Change Order' : 'Create Change Order')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && emailingChangeOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Send Change Order via Email
              </h3>
              
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left side - Form inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Change Order Details
                      </label>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md space-y-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{emailingChangeOrder.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Change Order #: {emailingChangeOrder.change_order_number}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Project: {emailingChangeOrder.project_name || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Total: ${emailingChangeOrder.total_amount.toFixed(2)}
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
                  </div>

                  {/* Right side - PDF preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      PDF Preview
                    </label>
                    <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden h-96 bg-white dark:bg-gray-800 flex items-center justify-center">
                      {pdfUrl ? (
                        <iframe
                          src={pdfUrl}
                          className="w-full h-full border-0"
                          title="Change Order PDF Preview"
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

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailModal(false);
                      setEmailingChangeOrder(null);
                      setEmailData({ recipient_email: '', sender_name: '' });
                      setPdfUrl(null);
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
    </div>
  );
};

export default ChangeOrders;
