import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { takeoffsAPI, projectsAPI, customersAPI } from '../services/api';
import { 
  Takeoff, 
  CreateTakeoffRequest,
  Project,
  Customer
} from '../types';

const Takeoffs: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [takeoffs, setTakeoffs] = useState<Takeoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTakeoffs, setTotalTakeoffs] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Create takeoff modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateTakeoffRequest>({
    name: '',
    description: '',
    project_id: null,
    customer_id: null
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creating, setCreating] = useState(false);

  // Load data
  const loadTakeoffs = async () => {
    try {
      setLoading(true);
      const response = await takeoffsAPI.getTakeoffs({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter || undefined
      });
      
      setTakeoffs(response.takeoffs);
      setTotalPages(response.pagination.totalPages);
      setTotalTakeoffs(response.pagination.totalTakeoffs);
    } catch (error) {
      console.error('Error loading takeoffs:', error);
      setError('Failed to load takeoffs');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsAndCustomers = async () => {
    try {
      const [projectsRes, customersRes] = await Promise.all([
        projectsAPI.getProjects(1, 100),
        customersAPI.getCustomers(1, 100)
      ]);
      
      setProjects(projectsRes.projects);
      setCustomers(customersRes.customers);
    } catch (error) {
      console.error('Error loading projects and customers:', error);
    }
  };

  useEffect(() => {
    loadTakeoffs();
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    loadProjectsAndCustomers();
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadTakeoffs();
  };

  // Handle create takeoff
  const handleCreateTakeoff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createFormData.name.trim()) {
      setError('Takeoff name is required');
      return;
    }

    try {
      setCreating(true);
      setError('');
      
      await takeoffsAPI.createTakeoff(createFormData);
      
      setSuccess('Takeoff created successfully');
      setShowCreateModal(false);
      setCreateFormData({
        name: '',
        description: '',
        project_id: null,
        customer_id: null
      });
      
      loadTakeoffs();
    } catch (error) {
      console.error('Error creating takeoff:', error);
      setError('Failed to create takeoff');
    } finally {
      setCreating(false);
    }
  };

  // Handle delete takeoff
  const handleDeleteTakeoff = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this takeoff? This will also delete all associated PDFs and markups.')) {
      return;
    }

    try {
      await takeoffsAPI.deleteTakeoff(id);
      setSuccess('Takeoff deleted successfully');
      loadTakeoffs();
    } catch (error) {
      console.error('Error deleting takeoff:', error);
      setError('Failed to delete takeoff');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Takeoffs</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Manage your PDF takeoffs and markup projects
                </p>
              </div>
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search takeoffs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
              >
                Search
              </button>
            </form>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Create Takeoff
          </button>
        </div>

        {/* Takeoffs Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : takeoffs.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No takeoffs found</h3>
            <p className="text-gray-500 dark:text-gray-400">Create your first takeoff to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {takeoffs.map((takeoff) => (
              <div key={takeoff.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {takeoff.name}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(takeoff.status)}`}>
                      {takeoff.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {takeoff.description && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                      {takeoff.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    {takeoff.project_name && (
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Project: </span>
                        <span className="text-gray-900 dark:text-white">{takeoff.project_name}</span>
                      </div>
                    )}
                    
                    {takeoff.customer_name && (
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Customer: </span>
                        <span className="text-gray-900 dark:text-white">{takeoff.customer_name}</span>
                      </div>
                    )}
                    
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Created: </span>
                      <span className="text-gray-900 dark:text-white">{formatDate(takeoff.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>📄 {takeoff.pdfs?.length || 0} PDFs</span>
                      <span>📍 {Object.values(takeoff.markup_counts || {}).reduce((sum, count) => sum + count, 0)} markups</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/takeoffs/${takeoff.id}`)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm font-medium"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDeleteTakeoff(takeoff.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              >
                Previous
              </button>
              
              <span className="px-3 py-2 text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Takeoff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Create New Takeoff
              </h2>
              
              <form onSubmit={handleCreateTakeoff}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={createFormData.name}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter takeoff name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={createFormData.description}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter description (optional)"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Project (Optional)
                    </label>
                    <select
                      value={createFormData.project_id || ''}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, project_id: e.target.value ? parseInt(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select a project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Customer (Optional)
                    </label>
                    <select
                      value={createFormData.customer_id || ''}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, customer_id: e.target.value ? parseInt(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select a customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating...' : 'Create Takeoff'}
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

export default Takeoffs;
