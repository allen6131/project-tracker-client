import React, { useState, useEffect } from 'react';
import { Customer, Contact } from '../types';
import { customersAPI } from '../services/api';

interface CustomerInfoProps {
  customerId: number | null;
  customerName?: string | null;
}

const CustomerInfo: React.FC<CustomerInfoProps> = ({ customerId, customerName }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedContact, setExpandedContact] = useState<number | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!customerId) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await customersAPI.getCustomer(customerId);
        setCustomer(response.customer);
      } catch (err: any) {
        setError('Failed to load customer information');
        console.error('Fetch customer error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const toggleContactExpansion = (contactId: number) => {
    setExpandedContact(expandedContact === contactId ? null : contactId);
  };

  if (!customerId) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m14 0V9a2 2 0 00-2-2M9 7h6m-6 4h6m-6 4h6" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Customer Assigned</h3>
          <p className="text-gray-500">This project doesn't have a customer assigned to it.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500">
          <span>Customer information not available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{customer.name}</h3>
            {customer.industry && (
              <p className="text-sm text-gray-500">{customer.industry}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Customer since</div>
            <div className="text-sm font-medium text-gray-900">{formatDate(customer.created_at)}</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Company Description */}
        {customer.description && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">About</h4>
            <p className="text-gray-700">{customer.description}</p>
          </div>
        )}

        {/* Company Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
            <dl className="space-y-2">
              {customer.email && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt>
                  <dd className="text-sm text-gray-900">
                    <a href={`mailto:${customer.email}`} className="text-blue-600 hover:text-blue-800">
                      {customer.email}
                    </a>
                  </dd>
                </div>
              )}
              {customer.phone && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</dt>
                  <dd className="text-sm text-gray-900">
                    <a href={`tel:${customer.phone}`} className="text-blue-600 hover:text-blue-800">
                      {customer.phone}
                    </a>
                  </dd>
                </div>
              )}
              {customer.website && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Website</dt>
                  <dd className="text-sm text-gray-900">
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
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Address Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Address</h4>
            {(customer.address || customer.city || customer.state || customer.country) ? (
              <div className="text-sm text-gray-900">
                {customer.address && <div className="mb-1">{customer.address}</div>}
                <div>
                  {[customer.city, customer.state, customer.postal_code].filter(Boolean).join(', ')}
                </div>
                {customer.country && <div className="mt-1">{customer.country}</div>}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No address information available</div>
            )}
          </div>
        </div>

        {/* Contacts Section */}
        {customer.contacts && customer.contacts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Contacts ({customer.contacts.length})
            </h4>
            <div className="space-y-3">
              {customer.contacts.map((contact) => (
                <div key={contact.id} className="border border-gray-200 rounded-lg">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleContactExpansion(contact.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {contact.first_name} {contact.last_name}
                            </span>
                            {contact.is_primary && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Primary
                              </span>
                            )}
                          </div>
                          {contact.position && (
                            <div className="text-sm text-gray-500">{contact.position}</div>
                          )}
                        </div>
                      </div>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transform transition-transform ${
                          expandedContact === contact.id ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {expandedContact === contact.id && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {contact.email && (
                          <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt>
                            <dd className="text-sm text-gray-900">
                              <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800">
                                {contact.email}
                              </a>
                            </dd>
                          </div>
                        )}
                        {contact.phone && (
                          <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</dt>
                            <dd className="text-sm text-gray-900">
                              <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-800">
                                {contact.phone}
                              </a>
                            </dd>
                          </div>
                        )}
                        {contact.department && (
                          <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</dt>
                            <dd className="text-sm text-gray-900">{contact.department}</dd>
                          </div>
                        )}
                        {contact.notes && (
                          <div className="sm:col-span-2">
                            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</dt>
                            <dd className="text-sm text-gray-900">{contact.notes}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Contacts Message */}
        {(!customer.contacts || customer.contacts.length === 0) && (
          <div className="text-center py-4">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm text-gray-500">No contacts available for this customer</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerInfo; 