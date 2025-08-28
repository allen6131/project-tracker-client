import React, { useState, useEffect } from 'react';
import { TechnicianSchedule, Project, User } from '../types';
import { schedulesAPI, projectsAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TechnicianScheduleModal from './TechnicianScheduleModal';

interface TechnicianCalendarProps {
  currentDate: Date;
  navigateMonth: (direction: 'prev' | 'next') => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
}

const TechnicianCalendar: React.FC<TechnicianCalendarProps> = ({ currentDate, navigateMonth, setError, setSuccess }) => {
  const { user, isAdmin } = useAuth();
  const [schedules, setSchedules] = useState<TechnicianSchedule[]>([]);
  const [schedulesByDate, setSchedulesByDate] = useState<Record<string, TechnicianSchedule[]>>({});
  const [loading, setLoading] = useState(true);
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
      // Load a large set of projects across all statuses so all jobs are selectable
      const response = await projectsAPI.getProjects(1, 1000, '', '');
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
        // If multiple technician ids provided, create multiple schedules
        if (Array.isArray(scheduleData.technician_ids) && scheduleData.technician_ids.length > 0) {
          const { technician_ids, ...base } = scheduleData;
          await Promise.all(
            technician_ids.map((techId: number) =>
              schedulesAPI.createSchedule({ ...base, technician_id: techId })
            )
          );
        } else {
          await schedulesAPI.createSchedule(scheduleData);
        }
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

  // Navigation is now handled by parent component

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

      {/* Messages are now handled by parent component */}

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
                        title={`${schedule.technician_name} - ${schedule.project_name || (schedule as any).custom_project_name || 'Custom Job'}`}
                      >
                        <div className="font-medium truncate">
                          {schedule.technician_name}
                        </div>
                        <div className="truncate text-gray-600">
                          {schedule.project_name || (schedule as any).custom_project_name || 'Custom Job'}
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