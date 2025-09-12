import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Customer, Contact, Project, CreateContactRequest, UpdateContactRequest, UpdateCustomerRequest } from '../types';
import { customersAPI, projectsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const CustomerDetail: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Edit states
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  
  // Form data
  const [customerFormData, setCustomerFormData] = useState<UpdateCustomerRequest>({});
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

  useEffect(() => {
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!customerId || isNaN(parseInt(customerId))) {
        throw new Error('Invalid customer ID');
      }

      const customerIdNum = parseInt(customerId);

      // Load customer, contacts, and projects in parallel
      const [customerRes, contactsRes, projectsRes] = await Promise.all([
        customersAPI.getCustomer(customerIdNum),
        customersAPI.getCustomerContacts(customerIdNum),
        projectsAPI.getProjectsByCustomer(customerIdNum)
      ]);
      
      setCustomer(customerRes.customer);
      setContacts(contactsRes.contacts);
      setProjects(projectsRes.projects);
      
      // Initialize customer form data
      setCustomerFormData({
        name: customerRes.customer.name,
        description: customerRes.customer.description || '',
        industry: customerRes.customer.industry || '',
        website: customerRes.customer.website || '',
        phone: customerRes.customer.phone || '',
        email: customerRes.customer.email || '',
        address: customerRes.customer.address || '',
        city: customerRes.customer.city || '',
        state: customerRes.customer.state || '',
        country: customerRes.customer.country || '',
        postal_code: customerRes.customer.postal_code || ''
      });
      
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCustomerSave = async () => {
    if (!customer || !customerId) return;
    
    try {
      clearMessages();
      await customersAPI.updateCustomer(customer.id, customerFormData);
      setSuccess('Customer updated successfully');
      setEditingCustomer(false);
      loadCustomerData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update customer');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId) return;
    
    try {
      clearMessages();
      
      if (editingContact) {
        await customersAPI.updateContact(parseInt(customerId), editingContact.id, contactFormData);
        setSuccess('Contact updated successfully');
      } else {
        await customersAPI.createContact(parseInt(customerId), contactFormData);
        setSuccess('Contact created successfully');
      }
      
      setShowContactForm(false);
      setEditingContact(null);
      resetContactForm();
      loadCustomerData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save contact');
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!customerId) return;
    
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        clearMessages();
        await customersAPI.deleteContact(parseInt(customerId), contactId);
        setSuccess('Contact deleted successfully');
        loadCustomerData();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete contact');
      }
    }
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

  const openCreateContactForm = () => {
    resetContactForm();
    setEditingContact(null);
    setShowContactForm(true);
    clearMessages();
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
    clearMessages();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
      case 'done':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'bidding':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'started':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-center text-red-600 dark:text-red-400">Customer not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
              <button 
                onClick={() => navigate('/customers')} 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
                <p className="text-gray-600 dark:text-gray-400">Customer Details</p>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            {!editingCustomer ? (
              <button
                onClick={() => {
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
                  setEditingCustomer(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Customer</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleCustomerSave}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingCustomer(false);
                    loadCustomerData(); // Reset form data
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
      </div>

      {/* Customer Information */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Company Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company Name
            </label>
            {editingCustomer ? (
              <input
                type="text"
                value={customerFormData.name || ''}
                onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white font-medium">{customer.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Industry
            </label>
            {editingCustomer ? (
              <input
                type="text"
                value={customerFormData.industry || ''}
                onChange={(e) => setCustomerFormData({ ...customerFormData, industry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{customer.industry || 'Not specified'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone
            </label>
            {editingCustomer ? (
              <input
                type="tel"
                value={customerFormData.phone || ''}
                onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              customer.phone ? (
                <a href={`tel:${customer.phone}`} className="text-blue-600 hover:text-blue-800">
                  {customer.phone}
                </a>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No phone</p>
              )
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            {editingCustomer ? (
              <input
                type="email"
                value={customerFormData.email || ''}
                onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              customer.email ? (
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:text-blue-800">
                  {customer.email}
                </a>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No email</p>
              )
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Website
            </label>
            {editingCustomer ? (
              <input
                type="url"
                value={customerFormData.website || ''}
                onChange={(e) => setCustomerFormData({ ...customerFormData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              customer.website ? (
                <a 
                  href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  {customer.website}
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No website</p>
              )
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            {editingCustomer ? (
              <textarea
                value={customerFormData.address || ''}
                onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">
                {customer.address ? (
                  <>
                    {customer.address}
                    {(customer.city || customer.state || customer.postal_code) && (
                      <><br />
                        {[customer.city, customer.state, customer.postal_code].filter(Boolean).join(', ')}
                      </>
                    )}
                    {customer.country && <><br />{customer.country}</>}
                  </>
                ) : (
                  'No address'
                )}
              </p>
            )}
          </div>

          {editingCustomer && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={customerFormData.city || ''}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  value={customerFormData.state || ''}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={customerFormData.postal_code || ''}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, postal_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={customerFormData.country || ''}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            {editingCustomer ? (
              <textarea
                value={customerFormData.description || ''}
                onChange={(e) => setCustomerFormData({ ...customerFormData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{customer.description || 'No description'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contacts Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Contacts ({contacts.length})
          </h2>
          <button
            onClick={openCreateContactForm}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Contact</span>
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">No contacts</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Add a contact to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {contact.first_name} {contact.last_name}
                      </h3>
                      {contact.is_primary && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openEditContactForm(contact)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Edit contact"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete contact"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  {contact.position && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Position:</span> {contact.position}
                    </p>
                  )}
                  {contact.department && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Department:</span> {contact.department}
                    </p>
                  )}
                  {contact.email && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Email:</span> 
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800 ml-1">
                        {contact.email}
                      </a>
                    </p>
                  )}
                  {contact.phone && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Phone:</span> 
                      <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-800 ml-1">
                        {contact.phone}
                      </a>
                    </p>
                  )}
                  {contact.notes && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Notes:</span> {contact.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Projects ({projects.length})
          </h2>
          <Link
            to="/projects"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Create Project</span>
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">No projects</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">This customer doesn't have any projects yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Main Technician
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {project.description.length > 100
                              ? `${project.description.substring(0, 100)}...`
                              : project.description}
                          </div>
                        )}
                        {project.address && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            📍 {project.address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.project_type === 'service-call' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {project.project_type === 'service-call' ? 'Service Call' : 'Custom Work'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(project.status)}`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {project.main_technician_username || (
                        <span className="text-gray-500 dark:text-gray-400 italic">No technician assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(project.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View Project
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button
                onClick={() => {
                  setShowContactForm(false);
                  setEditingContact(null);
                  resetContactForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactFormData.first_name}
                    onChange={(e) => setContactFormData({ ...contactFormData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactFormData.last_name}
                    onChange={(e) => setContactFormData({ ...contactFormData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={contactFormData.position}
                    onChange={(e) => setContactFormData({ ...contactFormData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={contactFormData.department}
                    onChange={(e) => setContactFormData({ ...contactFormData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Primary Contact</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={contactFormData.notes}
                  onChange={(e) => setContactFormData({ ...contactFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editingContact ? 'Update Contact' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;
