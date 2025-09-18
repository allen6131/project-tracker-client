import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  ServiceCall, 
  CreateServiceCallRequest, 
  UpdateServiceCallRequest
} from '../types';
import { serviceCallsAPI, customersAPI, projectsAPI } from '../services/api';

const ServiceCalls: React.FC = () => {
  const { isAdmin } = useAuth();
  
  // State management
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingServiceCall, setEditingServiceCall] = useState<ServiceCall | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_id: null as number | null,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    project_id: null as number | null,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    service_type: '',
    scheduled_date: '',
    technician_id: null as number | null,
    estimated_hours: null as number | null,
    hourly_rate: null as number | null,
    materials_cost: null as number | null,
    notes: ''
  });
  
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string; customer_id?: number | null }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: number; username: string; email: string }[]>([]);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');

  // Filter projects based on selected customer
  const filteredProjects = formData.customer_id 
    ? projects.filter(project => project.customer_id === formData.customer_id)
    : projects;

  const toggleDropdown = (serviceCallId: number) => {
    setOpenDropdownId(openDropdownId === serviceCallId ? null : serviceCallId);
  };

  const loadServiceCalls = useCallback(async () => {
    try {
      setLoading(true);
      const technicianId = technicianFilter ? parseInt(technicianFilter) : undefined;
      const response = await serviceCallsAPI.getServiceCalls(
        currentPage, 
        10, 
        searchTerm, 
        statusFilter, 
        priorityFilter, 
        technicianId
      );
      setServiceCalls(response.serviceCalls);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load service calls');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, priorityFilter, technicianFilter]);

  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getSimpleCustomers();
      setCustomers(response.customers);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getProjects(1, 100, '', '');
      setProjects(response.projects);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadTechnicians = async () => {
    try {
      const response = await serviceCallsAPI.getTechnicians();
      setTechnicians(response.technicians);
    } catch (err) {
      console.error('Failed to load technicians:', err);
    }
  };

  useEffect(() => {
    loadServiceCalls();
  }, [currentPage, searchTerm, statusFilter, priorityFilter, technicianFilter]);

  useEffect(() => {
    loadCustomers();
    loadProjects();
    loadTechnicians();
  }, []);

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
      project_id: null,
      priority: 'medium',
      service_type: '',
      scheduled_date: '',
      technician_id: null,
      estimated_hours: null,
      hourly_rate: null,
      materials_cost: null,
      notes: ''
    });
  };

  const handleCreate = () => {
    clearMessages();
    resetForm();
    setEditingServiceCall(null);
    setShowForm(true);
  };

  const handleEdit = (serviceCall: ServiceCall) => {
    clearMessages();
    setEditingServiceCall(serviceCall);
    setFormData({
      title: serviceCall.title,
      description: serviceCall.description || '',
      customer_id: serviceCall.customer_id ?? null,
      customer_name: serviceCall.customer_name,
      customer_email: serviceCall.customer_email || '',
      customer_phone: serviceCall.customer_phone || '',
      customer_address: serviceCall.customer_address || '',
      project_id: serviceCall.project_id ?? null,
      priority: serviceCall.priority,
      service_type: serviceCall.service_type || '',
      scheduled_date: serviceCall.scheduled_date ? serviceCall.scheduled_date.split('T')[0] : '',
      technician_id: serviceCall.technician_id ?? null,
      estimated_hours: serviceCall.estimated_hours ?? null,
      hourly_rate: serviceCall.hourly_rate ?? null,
      materials_cost: serviceCall.materials_cost ?? null,
      notes: serviceCall.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (serviceCallId: number) => {
    if (window.confirm('Are you sure you want to delete this service call?')) {
      try {
        await serviceCallsAPI.deleteServiceCall(serviceCallId);
        setSuccess('Service call deleted successfully');
        loadServiceCalls();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete service call');
      }
    }
  };

  const handleQuickStatusUpdate = async (serviceCallId: number, newStatus: 'open' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const updateData: UpdateServiceCallRequest = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }
      await serviceCallsAPI.updateServiceCall(serviceCallId, updateData);
      setSuccess(`Service call status updated to ${newStatus.replace('_', ' ')}`);
      loadServiceCalls();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCustomerChange = (customerId: number | null) => {
    const selectedCustomer = customers.find(c => c.id === customerId);
    setFormData(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: selectedCustomer?.name || '',
      project_id: null // Reset project when customer changes
    }));
  };

  const calculateTotalCost = () => {
    const hours = formData.estimated_hours || 0;
    const rate = formData.hourly_rate || 0;
    const materials = formData.materials_cost || 0;
    return (hours * rate) + materials;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setFormLoading(true);
      clearMessages();

      const serviceCallData: CreateServiceCallRequest | UpdateServiceCallRequest = {
        title: formData.title,
        description: formData.description || undefined,
        customer_id: formData.customer_id,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email || undefined,
        customer_phone: formData.customer_phone || undefined,
        customer_address: formData.customer_address || undefined,
        project_id: formData.project_id,
        priority: formData.priority,
        service_type: formData.service_type || undefined,
        scheduled_date: formData.scheduled_date || undefined,
        technician_id: formData.technician_id,
        estimated_hours: formData.estimated_hours,
        hourly_rate: formData.hourly_rate,
        materials_cost: formData.materials_cost,
        notes: formData.notes || undefined
      };

      if (editingServiceCall) {
        await serviceCallsAPI.updateServiceCall(editingServiceCall.id, serviceCallData as UpdateServiceCallRequest);
        setSuccess('Service call updated successfully');
      } else {
        await serviceCallsAPI.createServiceCall(serviceCallData as CreateServiceCallRequest);
        setSuccess('Service call created successfully');
      }

      setShowForm(false);
      loadServiceCalls();
    } catch (err: any) {
      console.error('Error submitting service call:', err);
      setError(err.response?.data?.message || 'Failed to save service call');
    } finally {
      setFormLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading && serviceCalls.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading service calls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Calls</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage and track electrical service calls
                </p>
              </div>
              <button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                New Service Call
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Search service calls..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <select
                  value={technicianFilter}
                  onChange={(e) => setTechnicianFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Technicians</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id.toString()}>
                      {tech.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setPriorityFilter('');
                    setTechnicianFilter('');
                    setCurrentPage(1);
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
                >
                  Clear Filters
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

        {/* Service Calls List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Title & Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Technician
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {serviceCalls.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg font-medium">No service calls found</p>
                        <p className="text-sm">Create your first service call to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  serviceCalls.map((serviceCall) => (
                    <tr key={serviceCall.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {serviceCall.ticket_number}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(serviceCall.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {serviceCall.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {serviceCall.customer_name}
                        </div>
                        {serviceCall.project_name && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            Project: {serviceCall.project_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(serviceCall.priority)}`}>
                          {serviceCall.priority.charAt(0).toUpperCase() + serviceCall.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(serviceCall.status)}`}>
                          {serviceCall.status.replace('_', ' ').charAt(0).toUpperCase() + serviceCall.status.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {serviceCall.technician_name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {serviceCall.scheduled_date ? new Date(serviceCall.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {serviceCall.total_cost ? `$${serviceCall.total_cost.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative">
                          <button
                            onClick={() => toggleDropdown(serviceCall.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          
                          {openDropdownId === serviceCall.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                              <button
                                onClick={() => {
                                  handleEdit(serviceCall);
                                  setOpenDropdownId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              
                              {serviceCall.status !== 'completed' && (
                                <>
                                  <button
                                    onClick={() => {
                                      handleQuickStatusUpdate(serviceCall.id, 'in_progress');
                                      setOpenDropdownId(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Mark In Progress
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleQuickStatusUpdate(serviceCall.id, 'completed');
                                      setOpenDropdownId(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Mark Completed
                                  </button>
                                </>
                              )}
                              
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    handleDelete(serviceCall.id);
                                    setOpenDropdownId(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              )}
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
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingServiceCall ? 'Edit Service Call' : 'Create New Service Call'}
              </h3>
              
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority *
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Customer Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Customer
                    </label>
                    <select
                      value={formData.customer_id || ''}
                      onChange={(e) => handleCustomerChange(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Service Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Project
                    </label>
                    <select
                      value={formData.project_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value ? parseInt(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select Project</option>
                      {filteredProjects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Service Type
                    </label>
                    <input
                      type="text"
                      value={formData.service_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
                      placeholder="e.g., Emergency, Maintenance, Installation, Repair"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Technician
                    </label>
                    <select
                      value={formData.technician_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, technician_id: e.target.value ? parseInt(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select Technician</option>
                      {technicians.map(tech => (
                        <option key={tech.id} value={tech.id}>
                          {tech.username}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cost Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.estimated_hours || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value ? parseFloat(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Hourly Rate ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hourly_rate || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value ? parseFloat(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Materials Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.materials_cost || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, materials_cost: e.target.value ? parseFloat(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Total Cost Display */}
                {(formData.estimated_hours && formData.hourly_rate) || formData.materials_cost ? (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Estimated Total: ${calculateTotalCost().toFixed(2)}
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {formLoading ? 'Saving...' : (editingServiceCall ? 'Update Service Call' : 'Create Service Call')}
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

export default ServiceCalls;
