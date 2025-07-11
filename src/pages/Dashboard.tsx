import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import UserList from '../components/UserList';
import UserForm from '../components/UserForm';
import ProjectList from '../components/ProjectList';
import ProjectForm from '../components/ProjectForm';
import MaterialsCatalog from '../components/MaterialsCatalog';
import CustomersManagement from '../components/CustomersManagement';
import EstimatesManagement from '../components/EstimatesManagement';
import InvoicesManagement from '../components/InvoicesManagement';
import AllTodoLists from '../components/AllTodoLists';
import { 
  User, 
  CreateUserRequest, 
  UpdateUserRequest,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest
} from '../types';
import { usersAPI, projectsAPI, catalogMaterialsAPI } from '../services/api';

const Dashboard: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // User management state
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userRefreshTrigger, setUserRefreshTrigger] = useState(0);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // Project management state
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectFormLoading, setProjectFormLoading] = useState(false);
  const [projectRefreshTrigger, setProjectRefreshTrigger] = useState(0);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectSuccess, setProjectSuccess] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'projects' | 'users' | 'customers' | 'estimates' | 'invoices' | 'materials' | 'todos'>('projects');

  const clearMessages = () => {
    setUserError(null);
    setUserSuccess(null);
    setProjectError(null);
    setProjectSuccess(null);
  };

  // User management functions
  const handleUserFormSubmit = async (userData: CreateUserRequest | UpdateUserRequest) => {
    setUserFormLoading(true);
    setUserError(null);
    
    try {
      if (editingUser) {
        await usersAPI.updateUser(editingUser.id, userData as UpdateUserRequest);
        setUserSuccess('User updated successfully');
      } else {
        await usersAPI.createUser(userData as CreateUserRequest);
        setUserSuccess('User created successfully');
      }
      
      setShowUserForm(false);
      setEditingUser(null);
      setUserRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      setUserError(error.response?.data?.message || 'An error occurred');
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    clearMessages();
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.deleteUser(userId);
        setUserSuccess('User deleted successfully');
        setUserRefreshTrigger(prev => prev + 1);
      } catch (error: any) {
        setUserError(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const handleCreateUser = () => {
    clearMessages();
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleCloseUserForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  // Project management functions
  const handleProjectFormSubmit = async (projectData: CreateProjectRequest | UpdateProjectRequest) => {
    setProjectFormLoading(true);
    setProjectError(null);
    
    try {
      if (editingProject) {
        await projectsAPI.updateProject(editingProject.id, projectData as UpdateProjectRequest);
        setProjectSuccess('Project updated successfully');
      } else {
        await projectsAPI.createProject(projectData as CreateProjectRequest);
        setProjectSuccess('Project created successfully');
      }
      
      setShowProjectForm(false);
      setEditingProject(null);
      setProjectRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      setProjectError(error.response?.data?.message || 'An error occurred');
    } finally {
      setProjectFormLoading(false);
    }
  };

  const handleEditProject = (project: Project) => {
    clearMessages();
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectsAPI.deleteProject(projectId);
        setProjectSuccess('Project deleted successfully');
        setProjectRefreshTrigger(prev => prev + 1);
      } catch (error: any) {
        setProjectError(error.response?.data?.message || 'Failed to delete project');
      }
    }
  };

  const handleCreateProject = () => {
    clearMessages();
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleCloseProjectForm = () => {
    setShowProjectForm(false);
    setEditingProject(null);
  };

  const handleTabChange = (tab: 'projects' | 'users' | 'customers' | 'estimates' | 'invoices' | 'materials' | 'todos') => {
    clearMessages();
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Logo size="md" />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.username}</span>
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
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => handleTabChange('projects')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'projects'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Projects
              </button>
              <button
                onClick={() => handleTabChange('estimates')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'estimates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Estimates
              </button>
              <button
                onClick={() => handleTabChange('invoices')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invoices'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Invoices
              </button>
              <button
                onClick={() => handleTabChange('todos')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'todos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Todos
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => handleTabChange('materials')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'materials'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Materials Catalog
                  </button>
                  <button
                    onClick={() => handleTabChange('customers')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'customers'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Customers
                  </button>
                  <button
                    onClick={() => handleTabChange('users')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'users'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    User Management
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'projects' ? (
          <div className="space-y-6">
            {/* Project Header */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Project Management</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage electrical projects and low voltage installations
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={handleCreateProject}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Add New Project
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Project Messages */}
            {projectError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {projectError}
              </div>
            )}

            {projectSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {projectSuccess}
              </div>
            )}

            {/* Project List */}
            <ProjectList
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
              refreshTrigger={projectRefreshTrigger}
            />

            {/* Project Form Modal */}
            {isAdmin && (
              <ProjectForm
                isOpen={showProjectForm}
                onClose={handleCloseProjectForm}
                onSubmit={handleProjectFormSubmit}
                project={editingProject}
                loading={projectFormLoading}
              />
            )}
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-6">
            {/* User Header */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">User Management</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage user accounts and permissions
                    </p>
                  </div>
                  <button
                    onClick={handleCreateUser}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Add New User
                  </button>
                </div>
              </div>
            </div>

            {/* User Messages */}
            {userError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {userError}
              </div>
            )}

            {userSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {userSuccess}
              </div>
            )}

            {/* User List */}
            <UserList
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
              refreshTrigger={userRefreshTrigger}
            />

            {/* User Form Modal */}
            <UserForm
              isOpen={showUserForm}
              onClose={handleCloseUserForm}
              onSubmit={handleUserFormSubmit}
              user={editingUser}
              loading={userFormLoading}
            />
          </div>
        ) : activeTab === 'materials' ? (
          <MaterialsCatalog />
        ) : activeTab === 'customers' ? (
          <CustomersManagement />
        ) : activeTab === 'estimates' ? (
          <EstimatesManagement />
        ) : activeTab === 'invoices' ? (
          <InvoicesManagement />
        ) : activeTab === 'todos' ? (
          <AllTodoLists />
        ) : null}
      </div>
    </div>
  );
};

export default Dashboard; 