import React, { useState, useEffect } from 'react';
import { Project, CreateProjectRequest, UpdateProjectRequest } from '../types';
import { customersAPI } from '../services/api';

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
    status: 'started' as 'started' | 'active' | 'done',
    customer_id: '' as string
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Load customers when form opens
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
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

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        customer_id: project.customer_id ? project.customer_id.toString() : ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'started',
        customer_id: ''
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

    if (!['started', 'active', 'done'].includes(formData.status)) {
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
        status: formData.status,
        customer_id: formData.customer_id ? parseInt(formData.customer_id) : null
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
      status: 'started',
      customer_id: ''
    });
    setErrors({});
    setCustomers([]);
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
              Customer
            </label>
            <select
              id="customer_id"
              name="customer_id"
              value={formData.customer_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading || loadingCustomers}
            >
              <option value="">Select a customer (optional)</option>
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

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
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
              disabled={loading}
            >
              <option value="started">Started</option>
              <option value="active">Active</option>
              <option value="done">Done</option>
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