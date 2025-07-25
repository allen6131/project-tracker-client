import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { projectsAPI, invoicesAPI, estimatesAPI, todoAPI } from '../services/api';

const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    projects: { active: 0, total: 0 },
    invoices: { unpaid: 0, total: 0, totalAmount: 0 },
    estimates: { pending: 0, total: 0 },
    tasks: { pending: 0, total: 0 }
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Load project stats
      const projectsResponse = await projectsAPI.getProjects(1, 100);
      const activeProjects = projectsResponse.projects.filter((p: any) => p.status === 'active' || p.status === 'started').length;
      
      // Load invoice stats
      const invoicesResponse = await invoicesAPI.getInvoices(1, 100);
      const unpaidInvoices = invoicesResponse.invoices.filter((i: any) => i.status !== 'paid' && i.status !== 'cancelled');
      const totalInvoiceAmount = unpaidInvoices.reduce((sum: number, i: any) => sum + i.total_amount, 0);
      
      // Load estimate stats
      const estimatesResponse = await estimatesAPI.getEstimates(1, 100);
      const pendingEstimates = estimatesResponse.estimates.filter((e: any) => e.status === 'sent').length;
      
      // Load todo stats
      const todosResponse = await todoAPI.getAllTodoLists();
      const allTasks = todosResponse.todoLists.flatMap((list: any) => list.items);
      const pendingTasks = allTasks.filter((task: any) => !task.is_completed).length;
      
      setStats({
        projects: { active: activeProjects, total: projectsResponse.projects.length },
        invoices: { 
          unpaid: unpaidInvoices.length, 
          total: invoicesResponse.invoices.length,
          totalAmount: totalInvoiceAmount 
        },
        estimates: { pending: pendingEstimates, total: estimatesResponse.estimates.length },
        tasks: { pending: pendingTasks, total: allTasks.length }
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    { name: 'View Projects', href: '/projects', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'blue' },
    { name: 'Manage Tasks', href: '/todos', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'green' },
    { name: 'View Calendar', href: '/calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'purple' },
    { name: 'Create Invoice', href: '/invoices', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z', color: 'amber' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-colors">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.username}!
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Here's an overview of your project tracking system
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
          <div className="text-center text-gray-900 dark:text-white">Loading dashboard statistics...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Active Projects */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Active Projects</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.projects.active}</div>
                      <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">of {stats.projects.total}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <button 
                onClick={() => navigate('/projects')} 
                className="text-sm text-blue-700 dark:text-blue-300 font-medium hover:text-blue-900 dark:hover:text-blue-100"
              >
                View all →
              </button>
            </div>
          </div>

          {/* Unpaid Invoices */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Unpaid Invoices</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.invoices.unpaid}</div>
                      <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        ${stats.invoices.totalAmount.toFixed(2)}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <button 
                onClick={() => navigate('/invoices')} 
                className="text-sm text-amber-700 dark:text-amber-300 font-medium hover:text-amber-900 dark:hover:text-amber-100"
              >
                View all →
              </button>
            </div>
          </div>

          {/* Pending Estimates */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Pending Estimates</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.estimates.pending}</div>
                      <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">of {stats.estimates.total}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <button 
                onClick={() => navigate('/estimates')} 
                className="text-sm text-purple-700 dark:text-purple-300 font-medium hover:text-purple-900 dark:hover:text-purple-100"
              >
                View all →
              </button>
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Pending Tasks</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.tasks.pending}</div>
                      <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">of {stats.tasks.total}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <button 
                onClick={() => navigate('/todos')} 
                className="text-sm text-green-700 dark:text-green-300 font-medium hover:text-green-900 dark:hover:text-green-100"
              >
                View all →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-colors">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {quickLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => navigate(link.href)}
                className={`relative rounded-lg p-4 text-center hover:shadow-lg transition-all transform hover:scale-105 bg-${link.color}-50 dark:bg-${link.color}-900/30 hover:bg-${link.color}-100 dark:hover:bg-${link.color}-900/50`}
              >
                <svg className={`mx-auto h-8 w-8 text-${link.color}-600 dark:text-${link.color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                </svg>
                <span className={`mt-2 block text-sm font-medium text-${link.color}-900 dark:text-${link.color}-100`}>
                  {link.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 