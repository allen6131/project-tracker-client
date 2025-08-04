import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Estimate, 
  CreateEstimateRequest, 
  UpdateEstimateRequest,
  Project
} from '../types';
import { estimatesAPI, projectsAPI } from '../services/api';
import PDFViewer from './PDFViewer';

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
  const [showSendPrompt, setShowSendPrompt] = useState(false);
  const [newlyCreatedEstimate, setNewlyCreatedEstimate] = useState<Estimate | null>(null);
  const [emailPreviewTab, setEmailPreviewTab] = useState<'email' | 'pdf'>('email');
  
  // PDF viewer state
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [currentPDFEstimate, setCurrentPDFEstimate] = useState<Estimate | null>(null);
  const [downloadingEstimate, setDownloadingEstimate] = useState<number | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [showPageLoading, setShowPageLoading] = useState(false);
  const [pageLoadingMessage, setPageLoadingMessage] = useState('');
  
  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  
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
  }, [currentPage, searchTerm, statusFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const toggleDropdown = (estimateId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDropdown(openDropdown === estimateId ? null : estimateId);
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

        const response = await estimatesAPI.createEstimate(createData, selectedDocument);
        setSuccess('Estimate created successfully');
        setNewlyCreatedEstimate(response.estimate);
        setShowSendPrompt(true);
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
      setDownloadingEstimate(estimateId);
      
      // Find the estimate to determine if it has a document
      const estimate = estimates.find(e => e.id === estimateId);
      const hasDocument = estimate?.document_path;
      
      // Show page loading with appropriate message
      setShowPageLoading(true);
      setPageLoadingMessage(hasDocument ? 'Downloading PDF...' : 'Generating PDF...');
      
      const blob = await estimatesAPI.downloadEstimate(estimateId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `estimate-${estimateId}-document`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      setError(err.response?.data?.message || 'Failed to download document');
    } finally {
      setDownloadingEstimate(null);
      setShowPageLoading(false);
      setPageLoadingMessage('');
    }
  };

  const handleViewPDF = async (estimate: Estimate) => {
    try {
      setPdfLoading(true);
      setPdfTitle(`Estimate PDF - ${estimate.title}`);
      setCurrentPDFEstimate(estimate);
      
      const url = await estimatesAPI.viewEstimatePDF(estimate.id);
      setPdfUrl(url);
      setShowPDFViewer(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentPDFEstimate) return;
    
    try {
      setDownloadingPDF(true);
      const blob = await estimatesAPI.downloadEstimatePDF(currentPDFEstimate.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estimate-${currentPDFEstimate.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to download PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleRegeneratePDF = async () => {
    if (!currentPDFEstimate) return;
    
    try {
      setPdfLoading(true);
      await estimatesAPI.regenerateEstimatePDF(currentPDFEstimate.id);
      
      // Refresh the PDF view
      const url = await estimatesAPI.viewEstimatePDF(currentPDFEstimate.id);
      setPdfUrl(url);
      setSuccess('PDF regenerated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to regenerate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePDFViewer = () => {
    setShowPDFViewer(false);
    setPdfUrl(null);
    setCurrentPDFEstimate(null);
    setPdfTitle('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-colors">
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
                placeholder="Search estimates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </form>

          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                    Invoiced to Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Paid to Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Progress
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
                      {estimate.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{estimate.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{estimate.project_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{estimate.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(estimate.status)}`}>
                        {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${estimate.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {estimate.total_invoiced > 0 ? (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          ${estimate.total_invoiced.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">$0.00</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {estimate.total_paid > 0 ? (
                        <span className="font-medium text-green-600 dark:text-green-400">
                          ${estimate.total_paid.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">$0.00</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {(() => {
                        const invoicedPercent = estimate.total_amount > 0 ? (estimate.total_invoiced / estimate.total_amount * 100) : 0;
                        const paidPercent = estimate.total_amount > 0 ? (estimate.total_paid / estimate.total_amount * 100) : 0;
                        
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(invoicedPercent, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                {invoicedPercent.toFixed(0)}% inv
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div 
                                  className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(paidPercent, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                {paidPercent.toFixed(0)}% paid
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={(e) => toggleDropdown(estimate.id, e)}
                          className="inline-flex items-center justify-center w-8 h-8 text-gray-400 bg-transparent border-0 rounded-full hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                        >
                          <span className="sr-only">Open options</span>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {openDropdown === estimate.id && (
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleViewPDF(estimate);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                View PDF
                              </button>
                              
                              <button
                                onClick={() => {
                                  handleEditEstimate(estimate);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                Edit
                              </button>

                              {estimate.status !== 'rejected' && (
                                <button
                                  onClick={() => {
                                    handleSendEmail(estimate);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  Send Email
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  handleDownloadDocument(estimate.id);
                                  setOpenDropdown(null);
                                }}
                                disabled={downloadingEstimate === estimate.id}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {downloadingEstimate === estimate.id ? (
                                  <>
                                    <svg className="animate-spin w-4 h-4 mr-3 text-gray-700 dark:text-gray-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {estimate.document_path ? 'Downloading...' : 'Generating PDF...'}
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    {estimate.document_path ? 'Download PDF' : 'Generate PDF'}
                                  </>
                                )}
                              </button>

                              <hr className="border-gray-200 dark:border-gray-600 my-1" />
                              
                              <button
                                onClick={() => {
                                  handleDeleteEstimate(estimate.id);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Add empty rows when there are fewer than 5 estimates to ensure dropdown has space */}
                {estimates.length > 0 && estimates.length < 5 && Array.from({ length: 5 - estimates.length }).map((_, index) => (
                  <tr key={`empty-estimate-${index}`} className="pointer-events-none">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-transparent">.</div>
                      <div className="text-sm text-transparent">.</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-transparent">.</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-transparent">.</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-transparent">.</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-transparent">.</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-transparent">.</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-transparent">.</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-transparent">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-transparent rounded-full h-2"></div>
                          <span className="text-xs text-transparent">.</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-transparent rounded-full h-2"></div>
                          <span className="text-xs text-transparent">.</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-transparent">.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
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
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
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
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No estimates</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new estimate.</p>
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

      {/* PDF Generation/Download Loading Overlay */}
      {showPageLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-sm mx-4 text-center shadow-2xl">
            <div className="flex flex-col items-center space-y-4">
              {/* Animated PDF Icon */}
              <div className="relative">
                <svg className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {/* Spinning ring around the icon */}
                <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
              </div>
              
              {/* Loading Message */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {pageLoadingMessage}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please wait while we prepare your document...
                </p>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
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
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Send Estimate via Email
              </h3>
              
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left side - Form inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimate Details
                      </label>
                      <div className="bg-gray-50 p-3 rounded-md space-y-1">
                        <p className="text-sm font-medium">{emailingEstimate.title}</p>
                        <p className="text-sm text-gray-500">
                          Project: {emailingEstimate.project_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Total: ${emailingEstimate.total_amount.toFixed(2)}
                        </p>
                      </div>
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

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
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
                    <div className="border-b border-gray-200">
                      <nav className="-mb-px flex space-x-8">
                        <button
                          onClick={() => setEmailPreviewTab('email')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            emailPreviewTab === 'email'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          Email Preview
                        </button>
                        <button
                          onClick={() => setEmailPreviewTab('pdf')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            emailPreviewTab === 'pdf'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          PDF Attachment
                        </button>
                      </nav>
                    </div>

                    {/* Tab Content */}
                    {emailPreviewTab === 'email' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Preview
                        </label>
                        <div className="border border-gray-200 rounded-md overflow-hidden">
                          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                            <p className="text-xs text-gray-600">
                              Subject: Estimate for {emailingEstimate.project_name || 'Project'} from {emailData.sender_name || user?.username || 'AmpTrack'}
                            </p>
                          </div>
                          <div className="p-4 bg-white max-h-96 overflow-y-auto">
                            {/* Email Header */}
                            <div className="bg-green-500 text-white p-4 text-center rounded-t-lg">
                              <h2 className="text-xl font-bold">Project Estimate</h2>
                            </div>
                            
                            {/* Email Content */}
                            <div className="bg-gray-50 p-6 rounded-b-lg">
                              <div className="bg-white p-4 rounded-md mb-4">
                                <h3 className="font-semibold text-lg mb-2">{emailingEstimate.title}</h3>
                                {emailingEstimate.description && (
                                  <p className="text-gray-600 mb-3">{emailingEstimate.description}</p>
                                )}
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p><strong>Estimate ID:</strong> #{emailingEstimate.id}</p>
                                    <p><strong>Project:</strong> {emailingEstimate.project_name || 'N/A'}</p>
                                    <p><strong>Date:</strong> {new Date(emailingEstimate.created_at).toLocaleDateString()}</p>
                                    <p>
                                      <strong>Status:</strong> 
                                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(emailingEstimate.status)}`}>
                                        {emailingEstimate.status.toUpperCase()}
                                      </span>
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold">From: {emailData.sender_name || user?.username || 'AmpTrack'}</p>
                                    {emailingEstimate.customer_name && (
                                      <p><strong>Customer:</strong> {emailingEstimate.customer_name}</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-4 text-center">
                                  <div className="border-2 border-green-500 rounded-lg p-4 inline-block">
                                    <p className="text-sm text-gray-600 mb-1">Total Estimate Amount</p>
                                    <p className="text-2xl font-bold text-green-600">
                                      ${emailingEstimate.total_amount.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="mt-4 bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                                  <p className="text-sm">
                                    📎 <strong>Estimate Document:</strong> Please find the detailed estimate document attached to this email as a PDF.
                                  </p>
                                </div>
                                
                                {emailingEstimate.notes && (
                                  <div className="mt-4">
                                    <h4 className="font-semibold mb-2">Notes:</h4>
                                    <p className="bg-gray-50 p-3 rounded-md text-sm">{emailingEstimate.notes}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-sm text-gray-600 space-y-2">
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          PDF Attachment Preview
                        </label>
                        <div className="border border-gray-200 rounded-md overflow-hidden">
                          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                            <p className="text-xs text-gray-600">
                              📎 estimate-{emailingEstimate.id}.pdf
                            </p>
                          </div>
                          <div className="bg-white h-96 flex items-center justify-center">
                            {pdfUrl ? (
                              <iframe
                                src={pdfUrl}
                                className="w-full h-full border-0"
                                title="Estimate PDF Preview"
                              />
                            ) : (
                              <div className="text-center text-gray-500">
                                <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm">Loading PDF preview...</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailModal(false);
                      setEmailingEstimate(null);
                      setEmailData({ recipient_email: '', sender_name: '' });
                      setPdfUrl(null);
                      setEmailPreviewTab('email');
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

      {/* PDF Viewer */}
      <PDFViewer
        isOpen={showPDFViewer}
        onClose={handleClosePDFViewer}
        pdfUrl={pdfUrl}
        title={pdfTitle}
        onDownload={handleDownloadPDF}
        onRegenerate={handleRegeneratePDF}
        loading={pdfLoading}
      />

      {/* Send Estimate Prompt */}
      {showSendPrompt && newlyCreatedEstimate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                Estimate Created Successfully!
              </h3>
              
              <p className="text-sm text-gray-600 text-center mb-6">
                Would you like to send this estimate to the customer now?
              </p>
              
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <p className="text-sm font-medium text-gray-900">{newlyCreatedEstimate.title}</p>
                <p className="text-sm text-gray-500">Project: {newlyCreatedEstimate.project_name}</p>
                <p className="text-sm text-gray-500">Total: ${newlyCreatedEstimate.total_amount.toFixed(2)}</p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSendPrompt(false);
                    setNewlyCreatedEstimate(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Later
                </button>
                <button
                  onClick={() => {
                    setShowSendPrompt(false);
                    handleSendEmail(newlyCreatedEstimate);
                  }}
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                >
                  <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Email Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstimatesManagement; 