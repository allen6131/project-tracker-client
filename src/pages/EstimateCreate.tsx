import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { estimatesAPI, projectsAPI, catalogMaterialsAPI, servicesAPI } from '../services/api';
import { CreateEstimateRequest, Project, EstimateItem, CatalogMaterial, Service } from '../types';

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
  const [materials, setMaterials] = useState<CatalogMaterial[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: null as number | null,
    total_amount: 0,
    notes: '',
  });

  const [items, setItems] = useState<EstimateItem[]>([{ 
    item_type: 'custom' as const, 
    description: '', 
    quantity: 1, 
    unit: 'each',
    unit_price: 0 
  }]);

  // Modal states for selecting materials/services
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [projectsRes, materialsRes, servicesRes] = await Promise.all([
          projectsAPI.getProjects(1, 100, ''),
          catalogMaterialsAPI.getCatalogMaterials(1, 100, '', '', true),
          servicesAPI.getServices(1, 100, '', '', true),
        ]);
        setProjects(projectsRes.projects);
        setMaterials(materialsRes.materials);
        setServices(servicesRes.services);
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

  const handleItemChange = (index: number, field: keyof EstimateItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value } as EstimateItem;
    setItems(updated);
  };

  const addCustomItem = () => setItems((prev) => [...prev, { 
    item_type: 'custom', 
    description: '', 
    quantity: 1, 
    unit: 'each',
    unit_price: 0 
  }]);

  const addMaterialItem = (material: CatalogMaterial) => {
    setItems((prev) => [...prev, {
      item_type: 'material',
      material_id: material.id,
      description: material.name,
      quantity: 1,
      unit: material.unit,
      unit_price: material.standard_cost || 0,
      markup_percentage: 0,
      material: material
    }]);
    setShowMaterialModal(false);
  };

  const addServiceItem = (service: Service) => {
    setItems((prev) => [...prev, {
      item_type: 'service',
      service_id: service.id,
      description: service.name,
      quantity: 1,
      unit: service.unit,
      unit_price: service.standard_rate || 0,
      markup_percentage: 0,
      service: service
    }]);
    setShowServiceModal(false);
  };

  const removeItem = (index: number) => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const calculateItemsTotal = () => items.reduce((sum, it) => {
    const baseTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
    const markupMultiplier = 1 + ((Number(it.markup_percentage) || 0) / 100);
    return sum + (baseTotal * markupMultiplier);
  }, 0);

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
      
      const nonEmptyItems = items.filter((it) => it.description.trim() !== '');
      const calculatedTotal = calculateItemsTotal();
      
      const payload: CreateEstimateRequest = {
        title: formData.title || undefined,
        description: formData.description,
        project_id: formData.project_id,
        total_amount: calculatedTotal > 0 ? calculatedTotal : formData.total_amount,
        notes: formData.notes,
        items: nonEmptyItems.length > 0 ? nonEmptyItems.map((it) => ({
          item_type: it.item_type,
          material_id: it.material_id,
          service_id: it.service_id,
          description: it.description,
          quantity: Number(it.quantity) || 0,
          unit: it.unit,
          unit_price: Number(it.unit_price) || 0,
          markup_percentage: Number(it.markup_percentage) || 0,
          notes: it.notes
        })) : undefined
      };
      await estimatesAPI.createEstimate(payload);
      setSuccess('Estimate created successfully');
      // Navigate back after a short delay to show success message
      setTimeout(() => navigate(-1), 2000);
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
          <button form="estimate-create-form" type="submit" className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">{success}</div>}

      <form id="estimate-create-form" onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title (Optional)</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
              placeholder="Auto-generated if empty"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project *</label>
            <select 
              value={formData.project_id || ''} 
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? parseInt(e.target.value) : null })} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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

        {/* Line items editor with support for materials, services, and custom items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">Line Items</h4>
            <div className="space-x-2">
              <button 
                type="button" 
                onClick={() => setShowMaterialModal(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              >
                Add Material
              </button>
              <button 
                type="button" 
                onClick={() => setShowServiceModal(true)} 
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
              >
                Add Service
              </button>
              <button 
                type="button" 
                onClick={addCustomItem} 
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
              >
                Add Custom Item
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                    <div className="mt-1 px-2 py-1 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded text-xs text-center text-gray-900 dark:text-white">
                      {item.item_type === 'material' ? 'Mat' : item.item_type === 'service' ? 'Svc' : 'Custom'}
                    </div>
                  </div>
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      readOnly={item.item_type !== 'custom'}
                      className={`mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white ${
                        item.item_type !== 'custom' 
                          ? 'bg-gray-100 dark:bg-gray-600' 
                          : 'bg-white dark:bg-gray-700'
                      }`}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      readOnly={item.item_type !== 'custom'}
                      className={`mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white ${
                        item.item_type !== 'custom' 
                          ? 'bg-gray-100 dark:bg-gray-600' 
                          : 'bg-white dark:bg-gray-700'
                      }`}
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
                  {item.item_type !== 'custom' && (
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Markup %</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.markup_percentage || 0}
                        onChange={(e) => handleItemChange(index, 'markup_percentage', parseFloat(e.target.value) || 0)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}
                  <div className={item.item_type !== 'custom' ? "col-span-1" : "col-span-2"}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total</label>
                    <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white">
                      ${(
                        (item.quantity || 0) * 
                        (item.unit_price || 0) * 
                        (1 + ((item.markup_percentage || 0) / 100))
                      ).toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <button 
                      type="button" 
                      onClick={() => removeItem(index)} 
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded text-sm w-full"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                {item.item_type !== 'custom' && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {item.item_type === 'material' && item.material && (
                      <span>Material: {item.material.category && `${item.material.category} - `}{item.material.supplier && `Supplier: ${item.material.supplier}`}</span>
                    )}
                    {item.item_type === 'service' && item.service && (
                      <span>Service: {item.service.category && `${item.service.category}`}</span>
                    )}
                  </div>
                )}
                
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Notes (optional)..."
                    value={item.notes || ''}
                    onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                    className="block w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
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

        {/* Fallback total amount - only used if no items are provided */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Manual Total Amount (only used if no line items)
          </label>
          <input 
            type="number" 
            step="0.01" 
            min="0" 
            value={formData.total_amount} 
            onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })} 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
          />
          <p className="text-xs text-gray-500 mt-1">This will be ignored if you have line items above.</p>
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
      </form>

      {/* Material Selection Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Select Material</h3>
              <button 
                onClick={() => setShowMaterialModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {materials.map((material) => (
                <div 
                  key={material.id}
                  onClick={() => addMaterialItem(material)}
                  className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{material.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {material.category && `${material.category} • `}
                      {material.unit} • ${(material.standard_cost || 0).toFixed(2)}
                      {material.supplier && ` • ${material.supplier}`}
                    </div>
                    {material.description && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{material.description}</div>
                    )}
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Service Selection Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Select Service</h3>
              <button 
                onClick={() => setShowServiceModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {services.map((service) => (
                <div 
                  key={service.id}
                  onClick={() => addServiceItem(service)}
                  className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{service.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {service.category && `${service.category} • `}
                      {service.unit} • ${(service.standard_rate || 0).toFixed(2)}
                    </div>
                    {service.description && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{service.description}</div>
                    )}
                  </div>
                  <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm">
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstimateCreate;