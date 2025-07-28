import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Customer, Contact, CreateCustomerRequest, UpdateCustomerRequest, CreateContactRequest, UpdateContactRequest } from '../types';
import { customersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

const Customers: React.FC = () => {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Form states
  const [customerFormData, setCustomerFormData] = useState<CreateCustomerRequest>({
    name: '',
    description: '',
    industry: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: ''
  });
  
  const [contactFormData, setContactFormData] = useState<CreateContactRequest>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    is_primary: false,
    notes: ''
  });

  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [customerContacts, setCustomerContacts] = useState<Record<number, Contact[]>>({});

  const toggleExpand = async (customerId: number) => {
    if (expandedIds.includes(customerId)) {
      setExpandedIds(expandedIds.filter(id => id !== customerId));
    } else {
      setExpandedIds([...expandedIds, customerId]);
      if (!customerContacts[customerId]) {
        try {
          const response = await customersAPI.getCustomer(customerId);
          setCustomerContacts(prev => ({ ...prev, [customerId]: response.customer.contacts || [] }));
        } catch (err) {
          console.error('Failed to load contacts', err);
        }
      }
    }
  };

  const loadCustomers = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await customersAPI.getCustomers(page, 10, search);
      setCustomers(response.customers);
      setTotalPages(response.pagination.totalPages);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers(1, searchTerm);
  }, [loadCustomers, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadCustomers(1, searchTerm);
  };

  const handlePageChange = (page: number) => {
    loadCustomers(page, searchTerm);
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Customer CRUD operations
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      clearMessages();
      await customersAPI.createCustomer(customerFormData);
      setSuccess('Customer created successfully');
      setShowCustomerForm(false);
      resetCustomerForm();
      loadCustomers(currentPage, searchTerm);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create customer');
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    
    try {
      clearMessages();
      await customersAPI.updateCustomer(editingCustomer.id, customerFormData);
      setSuccess('Customer updated successfully');
      setShowCustomerForm(false);
      setEditingCustomer(null);
      resetCustomerForm();
      loadCustomers(currentPage, searchTerm);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update customer');
    }
  };

  const handleDeleteCustomer = async (customerId: number) => {
    if (!window.confirm('Are you sure you want to delete this customer? This will also delete all associated contacts.')) return;
    
    try {
      clearMessages();
      await customersAPI.deleteCustomer(customerId);
      setSuccess('Customer deleted successfully');
      loadCustomers(currentPage, searchTerm);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  // Contact CRUD operations
  const handleViewCustomer = async (customer: Customer) => {
    try {
      const response = await customersAPI.getCustomer(customer.id);
      setSelectedCustomer(response.customer);
    } catch (err: any) {
      setError('Failed to load customer details');
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    try {
      clearMessages();
      await customersAPI.createContact(selectedCustomer.id, contactFormData);
      setSuccess('Contact created successfully');
      setShowContactForm(false);
      resetContactForm();
      // Refresh customer data
      handleViewCustomer(selectedCustomer);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create contact');
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !editingContact) return;
    
    try {
      clearMessages();
      await customersAPI.updateContact(selectedCustomer.id, editingContact.id, contactFormData);
      setSuccess('Contact updated successfully');
      setShowContactForm(false);
      setEditingContact(null);
      resetContactForm();
      // Refresh customer data
      handleViewCustomer(selectedCustomer);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update contact');
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!selectedCustomer) return;
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      clearMessages();
      await customersAPI.deleteContact(selectedCustomer.id, contactId);
      setSuccess('Contact deleted successfully');
      // Refresh customer data
      handleViewCustomer(selectedCustomer);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete contact');
    }
  };

  // Form helpers
  const resetCustomerForm = () => {
    setCustomerFormData({
      name: '',
      description: '',
      industry: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: ''
    });
  };

  const resetContactForm = () => {
    setContactFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      is_primary: false,
      notes: ''
    });
  };

  const openCreateCustomerForm = () => {
    resetCustomerForm();
    setEditingCustomer(null);
    setShowCustomerForm(true);
  };

  const openEditCustomerForm = (customer: Customer) => {
    setCustomerFormData({
      name: customer.name,
      description: customer.description || '',
      industry: customer.industry || '',
      website: customer.website || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || '',
      postal_code: customer.postal_code || ''
    });
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const openCreateContactForm = () => {
    resetContactForm();
    setEditingContact(null);
    setShowContactForm(true);
  };

  const openEditContactForm = (contact: Contact) => {
    setContactFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
      department: contact.department || '',
      is_primary: contact.is_primary,
      notes: contact.notes || ''
    });
    setEditingContact(contact);
    setShowContactForm(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">You need admin privileges to access customer management.</p>
        <Link to="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
          Go back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <Link
                to="/dashboard"
                className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-gray-600 mt-1">Manage your electrical clients and their project contacts</p>
          </div>
          <button
            onClick={openCreateCustomerForm}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearMessages} className="text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={clearMessages} className="text-green-500 hover:text-green-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </form>

      {/* Customers List */}
      {loading && customers.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading customers...</div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        {customer.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{customer.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{customer.industry || 'Not specified'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {customer.email && <div>{customer.email}</div>}
                        {customer.phone && <div>{customer.phone}</div>}
                        {!customer.email && !customer.phone && <span className="text-gray-500">No contact info</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => toggleExpand(customer.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {expandedIds.includes(customer.id) ? 'Hide' : 'View'}
                      </button>
                      <button
                        onClick={() => openEditCustomerForm(customer)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {expandedIds.includes(customer.id) && <tr>
                    <td colSpan={5} className="p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
                        <button
                          onClick={openCreateContactForm}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Add Contact
                        </button>
                      </div>
                      {customerContacts[customer.id] && customerContacts[customer.id].length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {customerContacts[customer.id].map((contact) => (
                            <div key={contact.id} className="bg-white rounded-lg p-4 border">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {contact.first_name} {contact.last_name}
                                    {contact.is_primary && (
                                      <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        Primary
                                      </span>
                                    )}
                                  </h4>
                                  {contact.position && (
                                    <p className="text-sm text-gray-600">{contact.position}</p>
                                  )}
                                  {contact.department && (
                                    <p className="text-sm text-gray-600">{contact.department}</p>
                                  )}
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => openEditContactForm(contact)}
                                    className="text-indigo-600 hover:text-indigo-900 text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteContact(contact.id)}
                                    className="text-red-600 hover:text-red-900 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                {contact.email && (
                                  <p className="text-sm text-gray-600">📧 {contact.email}</p>
                                )}
                                {contact.phone && (
                                  <p className="text-sm text-gray-600">📞 {contact.phone}</p>
                                )}
                                {contact.notes && (
                                  <p className="text-sm text-gray-600 mt-2 italic">{contact.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-white rounded-lg border">
                          <p className="text-gray-500">No contacts added yet.</p>
                          <button
                            onClick={openCreateContactForm}
                            className="mt-2 text-blue-600 hover:underline text-sm"
                          >
                            Add the first contact
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>}
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
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
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}

          {customers.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No customers</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new customer.</p>
              <div className="mt-6">
                <button
                  onClick={openCreateCustomerForm}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Customer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Create New Customer'}
              </h2>
            </div>
            
            <form onSubmit={editingCustomer ? handleUpdateCustomer : handleCreateCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={customerFormData.name}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={customerFormData.description}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    id="industry"
                    value={customerFormData.industry}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    value={customerFormData.website}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={customerFormData.address}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={customerFormData.city}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    State/Province
                  </label>
                  <input
                    type="text"
                    id="state"
                    value={customerFormData.state}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    id="country"
                    value={customerFormData.country}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    id="postal_code"
                    value={customerFormData.postal_code}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerForm(false);
                    setEditingCustomer(null);
                    resetCustomerForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCustomer ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">{selectedCustomer.name}</h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Customer Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
                  <dl className="space-y-3">
                    {selectedCustomer.description && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="text-sm text-gray-900">{selectedCustomer.description}</dd>
                      </div>
                    )}
                    {selectedCustomer.industry && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Industry</dt>
                        <dd className="text-sm text-gray-900">{selectedCustomer.industry}</dd>
                      </div>
                    )}
                    {selectedCustomer.website && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Website</dt>
                        <dd className="text-sm text-gray-900">
                          <a href={selectedCustomer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {selectedCustomer.website}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <dl className="space-y-3">
                    {selectedCustomer.email && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                        <dd className="text-sm text-gray-900">{selectedCustomer.email}</dd>
                      </div>
                    )}
                    {selectedCustomer.phone && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="text-sm text-gray-900">{selectedCustomer.phone}</dd>
                      </div>
                    )}
                    {(selectedCustomer.address || selectedCustomer.city || selectedCustomer.state || selectedCustomer.country) && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                        <dd className="text-sm text-gray-900">
                          {selectedCustomer.address && <div>{selectedCustomer.address}</div>}
                          <div>
                            {[selectedCustomer.city, selectedCustomer.state, selectedCustomer.postal_code].filter(Boolean).join(', ')}
                            {selectedCustomer.country && <div>{selectedCustomer.country}</div>}
                          </div>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Contacts Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
                  <button
                    onClick={openCreateContactForm}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Add Contact
                  </button>
                </div>

                {selectedCustomer.contacts && selectedCustomer.contacts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCustomer.contacts.map((contact) => (
                      <div key={contact.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {contact.first_name} {contact.last_name}
                              {contact.is_primary && (
                                <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Primary
                                </span>
                              )}
                            </h4>
                            {contact.position && (
                              <p className="text-sm text-gray-600">{contact.position}</p>
                            )}
                            {contact.department && (
                              <p className="text-sm text-gray-600">{contact.department}</p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEditContactForm(contact)}
                              className="text-indigo-600 hover:text-indigo-900 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {contact.email && (
                            <p className="text-sm text-gray-600">📧 {contact.email}</p>
                          )}
                          {contact.phone && (
                            <p className="text-sm text-gray-600">📞 {contact.phone}</p>
                          )}
                          {contact.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">{contact.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No contacts added yet.</p>
                    <button
                      onClick={openCreateContactForm}
                      className="mt-2 text-blue-600 hover:underline text-sm"
                    >
                      Add the first contact
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h2>
            </div>
            
            <form onSubmit={editingContact ? handleUpdateContact : handleCreateContact} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    value={contactFormData.first_name}
                    onChange={(e) => setContactFormData({ ...contactFormData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    value={contactFormData.last_name}
                    onChange={(e) => setContactFormData({ ...contactFormData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    id="position"
                    value={contactFormData.position}
                    onChange={(e) => setContactFormData({ ...contactFormData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    id="department"
                    value={contactFormData.department}
                    onChange={(e) => setContactFormData({ ...contactFormData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={contactFormData.is_primary}
                    onChange={(e) => setContactFormData({ ...contactFormData, is_primary: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Primary Contact</span>
                </label>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={contactFormData.notes}
                  onChange={(e) => setContactFormData({ ...contactFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowContactForm(false);
                    setEditingContact(null);
                    resetContactForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers; 