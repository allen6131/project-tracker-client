import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TodoListWithProject, TodoItem, User } from '../types';
import { todoAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AllTodoLists: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [todoLists, setTodoLists] = useState<TodoListWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterAssignee, setFilterAssignee] = useState<number | 'all' | 'unassigned'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<number | ''>('');

  const itemsPerPage = 10;

  useEffect(() => {
    loadTodoLists();
    loadActiveUsers();
  }, []);

  const loadTodoLists = async () => {
    try {
      setLoading(true);
      const response = await todoAPI.getAllTodoLists();
      setTodoLists(response.todoLists);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load todo lists');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveUsers = async () => {
    try {
      const response = await usersAPI.getActiveUsers();
      setActiveUsers(response.users);
    } catch (err) {
      console.error('Failed to load active users:', err);
    }
  };

  const handleToggleItem = async (item: TodoItem) => {
    try {
      const updatedItem = await todoAPI.updateTodoItem(item.id, { is_completed: !item.is_completed });
      setTodoLists(lists => lists.map(list => ({
        ...list,
        items: list.items.map(i => i.id === item.id ? updatedItem : i)
      })));
      setSuccess('Task updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await todoAPI.deleteTodoItem(itemId);
      setTodoLists(lists => lists.map(list => ({
        ...list,
        items: list.items.filter(i => i.id !== itemId)
      })));
      setSuccess('Task deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleAssignmentChange = async (itemId: number, newAssignedTo: number | '') => {
    try {
      const assignedTo = newAssignedTo === '' ? null : Number(newAssignedTo);
      const updatedItem = await todoAPI.updateTodoItem(itemId, { assigned_to: assignedTo });
      setTodoLists(lists => lists.map(list => ({
        ...list,
        items: list.items.map(i => i.id === itemId ? updatedItem : i)
      })));
      setEditingItemId(null);
      setSuccess('Assignment updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update assignment');
    }
  };

  const startEditingAssignment = (item: TodoItem) => {
    setEditingItemId(item.id);
    setEditingAssignment(item.assigned_to || '');
  };

  const cancelEditingAssignment = () => {
    setEditingItemId(null);
    setEditingAssignment('');
  };

  const getRoleBadgeColor = (role: 'admin' | 'user' | null | undefined) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'user':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'done':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'bidding':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'started':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDueDateColor = (dueDate: string | null | undefined, isCompleted: boolean) => {
    if (!dueDate || isCompleted) return 'text-gray-500';
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'text-red-600'; // Overdue
    if (diffDays === 0) return 'text-orange-600'; // Due today
    if (diffDays <= 3) return 'text-yellow-600'; // Due soon
    return 'text-gray-600'; // Future
  };

  // Filter and search logic
  const filteredTodoLists = todoLists.filter(list => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      list.title.toLowerCase().includes(searchLower) ||
      list.project_name.toLowerCase().includes(searchLower) ||
      list.items.some(item => 
        item.content.toLowerCase().includes(searchLower) ||
        item.assigned_username?.toLowerCase().includes(searchLower)
      );

    const hasMatchingItems = list.items.some(item => {
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'completed' && item.is_completed) ||
        (filterStatus === 'pending' && !item.is_completed);
      
      const matchesAssignee = filterAssignee === 'all' ||
        (filterAssignee === 'unassigned' && !item.assigned_to) ||
        (typeof filterAssignee === 'number' && item.assigned_to === filterAssignee);
      
      return matchesStatus && matchesAssignee;
    });

    return matchesSearch && hasMatchingItems;
  });

  // Flatten all items for pagination
  const allItems = filteredTodoLists.flatMap(list => 
    list.items
      .filter(item => {
        const matchesStatus = filterStatus === 'all' || 
          (filterStatus === 'completed' && item.is_completed) ||
          (filterStatus === 'pending' && !item.is_completed);
        
        const matchesAssignee = filterAssignee === 'all' ||
          (filterAssignee === 'unassigned' && !item.assigned_to) ||
          (typeof filterAssignee === 'number' && item.assigned_to === filterAssignee);
        
        return matchesStatus && matchesAssignee;
      })
      .map(item => ({
        ...item,
        listTitle: list.title,
        projectName: list.project_name,
        projectId: list.project_id,
        projectStatus: list.project_status,
        projectLocation: list.project_location
      }))
  );

  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = allItems.slice(startIndex, startIndex + itemsPerPage);

  // Calculate overall stats
  const totalItems = todoLists.reduce((sum, list) => sum + list.items.length, 0);
  const completedItems = todoLists.reduce((sum, list) => 
    sum + list.items.filter(item => item.is_completed).length, 0
  );
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (loading) return <div className="text-center py-8">Loading todo lists...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">All Todo Lists</h2>
              <p className="mt-1 text-sm text-gray-500">
                Master view of all tasks across all projects
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{completedItems}</span> of{' '}
                <span className="font-medium">{totalItems}</span> completed
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {completionPercentage}%
              </span>
            </div>
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
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks, lists, or projects..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'completed')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tasks</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 mb-1">
                Assignee
              </label>
              <select
                id="assignee"
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value === 'all' ? 'all' : e.target.value === 'unassigned' ? 'unassigned' : Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {activeUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterAssignee('all');
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Todo Items List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Tasks ({allItems.length})
            </h3>
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {paginatedItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tasks found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-grow">
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() => handleToggleItem(item)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                      />
                      <div className="ml-3 flex-grow">
                        <div className="flex items-center gap-2 mb-2">
                          <Link 
                            to={`/projects/${item.projectId}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {item.projectName}
                          </Link>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(item.projectStatus)}`}>
                            {item.projectStatus}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-600">{item.listTitle}</span>
                        </div>
                        
                        <div className={`text-sm ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {item.content}
                        </div>
                        
                        {/* Assignment and Due Date */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {editingItemId === item.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={editingAssignment}
                                onChange={(e) => setEditingAssignment(e.target.value === '' ? '' : Number(e.target.value))}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="">Unassigned</option>
                                {activeUsers.map(user => (
                                  <option key={user.id} value={user.id}>
                                    {user.username} ({user.role})
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssignmentChange(item.id, editingAssignment)}
                                className="text-xs text-green-600 hover:text-green-800"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditingAssignment}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {item.assigned_username ? (
                                <span 
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border cursor-pointer hover:bg-opacity-80 ${getRoleBadgeColor(item.assigned_user_role)}`}
                                  onClick={() => (isAdmin || item.assigned_to === user?.id) && startEditingAssignment(item)}
                                  title={isAdmin || item.assigned_to === user?.id ? "Click to change assignment" : ""}
                                >
                                  {item.assigned_username}
                                </span>
                              ) : (
                                <button
                                  onClick={() => (isAdmin || !item.assigned_to) && startEditingAssignment(item)}
                                  className="text-xs text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 rounded px-2 py-1"
                                  disabled={!isAdmin && Boolean(item.assigned_to)}
                                >
                                  Assign
                                </button>
                              )}
                              
                              {item.due_date && (
                                <span className={`text-xs px-2 py-1 rounded ${getDueDateColor(item.due_date, item.is_completed)}`}>
                                  📅 {formatDate(item.due_date)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {(isAdmin || item.assigned_to === user?.id) && (
                      <button 
                        onClick={() => handleDeleteItem(item.id)} 
                        className="text-gray-400 hover:text-red-500 text-sm ml-2"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllTodoLists; 