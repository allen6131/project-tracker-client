import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { serviceCallsAPI, customersAPI, projectsAPI } from '../services/api';
import { ServiceCall, UpdateServiceCallRequest } from '../types';

const ServiceCallEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { } = useAuth();

  const serviceCallId = useMemo(() => (id ? parseInt(id, 10) : NaN), [id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [serviceCall, setServiceCall] = useState<ServiceCall | null>(null);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string; customer_id?: number | null }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: number; username: string; email: string }[]>([]);

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
    status: 'open' as 'open' | 'in_progress' | 'completed' | 'cancelled',
    service_type: '',
    scheduled_date: '',
    completed_date: '',
    technician_id: null as number | null,
    estimated_hours: null as number | null,
    actual_hours: null as number | null,
    hourly_rate: null as number | null,
    materials_cost: null as number | null,
    total_cost: null as number | null,
    notes: ''
  });

  // Filter projects based on selected customer
  const filteredProjects = formData.customer_id 
    ? projects.filter(project => project.customer_id === formData.customer_id)
    : projects;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!serviceCallId || Number.isNaN(serviceCallId)) {
          throw new Error('Invalid service call id');
        }

        const [serviceCallRes, customersRes, projectsRes, techniciansRes] = await Promise.all([
          serviceCallsAPI.getServiceCall(serviceCallId),
          customersAPI.getSimpleCustomers(),
          projectsAPI.getProjects(1, 100, ''),
          serviceCallsAPI.getTechnicians()
        ]);

        if (!mounted) return;

        const sc = serviceCallRes.serviceCall;
        setServiceCall(sc);
        setCustomers(customersRes.customers);
        setProjects(projectsRes.projects);
        setTechnicians(techniciansRes.technicians);

        setFormData({
          title: sc.title || '',
          description: sc.description || '',
          customer_id: sc.customer_id ?? null,
          customer_name: sc.customer_name || '',
          customer_email: sc.customer_email || '',
          customer_phone: sc.customer_phone || '',
          customer_address: sc.customer_address || '',
          project_id: sc.project_id ?? null,
          priority: sc.priority,
          status: sc.status,
          service_type: sc.service_type || '',
          scheduled_date: formatDateForInput(sc.scheduled_date || ''),
          completed_date: formatDateForInput(sc.completed_date || ''),
          technician_id: sc.technician_id ?? null,
          estimated_hours: sc.estimated_hours ?? null,
          actual_hours: sc.actual_hours ?? null,
          hourly_rate: sc.hourly_rate ?? null,
          materials_cost: sc.materials_cost ?? null,
          total_cost: sc.total_cost ?? null,
          notes: sc.notes || ''
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load service call');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [serviceCallId]);

  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
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
    const hours = formData.actual_hours || formData.estimated_hours || 0;
    const rate = formData.hourly_rate || 0;
    const materials = formData.materials_cost || 0;
    return (hours * rate) + materials;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceCall) return;

    try {
      setSaving(true);
      setError(null);

      const updateData: UpdateServiceCallRequest = {
        title: formData.title,
        description: formData.description || undefined,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email || undefined,
        customer_phone: formData.customer_phone || undefined,
        customer_address: formData.customer_address || undefined,
        project_id: formData.project_id,
        priority: formData.priority,
        status: formData.status,
        service_type: formData.service_type || undefined,
        scheduled_date: formData.scheduled_date || undefined,
        completed_date: formData.completed_date || undefined,
        technician_id: formData.technician_id,
        estimated_hours: formData.estimated_hours,
        actual_hours: formData.actual_hours,
        hourly_rate: formData.hourly_rate,
        materials_cost: formData.materials_cost,
        total_cost: formData.total_cost,
        notes: formData.notes || undefined
      };

      await serviceCallsAPI.updateServiceCall(serviceCall.id, updateData);
      setSuccess('Service call updated successfully');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/service-calls');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update service call');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/service-calls');
  };

  const handleGenerateInvoice = async () => {
    if (!serviceCall) return;

    try {
      setGeneratingInvoice(true);
      setError(null);

      await serviceCallsAPI.generateServiceCallInvoice(serviceCall.id);
      setSuccess('Invoice generated successfully! Redirecting to invoices...');
      
      // Navigate to invoices after a short delay
      setTimeout(() => {
        navigate('/invoices');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading service call...</p>
        </div>
      </div>
    );
  }

  if (!serviceCall) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Service call not found</p>
          <button
            onClick={() => navigate('/service-calls')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Service Calls
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
                  Edit Service Call #{serviceCall.ticket_number}
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Customer: {serviceCall.customer_name}
                </p>
              </div>
              <div className="flex space-x-3">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
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
            </div>
          </div>

          {/* Service Details */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Service Details</h3>
            </div>
            <div className="p-6 space-y-4">
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
                    Completed Date
                  </label>
                  <input
                    type="date"
                    value={formData.completed_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, completed_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cost Information */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Cost Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Actual Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.actual_hours || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, actual_hours: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Calculated Total Display */}
              {((formData.estimated_hours || formData.actual_hours) && formData.hourly_rate) || formData.materials_cost ? (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Calculated Total: ${calculateTotalCost().toFixed(2)}
                  </div>
                </div>
              ) : null}
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
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
            
            {/* Generate Invoice Button - only show for completed service calls */}
            {formData.status === 'completed' && (
              <button
                type="button"
                onClick={handleGenerateInvoice}
                disabled={generatingInvoice}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
              </button>
            )}
            
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceCallEdit;
