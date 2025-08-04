import React, { useState, useEffect } from 'react';
import { Project, CreateProjectRequest, UpdateProjectRequest } from '../types';
import { customersAPI, usersAPI, companyProfileAPI } from '../services/api';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: CreateProjectRequest | UpdateProjectRequest) => Promise<void>;
  project?: Project | null;
  loading?: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  project,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    master_permit_number: '',
    electrical_sub_permit: '',
    status: 'bidding' as string,
    customer_id: '' as string,
    main_technician_id: '' as string
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [users, setUsers] = useState<{ id: number; username: string; email: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>(['bidding', 'started', 'active', 'done']);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  // Load customers, users, and statuses when form opens
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadUsers();
      loadStatuses();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await customersAPI.getSimpleCustomers();
      setCustomers(response.customers);
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await usersAPI.getActiveUsers();
      setUsers(response.users);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadStatuses = async () => {
    try {
      setLoadingStatuses(true);
      const response = await companyProfileAPI.getStatuses();
      setAvailableStatuses(response.statuses);
    } catch (error) {
      console.error('Failed to load statuses:', error);
      // Keep default statuses if loading fails
      setAvailableStatuses(['bidding', 'started', 'active', 'done']);
    } finally {
      setLoadingStatuses(false);
    }
  };

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        address: project.address || '',
        master_permit_number: project.master_permit_number || '',
        electrical_sub_permit: project.electrical_sub_permit || '',
        status: project.status,
        customer_id: project.customer_id ? project.customer_id.toString() : '',
        main_technician_id: project.main_technician_id ? project.main_technician_id.toString() : ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        address: '',
        master_permit_number: '',
        electrical_sub_permit: '',
        status: 'bidding',
        customer_id: '',
        main_technician_id: ''
      });
    }
    setErrors({});
  }, [project, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.trim().length > 200) {
      newErrors.name = 'Project name must not exceed 200 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must not exceed 1000 characters';
    }

    if (formData.address && formData.address.length > 500) {
      newErrors.address = 'Address must not exceed 500 characters';
    }

    if (formData.master_permit_number && formData.master_permit_number.length > 100) {
      newErrors.master_permit_number = 'Master permit number must not exceed 100 characters';
    }

    if (formData.electrical_sub_permit && formData.electrical_sub_permit.length > 100) {
      newErrors.electrical_sub_permit = 'Electrical sub permit must not exceed 100 characters';
    }

    if (!['bidding', 'started', 'active', 'done'].includes(formData.status)) {
      newErrors.status = 'Invalid status selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData: CreateProjectRequest | UpdateProjectRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        master_permit_number: formData.master_permit_number.trim(),
        electrical_sub_permit: formData.electrical_sub_permit.trim(),
        status: formData.status,
        customer_id: formData.customer_id ? parseInt(formData.customer_id) : null,
        main_technician_id: formData.main_technician_id ? parseInt(formData.main_technician_id) : null
      };

      await onSubmit(submitData);
      handleClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      master_permit_number: '',
      electrical_sub_permit: '',
      status: 'bidding',
      customer_id: '',
      main_technician_id: ''
    });
    setErrors({});
    setCustomers([]);
    setUsers([]);
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter project name"
              disabled={loading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Customer Selection */}
          <div>
            <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-1">
              Customer <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <select
              id="customer_id"
              name="customer_id"
              value={formData.customer_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading || loadingCustomers}
            >
              <option value="">No customer assigned</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {loadingCustomers && (
              <p className="mt-1 text-sm text-gray-500">Loading customers...</p>
            )}
          </div>

          {/* Main Technician Selection */}
          <div>
            <label htmlFor="main_technician_id" className="block text-sm font-medium text-gray-700 mb-1">
              Main Technician <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <select
              id="main_technician_id"
              name="main_technician_id"
              value={formData.main_technician_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading || loadingUsers}
            >
              <option value="">No technician assigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email})
                </option>
              ))}
            </select>
            {loadingUsers && (
              <p className="mt-1 text-sm text-gray-500">Loading users...</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter project description (optional)"
              disabled={loading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.address ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter project address (optional)"
              disabled={loading}
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          {/* Master Permit Number */}
          <div>
            <label htmlFor="master_permit_number" className="block text-sm font-medium text-gray-700 mb-1">
              Master Permit Number <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              id="master_permit_number"
              name="master_permit_number"
              value={formData.master_permit_number}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.master_permit_number ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter master permit number (optional)"
              disabled={loading}
            />
            {errors.master_permit_number && (
              <p className="mt-1 text-sm text-red-600">{errors.master_permit_number}</p>
            )}
          </div>

          {/* Electrical Sub Permit */}
          <div>
            <label htmlFor="electrical_sub_permit" className="block text-sm font-medium text-gray-700 mb-1">
              Electrical Sub Permit <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              id="electrical_sub_permit"
              name="electrical_sub_permit"
              value={formData.electrical_sub_permit}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.electrical_sub_permit ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter electrical sub permit (optional)"
              disabled={loading}
            />
            {errors.electrical_sub_permit && (
              <p className="mt-1 text-sm text-red-600">{errors.electrical_sub_permit}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.status ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              disabled={loading || loadingStatuses}
            >
              {loadingStatuses ? (
                <option value="">Loading statuses...</option>
              ) : (
                availableStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))
              )}
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status}</p>
            )}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {project ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              project ? 'Update Project' : 'Create Project'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectForm; 