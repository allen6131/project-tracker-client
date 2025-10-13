import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { changeOrdersAPI, customersAPI, projectsAPI, invoicesAPI } from '../services/api';
import { ChangeOrder, ChangeOrderItem, Project, UpdateChangeOrderRequest } from '../types';

const ChangeOrderEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const changeOrderId = useMemo(() => (id ? parseInt(id, 10) : NaN), [id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);

  const [changeOrder, setChangeOrder] = useState<ChangeOrder | null>(null);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    reason: '',
    justification: '',
    tax_rate: 0,
    requested_date: '',
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled',
  });
  
  const [items, setItems] = useState<ChangeOrderItem[]>([
    { description: '', quantity: 1, unit_price: 0 }
  ]);
  
  const [convertData, setConvertData] = useState({
    percentage: '',
    title: '',
    due_date: ''
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!changeOrderId || Number.isNaN(changeOrderId)) {
          throw new Error('Invalid change order id');
        }

        const [changeOrderRes, customersRes, projectsRes] = await Promise.all([
          changeOrdersAPI.getChangeOrder(changeOrderId),
          customersAPI.getSimpleCustomers(),
          projectsAPI.getProjects(1, 100, ''),
        ]);

        if (!mounted) return;

        const co = changeOrderRes.changeOrder;
        setChangeOrder(co);
        setCustomers(customersRes.customers);
        setProjects(projectsRes.projects);

        setFormData({
          title: co.title || '',
          description: co.description || '',
          customer_name: co.customer_name || '',
          customer_email: co.customer_email || '',
          customer_phone: co.customer_phone || '',
          customer_address: co.customer_address || '',
          reason: co.reason || '',
          justification: co.justification || '',
          tax_rate: co.tax_rate || 0,
          requested_date: formatDateForInput(co.requested_date || ''),
          notes: co.notes || '',
          status: co.status,
        });
        setItems(co.items && co.items.length > 0 ? co.items : [{ description: '', quantity: 1, unit_price: 0 }]);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load change order');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [changeOrderId]);

  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof ChangeOrderItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value } as ChangeOrderItem;
    setItems(updated);
  };

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity || 0;
      const unitPrice = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) || 0 : item.unit_price || 0;
      return sum + (quantity * unitPrice);
    }, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const taxRate = typeof formData.tax_rate === 'string' ? parseFloat(formData.tax_rate) || 0 : formData.tax_rate || 0;
    return subtotal * (taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeOrder) return;

    try {
      setSaving(true);
      setError(null);

      const updateData: UpdateChangeOrderRequest = {
        title: formData.title,
        description: formData.description,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        customer_address: formData.customer_address,
        reason: formData.reason,
        justification: formData.justification,
        tax_rate: formData.tax_rate,
        requested_date: formData.requested_date || null,
        notes: formData.notes,
        status: formData.status,
      };

      await changeOrdersAPI.updateChangeOrder(changeOrder.id, updateData);
      setSuccess('Change order updated successfully');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigate(-1); // Go back to previous page
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update change order');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back to previous page
  };
  
  const handleConvertToInvoice = () => {
    if (!changeOrder) return;
    if (changeOrder.status !== 'approved') {
      setError('Only approved change orders can be converted to invoices');
      return;
    }
    setConvertData({
      percentage: '',
      title: '',
      due_date: ''
    });
    setShowConvertModal(true);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeOrder) return;
    
    try {
      setConvertLoading(true);
      setError(null);
      
      const invoiceData: any = {
        title: convertData.title || undefined,
        due_date: convertData.due_date || undefined
      };
      
      // If percentage is provided, calculate the amount
      if (convertData.percentage) {
        const percentage = parseFloat(convertData.percentage);
        if (percentage > 0 && percentage <= 100) {
          invoiceData.percentage = percentage;
          invoiceData.amount = (changeOrder.total_amount * percentage) / 100;
        }
      }
      
      const response = await invoicesAPI.createInvoiceFromChangeOrder(changeOrder.id, invoiceData);
      setSuccess(`Invoice ${response.invoice.invoice_number} created successfully from change order`);
      setShowConvertModal(false);
      
      // Navigate to invoices page after a brief delay
      setTimeout(() => {
        navigate('/invoices');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to convert change order to invoice');
    } finally {
      setConvertLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading change order...</p>
        </div>
      </div>
    );
  }

  if (!changeOrder) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Change order not found</p>
          <button
            onClick={() => navigate('/change-orders')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Change Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit Change Order #{changeOrder.change_order_number}
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Project: {changeOrder.project_name}
                </p>
              </div>
              <div className="flex space-x-3">
                {changeOrder.status === 'approved' && (
                  <button
                    onClick={handleConvertToInvoice}
                    className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Convert to Invoice
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
            <p className="text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Basic Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Requested Date
                  </label>
                  <input
                    type="date"
                    value={formData.requested_date}
                    onChange={(e) => handleInputChange('requested_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Justification
                </label>
                <textarea
                  value={formData.justification}
                  onChange={(e) => handleInputChange('justification', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Customer Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tax_rate}
                    onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.customer_address}
                  onChange={(e) => handleInputChange('customer_address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Add Item
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Total
                      </label>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white">
                        ${((typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity || 0) * 
                           (typeof item.unit_price === 'string' ? parseFloat(item.unit_price) || 0 : item.unit_price || 0)).toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="font-medium text-gray-900 dark:text-white">${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tax ({formData.tax_rate}%):</span>
                      <span className="font-medium text-gray-900 dark:text-white">${calculateTax().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notes</h3>
            </div>
            <div className="p-6">
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                placeholder="Additional notes or comments..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
        
        {/* Convert to Invoice Modal */}
        {showConvertModal && changeOrder && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Convert Change Order to Invoice
                </h3>
                
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Change Order:</strong> {changeOrder.change_order_number}
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Total Amount:</strong> ${changeOrder.total_amount.toFixed(2)}
                  </p>
                </div>
                
                <form onSubmit={handleConvertSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="convert_percentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Percentage (Optional)
                    </label>
                    <input
                      type="number"
                      id="convert_percentage"
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={convertData.percentage}
                      onChange={(e) => setConvertData({ ...convertData, percentage: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Leave empty for full amount"
                    />
                    {convertData.percentage && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Invoice Amount: ${((changeOrder.total_amount * parseFloat(convertData.percentage)) / 100).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="convert_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Invoice Title (Optional)
                    </label>
                    <input
                      type="text"
                      id="convert_title"
                      value={convertData.title}
                      onChange={(e) => setConvertData({ ...convertData, title: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Auto-generated if empty"
                    />
                  </div>

                  <div>
                    <label htmlFor="convert_due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      id="convert_due_date"
                      value={convertData.due_date}
                      onChange={(e) => setConvertData({ ...convertData, due_date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowConvertModal(false);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={convertLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {convertLoading ? 'Creating...' : 'Create Invoice'}
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

export default ChangeOrderEdit;
