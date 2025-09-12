import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Customer, Contact, Project, CreateCustomerRequest, UpdateCustomerRequest, CreateContactRequest, UpdateContactRequest } from '../types';
import { customersAPI, projectsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

const Customers: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  
  // Modal states
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerProjects, setCustomerProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Expandable rows
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [customerContacts, setCustomerContacts] = useState<Record<number, Contact[]>>({});

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

  const toggleDropdown = (customerId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDropdownId(openDropdownId === customerId ? null : customerId);
  };

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
    setOpenDropdownId(null);
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
      setProjectsLoading(true);
      const response = await customersAPI.getCustomer(customer.id);
      setSelectedCustomer(response.customer);
      
      // Fetch projects for this customer
      try {
        const projectsResponse = await projectsAPI.getProjectsByCustomer(customer.id);
        setCustomerProjects(projectsResponse.projects);
      } catch (projectsErr) {
        console.warn('Failed to fetch customer projects:', projectsErr);
        setCustomerProjects([]);
      }
    } catch (err: any) {
      setError('Failed to load customer details');
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    try {
      clearMessages();
      console.log('Creating contact for customer', selectedCustomer.id, contactFormData);
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
      console.log('Updating contact', editingContact.id, 'for customer', selectedCustomer.id, contactFormData);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard">
                <Logo size="md" />
              </Link>
              <span className="ml-4 text-lg text-gray-600 dark:text-gray-300">Customer Management</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 dark:text-gray-200">Welcome, {user?.username}</span>
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
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Customer Management</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Manage your electrical clients and their project contacts
                  </p>
                </div>
                <button
                  onClick={openCreateCustomerForm}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Add Customer
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
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </form>
          </div>
        </div>

        {/* Customers List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
            <div className="text-center text-gray-900 dark:text-white">Loading customers...</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {customers.map((customer) => (
                    <React.Fragment key={customer.id}>
                      <tr 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => {
                          navigate(`/customers/${customer.id}`);
                          setOpenDropdownId(null);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{customer.name}</div>
                          {customer.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{customer.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {customer.industry || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {customer.email && <div>{customer.email}</div>}
                            {customer.phone && <div>{customer.phone}</div>}
                            {!customer.email && !customer.phone && <span className="text-gray-500 dark:text-gray-400">No contact info</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(customer.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="relative dropdown-container">
                            <button
                              onClick={(e) => toggleDropdown(customer.id, e)}
                              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            
                            {openDropdownId === customer.id && (
                              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/customers/${customer.id}/contacts`);
                                      setOpenDropdownId(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Manage Contacts
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedIds.includes(customer.id) && (
                        <tr>
                          <td colSpan={5} className="p-4 bg-gray-50 dark:bg-gray-700">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Contacts</h3>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); openCreateContactForm(); }}
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                              >
                                Add Contact
                              </button>
                            </div>
                            {customerContacts[customer.id] && customerContacts[customer.id].length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {customerContacts[customer.id].map((contact) => (
                                  <div key={contact.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                          {contact.first_name} {contact.last_name}
                                          {contact.is_primary && (
                                            <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                              Primary
                                            </span>
                                          )}
                                        </h4>
                                        {contact.position && (
                                          <p className="text-sm text-gray-600 dark:text-gray-400">{contact.position}</p>
                                        )}
                                        {contact.department && (
                                          <p className="text-sm text-gray-600 dark:text-gray-400">{contact.department}</p>
                                        )}
                                      </div>
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); openEditContactForm(contact); }}
                                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); handleDeleteContact(contact.id); }}
                                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      {contact.email && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">📧 {contact.email}</p>
                                      )}
                                      {contact.phone && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">📞 {contact.phone}</p>
                                      )}
                                      {contact.notes && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">{contact.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                <p className="text-gray-500 dark:text-gray-400">No contacts added yet.</p>
                                <button
                                  onClick={openCreateContactForm}
                                  className="mt-2 text-blue-600 hover:underline text-sm dark:text-blue-400"
                                >
                                  Add the first contact
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {/* Add empty rows when there are fewer than 5 customers to ensure dropdown has space */}
                  {customers.length > 0 && customers.length < 5 && Array.from({ length: 5 - customers.length }).map((_, index) => (
                    <tr key={`empty-customer-${index}`} className="pointer-events-none">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-transparent">.</div>
                        <div className="text-sm text-transparent">.</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-transparent">.</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-transparent">.</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-transparent">.</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-transparent">.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
                          onClick={() => handlePageChange(page)}
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

            {customers.length === 0 && !loading && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No customers</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new customer.</p>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingCustomer ? 'Edit Customer' : 'Create New Customer'}
                </h2>
              </div>
              
              <form onSubmit={editingCustomer ? handleUpdateCustomer : handleCreateCustomer} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={customerFormData.name}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={customerFormData.description}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="industry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      id="industry"
                      value={customerFormData.industry}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      value={customerFormData.website}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={customerFormData.phone}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={customerFormData.email}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      value={customerFormData.address}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={customerFormData.city}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      State/Province
                    </label>
                    <input
                      type="text"
                      id="state"
                      value={customerFormData.state}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      id="country"
                      value={customerFormData.country}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      id="postal_code"
                      value={customerFormData.postal_code}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, postal_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedCustomer.name}</h2>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerProjects([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Company Information</h3>
                    <dl className="space-y-3">
                      {selectedCustomer.description && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">{selectedCustomer.description}</dd>
                        </div>
                      )}
                      {selectedCustomer.industry && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Industry</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">{selectedCustomer.industry}</dd>
                        </div>
                      )}
                      {selectedCustomer.website && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">
                            <a href={selectedCustomer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                              {selectedCustomer.website}
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Contact Information</h3>
                    <dl className="space-y-3">
                      {selectedCustomer.email && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">{selectedCustomer.email}</dd>
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">{selectedCustomer.phone}</dd>
                        </div>
                      )}
                      {(selectedCustomer.address || selectedCustomer.city || selectedCustomer.state || selectedCustomer.country) && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Contacts</h3>
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
                        <div key={contact.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {contact.first_name} {contact.last_name}
                                {contact.is_primary && (
                                  <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                    Primary
                                  </span>
                                )}
                              </h4>
                              {contact.position && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">{contact.position}</p>
                              )}
                              {contact.department && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">{contact.department}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openEditContactForm(contact)}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {contact.email && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">📧 {contact.email}</p>
                            )}
                            {contact.phone && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">📞 {contact.phone}</p>
                            )}
                            {contact.notes && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">{contact.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-gray-500 dark:text-gray-400">No contacts added yet.</p>
                      <button
                        onClick={openCreateContactForm}
                        className="mt-2 text-blue-600 hover:underline text-sm dark:text-blue-400"
                      >
                        Add the first contact
                      </button>
                    </div>
                  )}
                </div>

                {/* Projects Section */}
                <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Associated Projects ({customerProjects.length})
                    </h3>
                  </div>

                  {projectsLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading projects...</p>
                    </div>
                  ) : customerProjects.length > 0 ? (
                    <div className="space-y-3">
                      {customerProjects.map((project) => (
                        <div key={project.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {project.name}
                                </h4>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  project.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                  project.status === 'started' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                  project.status === 'bidding' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                }`}>
                                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                </span>
                              </div>
                              {project.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {project.description.length > 150 
                                    ? `${project.description.substring(0, 150)}...` 
                                    : project.description}
                                </p>
                              )}
                              {project.address && (
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {project.address.length > 80 
                                    ? `${project.address.substring(0, 80)}...` 
                                    : project.address}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {project.main_technician_username && (
                                  <span>👤 {project.main_technician_username}</span>
                                )}
                                <span>📅 {new Date(project.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Link
                                to={`/projects/${project.id}`}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                View Project
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m14 0V9a2 2 0 00-2-2M9 7h6m-6 4h6m-6 4h6" />
                      </svg>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Projects</h4>
                      <p className="text-gray-500 dark:text-gray-400">This customer doesn't have any associated projects yet.</p>
                      <Link
                        to="/projects"
                        className="mt-3 inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        Create a new project
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </Link>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </h2>
              </div>
              
              <form onSubmit={(e) => {
                console.log('Contact form submit clicked');
                return (editingContact ? handleUpdateContact : handleCreateContact)(e);
              }} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      value={contactFormData.first_name}
                      onChange={(e) => setContactFormData({ ...contactFormData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      value={contactFormData.last_name}
                      onChange={(e) => setContactFormData({ ...contactFormData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={contactFormData.email}
                    onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={contactFormData.phone}
                    onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      id="position"
                      value={contactFormData.position}
                      onChange={(e) => setContactFormData({ ...contactFormData, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      id="department"
                      value={contactFormData.department}
                      onChange={(e) => setContactFormData({ ...contactFormData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={contactFormData.is_primary}
                      onChange={(e) => setContactFormData({ ...contactFormData, is_primary: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Primary Contact</span>
                  </label>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={contactFormData.notes}
                    onChange={(e) => setContactFormData({ ...contactFormData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
    </div>
  );
};

export default Customers; 