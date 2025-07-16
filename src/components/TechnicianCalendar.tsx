import React, { useState, useEffect } from 'react';
import { TechnicianSchedule, Project, User } from '../types';
import { schedulesAPI, projectsAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TechnicianScheduleModal from './TechnicianScheduleModal';

interface TechnicianCalendarProps {}

const TechnicianCalendar: React.FC<TechnicianCalendarProps> = () => {
  const { user, isAdmin } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<TechnicianSchedule[]>([]);
  const [schedulesByDate, setSchedulesByDate] = useState<Record<string, TechnicianSchedule[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TechnicianSchedule | null>(null);

  useEffect(() => {
    loadTechnicians();
    loadProjects();
    loadSchedules();
  }, [currentDate]);

  const loadTechnicians = async () => {
    try {
      const response = await usersAPI.getActiveUsers();
      setTechnicians(response.users);
    } catch (err) {
      console.error('Failed to load technicians:', err);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getProjects(1, 100, '', 'active');
      setProjects(response.projects);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await schedulesAPI.getCalendarSchedules(
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0],
        'month'
      );
      
      setSchedules(response.schedules);
      setSchedulesByDate(response.schedulesByDate);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = (date: string) => {
    setSelectedDate(date);
    setEditingSchedule(null);
    setShowScheduleModal(true);
  };

  const handleEditSchedule = (schedule: TechnicianSchedule) => {
    setEditingSchedule(schedule);
    setShowScheduleModal(true);
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await schedulesAPI.deleteSchedule(scheduleId);
      setSuccess('Schedule deleted successfully');
      loadSchedules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete schedule');
    }
  };

  const handleScheduleSubmit = async (scheduleData: any) => {
    try {
      if (editingSchedule) {
        await schedulesAPI.updateSchedule(editingSchedule.id, scheduleData);
        setSuccess('Schedule updated successfully');
      } else {
        await schedulesAPI.createSchedule(scheduleData);
        setSuccess('Schedule created successfully');
      }
      setShowScheduleModal(false);
      setEditingSchedule(null);
      setSelectedDate(null);
      loadSchedules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save schedule');
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTechnicianColor = (technicianId: number) => {
    const colors = [
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-red-100 text-red-800 border-red-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-gray-100 text-gray-800 border-gray-200',
    ];
    return colors[technicianId % colors.length];
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calendarDays = getCalendarDays();

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading technician schedules...</p>
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
              <h2 className="text-lg font-medium text-gray-900">Technician Schedule</h2>
              <p className="mt-1 text-sm text-gray-500">
                Assign technicians to projects and track their schedules
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

      {/* Legend */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-700">Scheduled</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-sm text-gray-700">In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700">Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-700">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
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
              const dateString = day.toISOString().split('T')[0];
              const daySchedules = schedulesByDate[dateString] || [];
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] border border-gray-200 p-2 cursor-pointer transition-colors
                    ${isCurrentMonth 
                      ? 'bg-white hover:bg-gray-50' 
                      : 'bg-gray-50 text-gray-400'
                    }
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                  `}
                  onClick={() => isCurrentMonth && handleCreateSchedule(dateString)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-medium ${
                      isToday ? 'text-blue-600' : 
                      isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {day.getDate()}
                    </span>
                    {isCurrentMonth && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateSchedule(dateString);
                        }}
                        className="text-gray-400 hover:text-blue-600 text-xs"
                        title="Add schedule"
                      >
                        +
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {daySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className={`text-xs p-1 rounded border cursor-pointer hover:opacity-80 ${getTechnicianColor(schedule.technician_id)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSchedule(schedule);
                        }}
                        title={`${schedule.technician_name} - ${schedule.project_name}`}
                      >
                        <div className="font-medium truncate">
                          {schedule.technician_name}
                        </div>
                        <div className="truncate text-gray-600">
                          {schedule.project_name}
                        </div>
                        {schedule.start_time && (
                          <div className="text-gray-500">
                            {formatTime(schedule.start_time)}
                            {schedule.end_time && ` - ${formatTime(schedule.end_time)}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <TechnicianScheduleModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setEditingSchedule(null);
            setSelectedDate(null);
          }}
          onSubmit={handleScheduleSubmit}
          schedule={editingSchedule}
          selectedDate={selectedDate}
          technicians={technicians}
          projects={projects}
          onDelete={editingSchedule ? () => handleDeleteSchedule(editingSchedule.id) : undefined}
        />
      )}
    </div>
  );
};

export default TechnicianCalendar; 