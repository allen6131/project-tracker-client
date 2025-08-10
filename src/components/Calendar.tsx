import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TodoListWithProject, TodoItem, User } from '../types';
import { todoAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TechnicianCalendar from './TechnicianCalendar';

interface EnhancedTodoItem extends TodoItem {
  listTitle: string;
  projectName: string;
  projectId: number;
  projectStatus: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  todos: EnhancedTodoItem[];
}

interface CalendarProps {}

const Calendar: React.FC<CalendarProps> = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'todos' | 'technicians'>('todos');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [todoLists, setTodoLists] = useState<TodoListWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<number | ''>('');

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

  // Get all todos with due dates
  const getTodosWithDueDates = (): EnhancedTodoItem[] => {
    return todoLists.flatMap(list => 
      list.items
        .filter(item => item.due_date)
        .map(item => ({
          ...item,
          listTitle: list.title,
          projectName: list.project_name,
          projectId: list.project_id,
          projectStatus: list.project_status
        }))
    );
  };

  // Generate calendar days for the current month
  const getCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const todosWithDueDates = getTodosWithDueDates();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayTodos = todosWithDueDates.filter(todo => {
        if (!todo.due_date) return false;
        const todoDate = new Date(todo.due_date);
        return todoDate.toDateString() === date.toDateString();
      });
      
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        todos: dayTodos
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(day.date);
    setShowDayModal(true);
  };

  const getSelectedDayTodos = () => {
    if (!selectedDay) return [];
    const todosWithDueDates = getTodosWithDueDates();
    return todosWithDueDates.filter(todo => {
      if (!todo.due_date) return false;
      const todoDate = new Date(todo.due_date);
      return todoDate.toDateString() === selectedDay.toDateString();
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  const getDueDateIndicator = (todosCount: number, hasOverdue: boolean) => {
    if (hasOverdue) return 'bg-red-500';
    if (todosCount > 0) return 'bg-blue-500';
    return '';
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isOverdue = (dueDate: string, isCompleted: boolean) => {
    if (isCompleted) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  const openTodoInProject = (todo: EnhancedTodoItem) => {
    navigate(`/projects/${todo.projectId}?tab=todos&list=${todo.todo_list_id}&item=${todo.id}`);
  };

  const calendarDays = getCalendarDays();
  const selectedDayTodos = getSelectedDayTodos();

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {activeTab === 'todos' ? 'Calendar' : 'Technician Schedule'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'todos' 
                  ? 'View todos by due date' 
                  : 'Assign technicians to projects and track their schedules'
                }
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('todos')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'todos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Todo Calendar
            </button>
            <button
              onClick={() => setActiveTab('technicians')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'technicians'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Technician Schedule
            </button>
          </nav>
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

      {/* Tab Content */}
      {activeTab === 'todos' && (
        <>
          {/* Todo Calendar */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const hasOverdue = day.todos.some(todo => isOverdue(todo.due_date!, todo.is_completed));
              const todosCount = day.todos.length;
              const completedCount = day.todos.filter(todo => todo.is_completed).length;
              
              return (
                <div
                  key={index}
                  className={`
                    relative p-2 h-32 border border-gray-200 transition-colors overflow-hidden
                    ${day.isCurrentMonth 
                      ? 'bg-white' 
                      : 'bg-gray-50 text-gray-400'
                    }
                    ${isToday(day.date) ? 'ring-2 ring-blue-500' : ''}
                  `}
                >
                  <div 
                    className="flex justify-between items-start cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
                    onClick={() => day.isCurrentMonth && handleDayClick(day)}
                  >
                    <span className={`text-sm font-medium ${
                      isToday(day.date) ? 'text-blue-600' : 
                      day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {day.date.getDate()}
                    </span>
                    {todosCount > 0 && (
                      <div className={`w-2 h-2 rounded-full ${getDueDateIndicator(todosCount, hasOverdue)}`} />
                    )}
                  </div>
                  
                  {/* Individual Tasks */}
                  {day.isCurrentMonth && day.todos.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {day.todos.slice(0, 3).map((todo) => (
                        <div
                          key={todo.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openTodoInProject(todo);
                          }}
                          className={`
                            text-xs p-1 rounded cursor-pointer transition-colors
                            ${todo.is_completed 
                              ? 'bg-green-100 text-green-800 line-through' 
                              : isOverdue(todo.due_date!, todo.is_completed)
                                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }
                          `}
                          title={`${todo.content} - ${todo.projectName}`}
                        >
                          <div className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={todo.is_completed}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleItem(todo);
                              }}
                              className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate flex-1">
                              {todo.content.length > 15 ? `${todo.content.slice(0, 15)}...` : todo.content}
                            </span>
                          </div>
                        </div>
                      ))}
                      {day.todos.length > 3 && (
                        <div 
                          className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 text-center py-1"
                          onClick={() => day.isCurrentMonth && handleDayClick(day)}
                        >
                          +{day.todos.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Summary for non-current month or when no space */}
                  {(!day.isCurrentMonth || day.todos.length === 0) && todosCount > 0 && (
                    <div className="mt-1">
                      <div className="text-xs text-gray-600">
                        {completedCount}/{todosCount} done
                      </div>
                      {hasOverdue && (
                        <div className="text-xs text-red-600 font-medium">
                          Overdue
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {showDayModal && selectedDay && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {formatDate(selectedDay)}
                </h3>
                <button
                  onClick={() => setShowDayModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedDayTodos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No todos due on this day.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    💡 <strong>Tip:</strong> Click on any task to mark it as complete/incomplete. Use the "Assign" button to reassign tasks.
                  </div>
                  {selectedDayTodos.map((todo) => (
                    <div 
                      key={todo.id} 
                      className={`
                        border rounded-lg p-4 transition-colors cursor-pointer
                        ${todo.is_completed 
                          ? 'bg-green-50 border-green-200' 
                          : isOverdue(todo.due_date!, todo.is_completed)
                            ? 'bg-red-50 border-red-200 hover:bg-red-100'
                            : 'hover:bg-gray-50'
                        }
                      `}
                      onClick={() => openTodoInProject(todo)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={todo.is_completed}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleItem(todo);
                            }}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <h4 className={`font-medium ${todo.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {todo.content}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {todo.projectName} - {todo.listTitle}
                            </p>
                            {isOverdue(todo.due_date!, todo.is_completed) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-2">
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          {editingItemId === todo.id ? (
                            <select
                              value={editingAssignment}
                              onChange={(e) => setEditingAssignment(e.target.value === '' ? '' : Number(e.target.value))}
                              className="text-xs border rounded px-2 py-1"
                            >
                              <option value="">Unassigned</option>
                              {activeUsers.map(user => (
                                <option key={user.id} value={user.id}>
                                  {user.username}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`text-xs px-2 py-1 rounded ${
                              todo.assigned_username 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {todo.assigned_username || 'Unassigned'}
                            </span>
                          )}
                          {editingItemId === todo.id ? (
                            <button
                              onClick={() => handleAssignmentChange(todo.id, editingAssignment)}
                              className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              onClick={() => startEditingAssignment(todo)}
                              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'technicians' && (
        <TechnicianCalendar 
          currentDate={currentDate}
          navigateMonth={navigateMonth}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
    </div>
  );
};

export default Calendar; 