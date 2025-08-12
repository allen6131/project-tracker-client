import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { estimatesAPI, projectsAPI } from '../services/api';
import { Estimate, Project, UpdateEstimateRequest, EstimateItem } from '../types';

const EstimateEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const estimateId = useMemo(() => (id ? parseInt(id, 10) : NaN), [id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState({
    description: '',
    project_id: null as number | null,
    total_amount: 0,
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'approved' | 'rejected',
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [items, setItems] = useState<EstimateItem[]>([{ description: '', quantity: 1, unit_price: 0 }]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!estimateId || Number.isNaN(estimateId)) {
          throw new Error('Invalid estimate id');
        }
        const [estRes, projRes] = await Promise.all([
          estimatesAPI.getEstimate(estimateId),
          projectsAPI.getProjects(1, 100, ''),
        ]);
        if (!mounted) return;
        const est = estRes.estimate;
        setEstimate(est);
        setProjects(projRes.projects);
        setFormData({
          description: est.description || '',
          project_id: est.project_id ?? null,
          total_amount: est.total_amount,
          notes: est.notes || '',
          status: est.status,
        });
        // Prefer server-provided items if available, otherwise fall back to single total amount-only mode
        if (Array.isArray(est.items) && est.items.length > 0) {
          setItems(est.items);
        } else {
          setItems([{ description: '', quantity: 1, unit_price: est.total_amount || 0 }]);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load estimate');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [estimateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estimate) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload: UpdateEstimateRequest = {
        description: formData.description,
        status: formData.status,
        total_amount: formData.total_amount,
        notes: formData.notes,
      };

      const nonEmptyItems = items.filter((it) => it.description.trim() !== '');
      if (nonEmptyItems.length > 0) {
        payload.items = nonEmptyItems.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
        }));
      }

      await estimatesAPI.updateEstimate(estimate.id, payload, documentFile ?? undefined);
      setSuccess('Estimate updated successfully');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save estimate');
    } finally {
      setSaving(false);
    }
  };

  const handleItemChange = (index: number, field: keyof EstimateItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value } as EstimateItem;
    setItems(updated);
  };

  const addItem = () => setItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  const removeItem = (index: number) => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const calculateItemsTotal = () => items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">Loading estimate...</div>
    );
  }

  if (error && !estimate) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow text-red-600">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Edit Estimate</h2>
          {estimate && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Estimate #{estimate.id}</p>
          )}
        </div>
        <div className="space-x-2">
          <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-md border text-sm">Back</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project</label>
            <select
              value={formData.project_id || ''}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? parseInt(e.target.value) : null })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Replace Document (optional)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Optional line items editor (if present, shows and lets you edit items; otherwise you can just use total amount) */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">Line Items (optional)</h4>
            <button type="button" onClick={addItem} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">Add Item</button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total</label>
                  <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white">
                    ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                  </div>
                </div>
                <div className="col-span-1">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded text-sm">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mt-4">
            <div className="flex justify-between text-sm text-gray-900 dark:text-white">
              <span>Items Subtotal:</span>
              <span>${calculateItemsTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EstimateEdit;


