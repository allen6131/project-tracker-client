import React, { useState, useEffect } from 'react';
import { TechnicianSchedule, Project, User, CreateTechnicianScheduleRequest } from '../types';

interface TechnicianScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTechnicianScheduleRequest & { technician_ids?: number[] }) => void;
  onDelete?: () => void;
  schedule?: TechnicianSchedule | null;
  selectedDate?: string | null;
  technicians: User[];
  projects: Project[];
}

const TechnicianScheduleModal: React.FC<TechnicianScheduleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  schedule,
  selectedDate,
  technicians,
  projects,
}) => {
  // Format date for form input (extracts YYYY-MM-DD without timezone conversion)
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // For ISO strings or other formats, extract date part safely
    try {
      const ymd = dateString.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        return ymd;
      }
      // Fallback: parse as local date
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };
  const [formData, setFormData] = useState({
    project_id: '',
    custom_project_name: '',
    technician_id: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    notes: '',
    status: 'scheduled' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [multiAssign, setMultiAssign] = useState(false);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<number[]>([]);

  useEffect(() => {
    if (schedule) {
      setFormData({
        project_id: schedule.project_id ? schedule.project_id.toString() : '',
        custom_project_name: schedule.custom_project_name || '',
        technician_id: schedule.technician_id.toString(),
        scheduled_date: formatDateForInput(schedule.scheduled_date),
        start_time: schedule.start_time || '',
        end_time: schedule.end_time || '',
        notes: schedule.notes || '',
        status: schedule.status,
      });
      setMultiAssign(false);
      setSelectedTechnicianIds([schedule.technician_id]);
    } else {
      setFormData({
        project_id: '',
        custom_project_name: '',
        technician_id: '',
        scheduled_date: formatDateForInput(selectedDate || ''),
        start_time: '',
        end_time: '',
        notes: '',
        status: 'scheduled',
      });
      setMultiAssign(false);
      setSelectedTechnicianIds([]);
    }
    setErrors({});
  }, [schedule, selectedDate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.project_id && !formData.custom_project_name.trim()) {
      newErrors.project_id = 'Either select an existing project or enter a custom project name';
    }

    if (!multiAssign) {
      if (!formData.technician_id) {
        newErrors.technician_id = 'Technician is required';
      }
    } else {
      if (selectedTechnicianIds.length === 0) {
        newErrors.technician_id = 'Select at least one technician';
      }
    }

    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Date is required';
    }

    if (formData.start_time && formData.end_time) {
      const startTime = new Date(`2000-01-01T${formData.start_time}`);
      const endTime = new Date(`2000-01-01T${formData.end_time}`);
      
      if (startTime >= endTime) {
        newErrors.end_time = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const submitData: CreateTechnicianScheduleRequest & { technician_ids?: number[]; custom_project_name?: string } = {
        project_id: formData.project_id ? parseInt(formData.project_id) : undefined,
        custom_project_name: formData.custom_project_name || undefined,
        technician_id: formData.technician_id ? parseInt(formData.technician_id) : (selectedTechnicianIds[0] ?? 0),
        scheduled_date: formData.scheduled_date,
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined,
        notes: formData.notes || undefined,
        status: formData.status,
      };
      if (multiAssign && selectedTechnicianIds.length > 0) {
        submitData.technician_ids = selectedTechnicianIds;
      }

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this schedule?')) {
      onDelete();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto transition-colors">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {schedule ? 'Edit Schedule' : 'Create Schedule'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value, custom_project_name: e.target.value ? '' : formData.custom_project_name })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.project_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select existing project (optional)</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} - {project.address}
                  </option>
                ))}
              </select>
              {errors.project_id && (
                <p className="mt-1 text-sm text-red-600">{errors.project_id}</p>
              )}
            </div>

            {/* Custom Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Or Enter Custom Project/Job Name
              </label>
              <input
                type="text"
                value={formData.custom_project_name}
                onChange={(e) => setFormData({ ...formData, custom_project_name: e.target.value, project_id: e.target.value ? '' : formData.project_id })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter custom project or job name"
              />
              <p className="mt-1 text-xs text-gray-500">Use this for jobs that don't have an existing project</p>
            </div>

            {/* Technician Selection */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {multiAssign ? 'Technicians *' : 'Technician *'}
                </label>
                {!schedule && (
                  <button
                    type="button"
                    onClick={() => setMultiAssign((v) => !v)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {multiAssign ? 'Use single select' : 'Assign multiple'}
                  </button>
                )}
              </div>

              {!multiAssign && (
                <select
                  value={formData.technician_id}
                  onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.technician_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a technician</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.username} ({technician.email})
                    </option>
                  ))}
                </select>
              )}

              {multiAssign && (
                <div className={`max-h-48 overflow-auto border rounded-md p-2 ${errors.technician_id ? 'border-red-500' : 'border-gray-300'}`}>
                  {technicians.map((technician) => {
                    const checked = selectedTechnicianIds.includes(technician.id);
                    return (
                      <label key={technician.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedTechnicianIds((prev) =>
                              e.target.checked ? [...prev, technician.id] : prev.filter((id) => id !== technician.id)
                            );
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{technician.username} ({technician.email})</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {errors.technician_id && (
                <p className="mt-1 text-sm text-red-600">{errors.technician_id}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.scheduled_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.scheduled_date && (
                <p className="mt-1 text-sm text-red-600">{errors.scheduled_date}</p>
              )}
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.end_time ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.end_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes or instructions..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <div>
                {onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : schedule ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TechnicianScheduleModal; 