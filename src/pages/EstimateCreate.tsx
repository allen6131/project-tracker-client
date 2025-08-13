import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { estimatesAPI, projectsAPI } from '../services/api';
import { CreateEstimateRequest, Project } from '../types';

const EstimateCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectPrefill = useMemo(() => {
    const p = searchParams.get('project');
    return p ? parseInt(p, 10) : null;
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    description: '',
    project_id: null as number | null,
    total_amount: 0,
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'approved' | 'rejected',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await projectsAPI.getProjects(1, 100, '');
        setProjects(res.projects);
        if (projectPrefill) {
          setFormData(prev => ({ ...prev, project_id: projectPrefill }));
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectPrefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      if (!formData.project_id) {
        setError('Please select a project');
        return;
      }
      const payload: CreateEstimateRequest = {
        description: formData.description,
        project_id: formData.project_id,
        total_amount: formData.total_amount,
        notes: formData.notes,
      };
      await estimatesAPI.createEstimate(payload);
      setSuccess('Estimate created successfully');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create estimate');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Create Estimate</h2>
        </div>
        <div className="space-x-2">
          <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-md border text-sm">Back</button>
          <button form="estimate-create-form" type="submit" className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">{success}</div>}

      <form id="estimate-create-form" onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project</label>
            <select value={formData.project_id || ''} onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? parseInt(e.target.value) : null })} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700">
              <option value="">Select Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700">
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount</label>
          <input type="number" step="0.01" min="0" value={formData.total_amount} onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
          <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
        </div>
      </form>
    </div>
  );
};

export default EstimateCreate;


