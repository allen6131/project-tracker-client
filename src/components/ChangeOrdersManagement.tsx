import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChangeOrder, 
  CreateChangeOrderRequest, 
  UpdateChangeOrderRequest,
  ChangeOrderItem
} from '../types';
import { changeOrdersAPI } from '../services/api';

interface ChangeOrdersManagementProps {
  projectId: number;
  projectName?: string;
  customerInfo?: {
    id?: number;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

const ChangeOrdersManagement: React.FC<ChangeOrdersManagementProps> = ({ 
  projectId, 
  projectName,
  customerInfo 
}) => {
  const { user } = useAuth();
  
  // State management
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);
  const [emailingChangeOrder, setEmailingChangeOrder] = useState<ChangeOrder | null>(null);
  const [viewingChangeOrder, setViewingChangeOrder] = useState<ChangeOrder | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reason: '',
    justification: '',
    customer_name: customerInfo?.name || '',
    customer_email: customerInfo?.email || '',
    customer_phone: customerInfo?.phone || '',
    customer_address: customerInfo?.address || '',
    tax_rate: 0,
    requested_date: '',
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled'
  });
  
  const [items, setItems] = useState<ChangeOrderItem[]>([
    { description: '', quantity: 1, unit_price: 0 }
  ]);

  // Email form data
  const [emailData, setEmailData] = useState({
    recipient_email: customerInfo?.email || '',
    sender_name: user?.username || ''
  });

  // Update email data when customer info changes
  useEffect(() => {
    setEmailData(prev => ({
      ...prev,
      recipient_email: customerInfo?.email || ''
    }));
  }, [customerInfo]);

  // Load change orders
  useEffect(() => {
    loadChangeOrders();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update form data when customer info changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      customer_name: customerInfo?.name || '',
      customer_email: customerInfo?.email || '',
      customer_phone: customerInfo?.phone || '',
      customer_address: customerInfo?.address || ''
    }));
  }, [customerInfo]);

  const loadChangeOrders = async () => {
    try {
      setLoading(true);
      const response = await changeOrdersAPI.getProjectChangeOrders(projectId);
      setChangeOrders(response.changeOrders);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load change orders');
    } finally {
      setLoading(false);
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
      reason: '',
      justification: '',
      customer_name: customerInfo?.name || '',
      customer_email: customerInfo?.email || '',
      customer_phone: customerInfo?.phone || '',
      customer_address: customerInfo?.address || '',
      tax_rate: 0,
      requested_date: '',
      notes: '',
      status: 'draft'
    });
    setItems([{ description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleCreateChangeOrder = () => {
    clearMessages();
    resetForm();
    setEditingChangeOrder(null);
    setShowForm(true);
  };

  const handleEditChangeOrder = (changeOrder: ChangeOrder) => {
    clearMessages();
    setEditingChangeOrder(changeOrder);
    setFormData({
      title: changeOrder.title,
      description: changeOrder.description || '',
      reason: changeOrder.reason || '',
      justification: changeOrder.justification || '',
      customer_name: changeOrder.customer_name || '',
      customer_email: changeOrder.customer_email || '',
      customer_phone: changeOrder.customer_phone || '',
      customer_address: changeOrder.customer_address || '',
      tax_rate: changeOrder.tax_rate,
      requested_date: changeOrder.requested_date || '',
      notes: changeOrder.notes || '',
      status: changeOrder.status
    });
    setItems(changeOrder.items || [{ description: '', quantity: 1, unit_price: 0 }]);
    setShowForm(true);
  };

  const handleDeleteChangeOrder = async (changeOrderId: number) => {
    if (!window.confirm('Are you sure you want to delete this change order?')) return;
    
    try {
      clearMessages();
      await changeOrdersAPI.deleteChangeOrder(changeOrderId);
      setSuccess('Change order deleted successfully');
      loadChangeOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete change order');
    }
  };

  const handleSendEmail = (changeOrder: ChangeOrder) => {
    setEmailingChangeOrder(changeOrder);
    setEmailData({
      recipient_email: changeOrder.customer_email || customerInfo?.email || '',
      sender_name: user?.username || ''
    });
    setShowEmailModal(true);
  };

  const handleViewChangeOrder = (changeOrder: ChangeOrder) => {
    setViewingChangeOrder(changeOrder);
    setShowViewModal(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailingChangeOrder) return;
    
    try {
      setEmailLoading(true);
      clearMessages();
      await changeOrdersAPI.sendChangeOrderEmail(emailingChangeOrder.id, emailData);
      setSuccess('Change order sent successfully via email');
      setShowEmailModal(false);
      setEmailingChangeOrder(null);
      loadChangeOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send change order email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0 || items.some(item => !item.description.trim())) {
      setError('Please add at least one item with a description');
      return;
    }
    
    try {
      setFormLoading(true);
      clearMessages();
      
      const changeOrderData: CreateChangeOrderRequest | UpdateChangeOrderRequest = {
        ...formData,
        project_id: projectId,
        customer_id: customerInfo?.id || null,
        items: items.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price)
        }))
      };
      
      if (editingChangeOrder) {
        await changeOrdersAPI.updateChangeOrder(editingChangeOrder.id, changeOrderData);
        setSuccess('Change order updated successfully');
      } else {
        await changeOrdersAPI.createChangeOrder(changeOrderData as CreateChangeOrderRequest);
        setSuccess('Change order created successfully');
      }
      
      setShowForm(false);
      setEditingChangeOrder(null);
      resetForm();
      loadChangeOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save change order');
    } finally {
      setFormLoading(false);
    }
  };

  const handleItemChange = (index: number, field: keyof ChangeOrderItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
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
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
    const taxAmount = subtotal * (Number(formData.tax_rate) / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
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

  const totals = calculateTotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Change Orders</h3>
          <p className="text-sm text-gray-500">
            Project modifications and additional work requests
          </p>
        </div>
        <button
          onClick={handleCreateChangeOrder}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Create Change Order</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Change Orders List */}
      {loading ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">Loading change orders...</div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {changeOrders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No change orders</h3>
              <p className="mt-1 text-sm text-gray-500">Create a change order for project modifications.</p>
              <div className="mt-6">
                <button
                  onClick={handleCreateChangeOrder}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Change Order
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {changeOrders.map((changeOrder) => (
                    <tr key={changeOrder.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{changeOrder.change_order_number}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{changeOrder.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {changeOrder.reason || 'No reason specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(changeOrder.status)}`}>
                          {changeOrder.status.charAt(0).toUpperCase() + changeOrder.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${changeOrder.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(changeOrder.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewChangeOrder(changeOrder)}
                            className="text-green-600 hover:text-green-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditChangeOrder(changeOrder)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          {changeOrder.status === 'draft' && (
                            <button
                              onClick={() => handleSendEmail(changeOrder)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Send
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteChangeOrder(changeOrder.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Change Order Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingChangeOrder ? 'Edit Change Order' : 'Create New Change Order'}
              </h3>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                      Reason for Change
                    </label>
                    <textarea
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="justification" className="block text-sm font-medium text-gray-700">
                      Justification
                    </label>
                    <textarea
                      id="justification"
                      value={formData.justification}
                      onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      id="tax_rate"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                      min="0"
                      max="100"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="requested_date" className="block text-sm font-medium text-gray-700">
                      Requested Date
                    </label>
                    <input
                      type="date"
                      id="requested_date"
                      value={formData.requested_date}
                      onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Change Order Items</h4>
                    <button
                      type="button"
                      onClick={addItem}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                            min="0.01"
                            step="0.01"
                            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Unit Price"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            required
                          />
                        </div>
                        <div className="col-span-2 text-sm text-gray-600">
                          ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                            disabled={items.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${totals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax ({formData.tax_rate}%):</span>
                        <span>${totals.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>${totals.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingChangeOrder(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
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
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Send Change Order {emailingChangeOrder.change_order_number}
              </h3>
              
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="recipient_email" className="block text-sm font-medium text-gray-700">
                    Recipient Email *
                  </label>
                  <input
                    type="email"
                    id="recipient_email"
                    value={emailData.recipient_email}
                    onChange={(e) => setEmailData({ ...emailData, recipient_email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="sender_name" className="block text-sm font-medium text-gray-700">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    id="sender_name"
                    value={emailData.sender_name}
                    onChange={(e) => setEmailData({ ...emailData, sender_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailModal(false);
                      setEmailingChangeOrder(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {emailLoading ? 'Sending...' : 'Send Change Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Change Order Modal */}
      {showViewModal && viewingChangeOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Change Order Details
                </h3>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingChangeOrder(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Change Order Header Info */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Change Order Number</p>
                    <p className="font-semibold">{viewingChangeOrder.change_order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(viewingChangeOrder.status)}`}>
                      {viewingChangeOrder.status.charAt(0).toUpperCase() + viewingChangeOrder.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date Created</p>
                    <p className="font-semibold">{formatDate(viewingChangeOrder.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-semibold text-lg">${viewingChangeOrder.total_amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Change Order Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Title</h4>
                  <p className="text-gray-700">{viewingChangeOrder.title}</p>
                </div>

                {viewingChangeOrder.description && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{viewingChangeOrder.description}</p>
                  </div>
                )}

                {viewingChangeOrder.reason && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Reason for Change</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{viewingChangeOrder.reason}</p>
                  </div>
                )}

                {viewingChangeOrder.justification && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Justification</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{viewingChangeOrder.justification}</p>
                  </div>
                )}

                {/* Customer Information */}
                {(viewingChangeOrder.customer_name || viewingChangeOrder.customer_email) && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Customer Information</h4>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                      {viewingChangeOrder.customer_name && (
                        <p className="text-sm"><span className="font-medium">Name:</span> {viewingChangeOrder.customer_name}</p>
                      )}
                      {viewingChangeOrder.customer_email && (
                        <p className="text-sm"><span className="font-medium">Email:</span> {viewingChangeOrder.customer_email}</p>
                      )}
                      {viewingChangeOrder.customer_phone && (
                        <p className="text-sm"><span className="font-medium">Phone:</span> {viewingChangeOrder.customer_phone}</p>
                      )}
                      {viewingChangeOrder.customer_address && (
                        <p className="text-sm"><span className="font-medium">Address:</span> {viewingChangeOrder.customer_address}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Items */}
                {viewingChangeOrder.items && viewingChangeOrder.items.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Items</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {viewingChangeOrder.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">${item.unit_price.toFixed(2)}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">${(item.quantity * item.unit_price).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>${viewingChangeOrder.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax ({viewingChangeOrder.tax_rate}%):</span>
                          <span>${viewingChangeOrder.tax_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-lg border-t pt-2">
                          <span>Total:</span>
                          <span>${viewingChangeOrder.total_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {viewingChangeOrder.notes && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{viewingChangeOrder.notes}</p>
                  </div>
                )}

                {viewingChangeOrder.requested_date && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Requested Date</h4>
                    <p className="text-gray-700">{formatDate(viewingChangeOrder.requested_date)}</p>
                  </div>
                )}

                {viewingChangeOrder.approved_date && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Approved Date</h4>
                    <p className="text-gray-700">{formatDate(viewingChangeOrder.approved_date)}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => handleEditChangeOrder(viewingChangeOrder)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Edit Change Order
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingChangeOrder(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeOrdersManagement; 