import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Estimate, 
  CreateEstimateRequest, 
  UpdateEstimateRequest,
  Project
} from '../types';
import { estimatesAPI, projectsAPI } from '../services/api';

const EstimatesManagement: React.FC = () => {
  const { user, isAdmin } = useAuth();
  
  // State management
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [emailingEstimate, setEmailingEstimate] = useState<Estimate | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: null as number | null,
    total_amount: 0,
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'approved' | 'rejected'
  });
  
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);

  // Email form data
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    sender_name: ''
  });
  
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Load estimates and projects
  useEffect(() => {
    loadEstimates();
    loadProjects();
  }, [currentPage, searchTerm, statusFilter, projectFilter]);

  const loadEstimates = async () => {
    try {
      setLoading(true);
      const response = await estimatesAPI.getEstimates(currentPage, 10, searchTerm, statusFilter, projectFilter);
      setEstimates(response.estimates);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load estimates');
    } finally {
      setLoading(false);
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

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: null,
      total_amount: 0,
      notes: '',
      status: 'draft'
    });
    setSelectedDocument(null);
  };

  const handleCreateEstimate = () => {
    clearMessages();
    resetForm();
    setEditingEstimate(null);
    setShowForm(true);
  };

  const handleEditEstimate = (estimate: Estimate) => {
    clearMessages();
    setEditingEstimate(estimate);
    setFormData({
      title: estimate.title,
      description: estimate.description || '',
      project_id: estimate.project_id,
      total_amount: estimate.total_amount,
      notes: estimate.notes || '',
      status: estimate.status
    });
    setSelectedDocument(null);
    setShowForm(true);
  };

  const handleDeleteEstimate = async (estimateId: number) => {
    if (window.confirm('Are you sure you want to delete this estimate?')) {
      try {
        await estimatesAPI.deleteEstimate(estimateId);
        setSuccess('Estimate deleted successfully');
        loadEstimates();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete estimate');
      }
    }
  };

  const handleQuickStatusUpdate = async (estimateId: number, newStatus: 'draft' | 'sent' | 'approved' | 'rejected') => {
    try {
      await estimatesAPI.updateEstimate(estimateId, { status: newStatus });
      setSuccess(`Estimate status updated to ${newStatus}`);
      loadEstimates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleSendEmail = (estimate: Estimate) => {
    clearMessages();
    setEmailingEstimate(estimate);
    setEmailData({
      recipient_email: estimate.customer_name || '',
      sender_name: user?.username || ''
    });
    setShowEmailModal(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailingEstimate) return;

    setEmailLoading(true);
    try {
      await estimatesAPI.sendEstimateEmail(emailingEstimate.id, emailData);
      setSuccess(`Estimate sent successfully to ${emailData.recipient_email}`);
      setShowEmailModal(false);
      setEmailingEstimate(null);
      setEmailData({ recipient_email: '', sender_name: '' });
      loadEstimates(); // Refresh to show updated status
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      if (editingEstimate) {
        // Update existing estimate
        const updateData: UpdateEstimateRequest = {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          total_amount: formData.total_amount,
          notes: formData.notes
        };

        await estimatesAPI.updateEstimate(editingEstimate.id, updateData, selectedDocument || undefined);
        setSuccess('Estimate updated successfully');
      } else {
        // Create new estimate
        if (!formData.project_id) {
          setError('Please select a project');
          return;
        }
        if (!selectedDocument) {
          setError('Please upload a document');
          return;
        }

        const createData: CreateEstimateRequest = {
          title: formData.title,
          description: formData.description,
          project_id: formData.project_id,
          total_amount: formData.total_amount,
          notes: formData.notes
        };

        await estimatesAPI.createEstimate(createData, selectedDocument);
        setSuccess('Estimate created successfully');
      }
      
      setShowForm(false);
      resetForm();
      loadEstimates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDownloadDocument = async (estimateId: number) => {
    try {
      const response = await estimatesAPI.downloadEstimate(estimateId);
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `estimate-${estimateId}-document`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download document');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadEstimates();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Estimates Management</h2>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage project estimates with documents
              </p>
            </div>
            <button
              onClick={handleCreateEstimate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Create New Estimate
            </button>
          </div>
        </div>
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

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search estimates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </form>

          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Estimates Table */}
      {loading ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">Loading estimates...</div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {estimates.map((estimate) => (
                  <tr key={estimate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{estimate.title}</div>
                      {estimate.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{estimate.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{estimate.project_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{estimate.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(estimate.status)}`}>
                        {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${estimate.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {estimate.document_path ? (
                        <button
                          onClick={() => handleDownloadDocument(estimate.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Download
                        </button>
                      ) : (
                        'No document'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditEstimate(estimate)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        {estimate.status === 'draft' && (
                          <button
                            onClick={() => handleSendEmail(estimate)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Send
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteEstimate(estimate.id)}
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

          {estimates.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No estimates</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new estimate.</p>
              <div className="mt-6">
                <button
                  onClick={handleCreateEstimate}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Estimate
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingEstimate ? 'Edit Estimate' : 'Create New Estimate'}
              </h3>
              
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project *</label>
                    <select
                      required={!editingEstimate}
                      value={formData.project_id || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        project_id: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name} - {project.customer_name || 'No customer'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {editingEstimate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'sent' | 'approved' | 'rejected' })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Document Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Document {!editingEstimate ? '*' : '(Leave empty to keep current)'}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedDocument(e.target.files?.[0] || null)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Supported formats: PDF, Word documents, images, text files (max 10MB)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {formLoading ? 'Saving...' : (editingEstimate ? 'Update Estimate' : 'Create Estimate')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && emailingEstimate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Send Estimate via Email
              </h3>
              
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimate: {emailingEstimate.title}
                  </label>
                  <p className="text-sm text-gray-500">
                    Total: ${emailingEstimate.total_amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Project: {emailingEstimate.project_name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Recipient Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={emailData.recipient_email}
                    onChange={(e) => setEmailData({ ...emailData, recipient_email: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="customer@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Your Name (optional)
                  </label>
                  <input
                    type="text"
                    value={emailData.sender_name}
                    onChange={(e) => setEmailData({ ...emailData, sender_name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your name or company"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailModal(false);
                      setEmailingEstimate(null);
                      setEmailData({ recipient_email: '', sender_name: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {emailLoading ? 'Sending...' : 'Send Email'}
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

export default EstimatesManagement; 