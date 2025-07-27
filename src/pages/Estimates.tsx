import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import { 
  Estimate, 
  CreateEstimateRequest, 
  UpdateEstimateRequest,
  Project
} from '../types';
import { estimatesAPI, projectsAPI } from '../services/api';

const Estimates: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
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
  const [emailingEstimate, setEmailingEstimate] = useState<Estimate | null>(null);
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    sender_name: ''
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailPreviewTab, setEmailPreviewTab] = useState<'email' | 'pdf'>('email');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
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

  const toggleDropdown = (estimateId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDropdownId(openDropdownId === estimateId ? null : estimateId);
  };

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
    
    // Load PDF preview for the email modal
    loadEmailPDFPreview(estimate);
    setShowEmailModal(true);
  };

  const loadEmailPDFPreview = async (estimate: Estimate) => {
    try {
      const url = await estimatesAPI.viewEstimatePDF(estimate.id);
      setPdfUrl(url);
    } catch (err: any) {
      console.error('Failed to load PDF preview for email:', err);
      // Don't show error for PDF preview failure in email context
    }
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
      setPdfUrl(null);
      setEmailPreviewTab('email');
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

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
      case 'sent':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  const getSelectedProjectName = () => {
    if (!formData.project_id) return '';
    const project = projects.find(p => p.id === formData.project_id);
    return project ? project.name : '';
  };

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
              <span className="ml-4 text-lg text-gray-600 dark:text-gray-300">Estimates</span>
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
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Estimates Management</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search estimates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

        {/* Estimates List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
            <div className="text-center text-gray-900 dark:text-white">Loading estimates...</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {estimates.map((estimate) => (
                    <tr key={estimate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{estimate.title}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{estimate.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {estimate.project_name || 'No project'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {estimate.customer_name || 'No customer'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(estimate.status)}>
                          {estimate.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${estimate.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {estimate.document_path ? (
                          <button
                            onClick={() => handleDownloadDocument(estimate.id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          >
                            Download
                          </button>
                        ) : (
                          'No document'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="relative dropdown-container">
                          <button
                            onClick={(e) => toggleDropdown(estimate.id, e)}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          
                          {openDropdownId === estimate.id && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleEditEstimate(estimate);
                                    setOpenDropdownId(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleSendEmail(estimate);
                                    setOpenDropdownId(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                  Send Email
                                </button>
                                {estimate.status === 'draft' && (
                                  <button
                                    onClick={() => {
                                      handleQuickStatusUpdate(estimate.id, 'sent');
                                      setOpenDropdownId(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    Mark as Sent
                                  </button>
                                )}
                                {estimate.status === 'sent' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        handleQuickStatusUpdate(estimate.id, 'approved');
                                        setOpenDropdownId(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                    >
                                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleQuickStatusUpdate(estimate.id, 'rejected');
                                        setOpenDropdownId(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                    >
                                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                      Reject
                                    </button>
                                  </>
                                )}
                                <hr className="border-gray-200 dark:border-gray-600 my-1" />
                                <button
                                  onClick={() => {
                                    handleDeleteEstimate(estimate.id);
                                    setOpenDropdownId(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
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
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
                          onClick={() => setCurrentPage(page)}
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
          </div>
        )}

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {editingEstimate ? 'Edit Estimate' : 'Create New Estimate'}
                </h3>
                
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project *</label>
                      <select
                        required={!editingEstimate}
                        value={formData.project_id || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          project_id: e.target.value ? parseInt(e.target.value) : null
                        })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.total_amount}
                        onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {editingEstimate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'sent' | 'approved' | 'rejected' })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Document {!editingEstimate ? '*' : '(Leave empty to keep current)'}
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      onChange={(e) => setSelectedDocument(e.target.files?.[0] || null)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Supported formats: PDF, Word documents, images, text files (max 10MB)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Send Estimate via Email
                </h3>
                
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left side - Form inputs */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Estimate Details
                        </label>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{emailingEstimate.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Project: {emailingEstimate.project_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total: ${emailingEstimate.total_amount.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Recipient Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={emailData.recipient_email}
                          onChange={(e) => setEmailData({ ...emailData, recipient_email: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="customer@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Your Name (optional)
                        </label>
                        <input
                          type="text"
                          value={emailData.sender_name}
                          onChange={(e) => setEmailData({ ...emailData, sender_name: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Your name or company"
                        />
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          The estimate PDF will be automatically attached to the email. Use the tabs on the right to preview both the email content and PDF attachment.
                        </p>
                      </div>
                    </div>

                    {/* Right side - Email and PDF preview */}
                    <div className="space-y-4">
                      {/* Tab Navigation */}
                      <div className="border-b border-gray-200 dark:border-gray-600">
                        <nav className="-mb-px flex space-x-8">
                          <button
                            type="button"
                            onClick={() => setEmailPreviewTab('email')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                              emailPreviewTab === 'email'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            Email Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailPreviewTab('pdf')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                              emailPreviewTab === 'pdf'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            PDF Attachment
                          </button>
                        </nav>
                      </div>

                      {/* Tab Content */}
                      {emailPreviewTab === 'email' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email Preview
                          </label>
                          <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden">
                            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Subject: Estimate for {emailingEstimate.project_name || 'Project'} from {emailData.sender_name || user?.username || 'AmpTrack'}
                              </p>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 max-h-96 overflow-y-auto">
                              {/* Email Header */}
                              <div className="bg-green-500 text-white p-4 text-center rounded-t-lg">
                                <h2 className="text-xl font-bold">Project Estimate</h2>
                              </div>
                              
                              {/* Email Content */}
                              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-b-lg">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-md mb-4">
                                  <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">{emailingEstimate.title}</h3>
                                  {emailingEstimate.description && (
                                    <p className="text-gray-600 dark:text-gray-300 mb-3">{emailingEstimate.description}</p>
                                  )}
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="text-gray-700 dark:text-gray-300">
                                      <p><strong>Estimate ID:</strong> #{emailingEstimate.id}</p>
                                      <p><strong>Project:</strong> {emailingEstimate.project_name || 'N/A'}</p>
                                      <p><strong>Date:</strong> {new Date(emailingEstimate.created_at).toLocaleDateString()}</p>
                                      <p>
                                        <strong>Status:</strong> 
                                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(emailingEstimate.status).replace('text-xs', '')}`}>
                                          {emailingEstimate.status.toUpperCase()}
                                        </span>
                                      </p>
                                    </div>
                                    <div className="text-right text-gray-700 dark:text-gray-300">
                                      <p className="font-semibold">From: {emailData.sender_name || user?.username || 'AmpTrack'}</p>
                                      {emailingEstimate.customer_name && (
                                        <p><strong>Customer:</strong> {emailingEstimate.customer_name}</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4 text-center">
                                    <div className="border-2 border-green-500 rounded-lg p-4 inline-block">
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Estimate Amount</p>
                                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        ${emailingEstimate.total_amount.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-3 rounded-md">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                      📎 <strong>Estimate Document:</strong> Please find the detailed estimate document attached to this email as a PDF.
                                    </p>
                                  </div>
                                  
                                  {emailingEstimate.notes && (
                                    <div className="mt-4">
                                      <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Notes:</h4>
                                      <p className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-sm text-gray-700 dark:text-gray-300">{emailingEstimate.notes}</p>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                  <p>Thank you for considering our services for your project. The estimate amount shown above covers all work outlined in the attached document.</p>
                                  <p>If you have any questions about this estimate or would like to discuss the project further, please don't hesitate to contact us.</p>
                                  <p>We look forward to the opportunity to work with you!</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            PDF Attachment Preview
                          </label>
                          <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden">
                            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                📎 estimate-{emailingEstimate.id}.pdf
                              </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 h-96 flex items-center justify-center">
                              {pdfUrl ? (
                                <iframe
                                  src={pdfUrl}
                                  className="w-full h-full border-0"
                                  title="Estimate PDF Preview"
                                />
                              ) : (
                                <div className="text-gray-400 dark:text-gray-500">
                                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <p>PDF preview not available</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailModal(false);
                        setEmailingEstimate(null);
                        setEmailData({ recipient_email: '', sender_name: '' });
                        setPdfUrl(null);
                        setEmailPreviewTab('email');
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
    </div>
  );
};

export default Estimates; 