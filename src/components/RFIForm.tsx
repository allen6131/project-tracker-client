import React, { useState, useEffect, useCallback } from 'react';
import { Customer, Contact, RFI, CreateRFIRequest, Project } from '../types';
import { customersAPI, rfiAPI } from '../services/api';

interface RFIFormProps {
  projectId: number;
  project?: Project | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const RFIForm: React.FC<RFIFormProps> = ({ projectId, project, onSuccess, onError }) => {
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingRfi, setEditingRfi] = useState<RFI | null>(null);
  const [sendingRfiId, setSendingRfiId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    response_needed_by: ''
  });

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getSimpleCustomers();
      setCustomers(response.customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchRFIHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const response = await rfiAPI.getRFIHistory(projectId);
      setRfis(response.rfis);
    } catch (error) {
      console.error('Error fetching RFI history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCustomers();
    fetchRFIHistory();
  }, [projectId, fetchRFIHistory]);

  const handleCustomerChange = useCallback(async (customerId: number) => {
    try {
      if (customerId === 0) {
        setSelectedCustomer(null);
        setSelectedContact(null);
        return;
      }

      const response = await customersAPI.getCustomer(customerId);
      setSelectedCustomer(response.customer);
      setSelectedContact(null);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      onError('Failed to load customer details');
    }
  }, [onError]);

  // Auto-select project customer when project data is available
  useEffect(() => {
    if (project && project.customer_id && customers.length > 0) {
      const projectCustomer = customers.find(c => c.id === project.customer_id);
      if (projectCustomer) {
        handleCustomerChange(project.customer_id);
      }
    }
  }, [project, customers, handleCustomerChange]);

  const handleContactChange = (contactId: number) => {
    if (contactId === 0) {
      setSelectedContact(null);
      return;
    }

    const contact = selectedCustomer?.contacts?.find(c => c.id === contactId);
    setSelectedContact(contact || null);
  };

  const handleSubmit = async (action: 'draft' | 'send') => {
    if (!selectedCustomer || !selectedContact) {
      onError('Please select a customer and contact');
      return;
    }

    if (action === 'send' && !selectedContact.email) {
      onError('Selected contact does not have an email address');
      return;
    }

    if (!formData.subject.trim() || !formData.message.trim()) {
      onError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      const rfiData: CreateRFIRequest & { action: 'draft' | 'send' } = {
        project_id: projectId,
        customer_id: selectedCustomer.id,
        contact_id: selectedContact.id,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        response_needed_by: formData.response_needed_by || undefined,
        action
      };

      await rfiAPI.createRFI(rfiData);
      
      if (action === 'draft') {
        onSuccess('RFI saved as draft successfully!');
      } else {
        onSuccess(`RFI sent successfully to ${selectedContact.first_name} ${selectedContact.last_name}!`);
      }
      
      // Reset form
      setFormData({
        subject: '',
        message: '',
        priority: 'medium',
        response_needed_by: ''
      });
      // Don't reset customer selection if it's the project's customer
      if (!project || project.customer_id !== selectedCustomer.id) {
        setSelectedCustomer(null);
        setSelectedContact(null);
      } else {
        setSelectedContact(null);
      }
      
      // Refresh RFI history
      fetchRFIHistory();
      
    } catch (error: any) {
      console.error('Error with RFI:', error);
      onError(error.response?.data?.message || `Failed to ${action === 'draft' ? 'save' : 'send'} RFI`);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'responded': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSendDraft = async (rfi: RFI) => {
    setSendingRfiId(rfi.id);
    
    try {
      await rfiAPI.sendRFI(rfi.id);
      onSuccess(`Draft RFI sent successfully to ${rfi.first_name} ${rfi.last_name}!`);
      fetchRFIHistory();
    } catch (error: any) {
      console.error('Error sending draft RFI:', error);
      onError(error.response?.data?.message || 'Failed to send draft RFI');
    } finally {
      setSendingRfiId(null);
    }
  };

  const handleEditDraft = (rfi: RFI) => {
    setEditingRfi(rfi);
    setFormData({
      subject: rfi.subject,
      message: rfi.message,
      priority: rfi.priority,
      response_needed_by: rfi.response_needed_by || ''
    });
    
    // Find and select the customer and contact
    const customer = customers.find(c => c.id === rfi.customer_id);
    if (customer) {
      handleCustomerChange(customer.id);
      // The contact will be selected after customer data loads
      setTimeout(() => {
        setSelectedContact(selectedCustomer?.contacts?.find(c => c.id === rfi.contact_id) || null);
      }, 100);
    }
  };

  const handleCancelEdit = () => {
    setEditingRfi(null);
    setFormData({
      subject: '',
      message: '',
      priority: 'medium',
      response_needed_by: ''
    });
  };

  const handleUpdateDraft = async (action: 'draft' | 'send') => {
    if (!editingRfi) return;

    setLoading(true);
    
    try {
      await rfiAPI.updateRFI(editingRfi.id, {
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        response_needed_by: formData.response_needed_by || undefined
      });

      if (action === 'send') {
        await rfiAPI.sendRFI(editingRfi.id);
        onSuccess('Draft RFI updated and sent successfully!');
      } else {
        onSuccess('Draft RFI updated successfully!');
      }

      handleCancelEdit();
      fetchRFIHistory();
      
    } catch (error: any) {
      console.error('Error updating draft RFI:', error);
      onError(error.response?.data?.message || 'Failed to update draft RFI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* RFI Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {editingRfi ? 'Edit Draft RFI' : 'Create RFI'}
        </h3>
        
        {/* Project Customer Info */}
        {project && project.customer_id ? (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Project Customer:</strong> {project.customer_name}
              <span className="ml-2 text-blue-600">(This customer will be auto-selected below)</span>
            </p>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This project doesn't have an associated customer. You'll need to select a customer manually.
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Customer *
                {project && project.customer_id && (
                  <span className="text-sm text-blue-600 font-normal ml-2">
                    (Auto-selected from project)
                  </span>
                )}
              </label>
              <select
                value={selectedCustomer?.id || 0}
                onChange={(e) => handleCustomerChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={0}>Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {project && project.customer_id === customer.id && ' (Project Customer)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Contact *
              </label>
              <select
                value={selectedContact?.id || 0}
                onChange={(e) => handleContactChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedCustomer}
                required
              >
                <option value={0}>Select a contact</option>
                {selectedCustomer?.contacts?.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name} 
                    {contact.email && ` (${contact.email})`}
                    {contact.is_primary && ' - Primary'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Info Display */}
          {selectedContact && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Selected Contact:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <p><strong>Name:</strong> {selectedContact.first_name} {selectedContact.last_name}</p>
                <p><strong>Email:</strong> {selectedContact.email || 'No email'}</p>
                <p><strong>Phone:</strong> {selectedContact.phone || 'No phone'}</p>
                <p><strong>Position:</strong> {selectedContact.position || 'Not specified'}</p>
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Enter RFI subject"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter your request for information..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
              required
            />
          </div>

          {/* Priority and Response Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Response Needed By
              </label>
              <input
                type="date"
                value={formData.response_needed_by}
                onChange={(e) => setFormData({ ...formData, response_needed_by: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3">
            {editingRfi && (
              <button
                onClick={handleCancelEdit}
                disabled={loading}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => editingRfi ? handleUpdateDraft('draft') : handleSubmit('draft')}
              disabled={loading || !selectedCustomer || !selectedContact || !formData.subject.trim() || !formData.message.trim()}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{editingRfi ? 'Updating...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>{editingRfi ? 'Update Draft' : 'Save as Draft'}</span>
                </>
              )}
            </button>
            <button
              onClick={() => editingRfi ? handleUpdateDraft('send') : handleSubmit('send')}
              disabled={loading || !selectedCustomer || !selectedContact || !formData.subject.trim() || !formData.message.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{editingRfi ? 'Updating & Sending...' : 'Sending...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{editingRfi ? 'Update & Send' : 'Send RFI'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RFI History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">RFI History</h3>
          <button
            onClick={fetchRFIHistory}
            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {loadingHistory ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading RFI history...</p>
          </div>
        ) : rfis.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No RFIs sent yet for this project</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rfis.map(rfi => (
              <div key={rfi.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{rfi.subject}</h4>
                    <p className="text-sm text-gray-600">
                      To: {rfi.first_name} {rfi.last_name} ({rfi.contact_email})
                    </p>
                    <p className="text-sm text-gray-600">
                      From: {rfi.sent_by_username}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(rfi.priority)}`}>
                        {rfi.priority.charAt(0).toUpperCase() + rfi.priority.slice(1)} Priority
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rfi.status)}`}>
                        {rfi.status.charAt(0).toUpperCase() + rfi.status.slice(1)}
                      </span>
                    </div>
                    
                    {/* Draft Actions */}
                    {rfi.status === 'draft' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditDraft(rfi)}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleSendDraft(rfi)}
                          disabled={sendingRfiId === rfi.id}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {sendingRfiId === rfi.id ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 rounded">
                  {rfi.message}
                </p>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>
                    Sent: {new Date(rfi.created_at).toLocaleDateString()} at {new Date(rfi.created_at).toLocaleTimeString()}
                  </span>
                  {rfi.response_needed_by && (
                    <span>
                      Response needed by: {new Date(rfi.response_needed_by).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                {rfi.error_message && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Error:</strong> {rfi.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RFIForm; 