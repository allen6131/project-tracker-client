import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customersAPI, invoicesAPI, projectsAPI } from '../services/api';
import { CreateInvoiceRequest, InvoiceItem, Project } from '../types';

const InvoiceCreate: React.FC = () => {
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

  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_id: null as number | null,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    estimate_id: null as number | null,
    project_id: null as number | null,
    tax_rate: 0,
    due_date: '',
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
  });
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unit_price: 0 }]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [customersRes, projectsRes] = await Promise.all([
          customersAPI.getSimpleCustomers(),
          projectsAPI.getProjects(1, 100, ''),
        ]);
        setCustomers(customersRes.customers);
        setProjects(projectsRes.projects);
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

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value } as InvoiceItem;
    setItems(updated);
  };
  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  const removeItem = (index: number) => setItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const taxAmount = subtotal * (formData.tax_rate / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const payload: CreateInvoiceRequest = {
        title: formData.title || undefined,
        description: formData.description || undefined,
        customer_id: formData.customer_id ?? undefined,
        customer_name: formData.customer_name || undefined,
        customer_email: formData.customer_email || undefined,
        customer_phone: formData.customer_phone || undefined,
        customer_address: formData.customer_address || undefined,
        estimate_id: formData.estimate_id ?? undefined,
        project_id: formData.project_id ?? undefined,
        tax_rate: formData.tax_rate,
        due_date: formData.due_date || undefined,
        notes: formData.notes || undefined,
        items: items.filter(it => it.description.trim() !== ''),
      };
      await invoicesAPI.createInvoice(payload);
      setSuccess('Invoice created successfully');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Create Invoice</h2>
        </div>
        <div className="space-x-2">
          <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-md border text-sm">Back</button>
          <button form="invoice-create-form" type="submit" className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">{success}</div>}

      <form id="invoice-create-form" onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
            <select value={formData.customer_id || ''} onChange={(e) => {
              const customerId = e.target.value ? parseInt(e.target.value) : null;
              const customer = customers.find(c => c.id === customerId);
              setFormData({ ...formData, customer_id: customerId, customer_name: customer?.name || '', project_id: null });
            }} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700">
              <option value="">Select Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project (Optional)</label>
            <select value={formData.project_id || ''} onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? parseInt(e.target.value) : null })} disabled={!formData.customer_id} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 disabled:opacity-50">
              <option value="">{!formData.customer_id ? 'Select a customer first...' : 'Select Project (Optional)'}</option>
              {projects.filter(p => !formData.customer_id || p.customer_id === formData.customer_id).map(p => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tax Rate (%)</label>
            <input type="number" step="0.01" min="0" max="100" value={formData.tax_rate} onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
            <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">Items</h4>
            <button type="button" onClick={addItem} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">Add Item</button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <input type="text" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                  <input type="number" step="0.01" min="0" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit Price</label>
                  <input type="number" step="0.01" min="0" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total</label>
                  <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 border rounded-md text-sm">${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</div>
                </div>
                <div className="col-span-1">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded text-sm">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="flex justify-between text-sm"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Tax ({formData.tax_rate}%):</span><span>${taxAmount.toFixed(2)}</span></div>
          <div className="flex justify-between text-lg font-medium border-t pt-2 mt-2"><span>Total:</span><span>${total.toFixed(2)}</span></div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
          <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
        </div>
      </form>
    </div>
  );
};

export default InvoiceCreate;


