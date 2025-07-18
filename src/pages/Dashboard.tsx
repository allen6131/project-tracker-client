import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, CreateUserRequest, UpdateUserRequest, Project, CreateProjectRequest, UpdateProjectRequest } from '../types';
import { usersAPI, projectsAPI } from '../services/api';
import UserList from '../components/UserList';
import UserForm from '../components/UserForm';
import ProjectList from '../components/ProjectList';
import ProjectForm from '../components/ProjectForm';
import CustomersManagement from '../components/CustomersManagement';
import EstimatesManagement from '../components/EstimatesManagement';
import InvoicesManagement from '../components/InvoicesManagement';
import MaterialsCatalog from '../components/MaterialsCatalog';
import ServicesCatalog from '../components/ServicesCatalog';
import AllTodoLists from '../components/AllTodoLists';
import Calendar from '../components/Calendar';
import Logo from '../components/Logo';

const Dashboard: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'projects' | 'users' | 'customers' | 'estimates' | 'invoices' | 'materials' | 'services' | 'todos' | 'calendar'>('projects');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [projectFormLoading, setProjectFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshUsersTrigger, setRefreshUsersTrigger] = useState(0);
  const [refreshProjectsTrigger, setRefreshProjectsTrigger] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [error, success]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleUserFormSubmit = async (userData: CreateUserRequest | UpdateUserRequest) => {
    try {
      setUserFormLoading(true);
      clearMessages();
      
      if (editingUser) {
        await usersAPI.updateUser(editingUser.id, userData as UpdateUserRequest);
        setSuccess('User updated successfully');
      } else {
        await usersAPI.createUser(userData as CreateUserRequest);
        setSuccess('User created successfully');
      }
      
      setRefreshUsersTrigger(prev => prev + 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user');
      throw err;
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.deleteUser(userId);
        setSuccess('User deleted successfully');
        setRefreshUsersTrigger(prev => prev + 1);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleCloseUserForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleProjectFormSubmit = async (projectData: CreateProjectRequest | UpdateProjectRequest) => {
    try {
      setProjectFormLoading(true);
      clearMessages();
      
      if (editingProject) {
        await projectsAPI.updateProject(editingProject.id, projectData as UpdateProjectRequest);
        setSuccess('Project updated successfully');
      } else {
        await projectsAPI.createProject(projectData as CreateProjectRequest);
        setSuccess('Project created successfully');
      }
      
      setRefreshProjectsTrigger(prev => prev + 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save project');
      throw err;
    } finally {
      setProjectFormLoading(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectsAPI.deleteProject(projectId);
        setSuccess('Project deleted successfully');
        setRefreshProjectsTrigger(prev => prev + 1);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete project');
      }
    }
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleCloseProjectForm = () => {
    setShowProjectForm(false);
    setEditingProject(null);
  };

  const handleTabChange = (tab: 'projects' | 'users' | 'customers' | 'estimates' | 'invoices' | 'materials' | 'services' | 'todos' | 'calendar') => {
    setActiveTab(tab);
    clearMessages();
  };

  const tabs = [
    { id: 'projects', label: 'Projects', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
    { id: 'todos', label: 'All Tasks', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ...(isAdmin ? [
      { id: 'customers', label: 'Customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
      { id: 'estimates', label: 'Estimates', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { id: 'invoices', label: 'Invoices', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
      { id: 'materials', label: 'Materials', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { id: 'services', label: 'Services', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
      { id: 'users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' }
    ] : [])
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Logo size="md" />
              <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => logout()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`inline-flex items-center px-1 pt-4 pb-4 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
            <button onClick={clearMessages} className="text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
            <button onClick={clearMessages} className="text-green-500 hover:text-green-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
                <p className="text-gray-600">Manage your electrical projects</p>
              </div>
              <button
                onClick={handleCreateProject}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Project
              </button>
            </div>
            <ProjectList
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
              refreshTrigger={refreshProjectsTrigger}
            />
          </div>
        )}

        {activeTab === 'todos' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">All Tasks</h2>
              <p className="text-gray-600">Master view of all tasks across projects</p>
            </div>
            <AllTodoLists />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
              <p className="text-gray-600">View tasks organized by due date</p>
            </div>
            <Calendar />
          </div>
        )}

        {isAdmin && activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                <p className="text-gray-600">Manage system users and permissions</p>
              </div>
              <button
                onClick={handleCreateUser}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add User
              </button>
            </div>
            <UserList
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
              refreshTrigger={refreshUsersTrigger}
            />
          </div>
        )}

        {isAdmin && activeTab === 'customers' && <CustomersManagement />}
        {isAdmin && activeTab === 'estimates' && <EstimatesManagement />}
        {isAdmin && activeTab === 'invoices' && <InvoicesManagement />}
        {isAdmin && activeTab === 'materials' && <MaterialsCatalog />}
        {isAdmin && activeTab === 'services' && <ServicesCatalog />}
      </main>

      {/* Modals */}
      <UserForm
        isOpen={showUserForm}
        onClose={handleCloseUserForm}
        onSubmit={handleUserFormSubmit}
        user={editingUser}
        loading={userFormLoading}
      />

      <ProjectForm
        isOpen={showProjectForm}
        onClose={handleCloseProjectForm}
        onSubmit={handleProjectFormSubmit}
        project={editingProject}
        loading={projectFormLoading}
      />
    </div>
  );
};

export default Dashboard; 