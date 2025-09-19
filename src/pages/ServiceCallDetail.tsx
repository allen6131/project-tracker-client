import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ServiceCall, 
  ServiceCallMaterial, 
  ServiceCallLineItem,
  CreateServiceCallMaterialRequest,
  CreateServiceCallLineItemRequest,
  UpdateServiceCallRequest,
  CatalogMaterial
} from '../types';
import { serviceCallsAPI, catalogMaterialsAPI, customersAPI, projectsAPI } from '../services/api';
import ServiceCallComments from '../components/ServiceCallComments';

const ServiceCallDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [serviceCall, setServiceCall] = useState<ServiceCall | null>(null);
  const [materials, setMaterials] = useState<ServiceCallMaterial[]>([]);
  const [lineItems, setLineItems] = useState<ServiceCallLineItem[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<CatalogMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string; customer_id?: number | null }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: number; username: string; email: string }[]>([]);
  
  // Modal states
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showLineItemModal, setShowLineItemModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  // Form states
  const [materialForm, setMaterialForm] = useState<CreateServiceCallMaterialRequest>({
    description: '',
    quantity: 1,
    unit: 'each',
    unit_cost: 0,
    total_cost: 0,
    notes: ''
  });
  
  const [lineItemForm, setLineItemForm] = useState<CreateServiceCallLineItemRequest>({
    description: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0
  });
  
  // Edit form data
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    customer_id: null as number | null,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    project_id: null as number | null,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    status: 'open' as 'open' | 'in_progress' | 'completed' | 'cancelled',
    service_type: '',
    scheduled_date: '',
    completed_date: '',
    technician_id: null as number | null,
    estimated_hours: null as number | null,
    actual_hours: null as number | null,
    hourly_rate: null as number | null,
    materials_cost: null as number | null,
    notes: ''
  });

  useEffect(() => {
    if (id) {
      loadServiceCallDetails();
      loadCatalogMaterials();
      loadSupportingData();
    }
  }, [id]);

  const loadServiceCallDetails = async () => {
    try {
      setLoading(true);
      const serviceCallResponse = await serviceCallsAPI.getServiceCall(parseInt(id!));
      setServiceCall(serviceCallResponse.serviceCall);
      
      // Populate edit form data
      const sc = serviceCallResponse.serviceCall;
      setEditFormData({
        title: sc.title,
        description: sc.description || '',
        customer_id: sc.customer_id,
        customer_name: sc.customer_name,
        customer_email: sc.customer_email || '',
        customer_phone: sc.customer_phone || '',
        customer_address: sc.customer_address || '',
        project_id: sc.project_id,
        priority: sc.priority,
        status: sc.status,
        service_type: sc.service_type || '',
        scheduled_date: sc.scheduled_date ? sc.scheduled_date.split('T')[0] : '',
        completed_date: sc.completed_date ? sc.completed_date.split('T')[0] : '',
        technician_id: sc.technician_id,
        estimated_hours: sc.estimated_hours,
        actual_hours: sc.actual_hours,
        hourly_rate: sc.hourly_rate,
        materials_cost: sc.materials_cost,
        notes: sc.notes || ''
      });
      
      if (serviceCallResponse.serviceCall.billing_type === 'time_material') {
        const materialsResponse = await serviceCallsAPI.getServiceCallMaterials(parseInt(id!));
        setMaterials(materialsResponse.materials);
      } else if (serviceCallResponse.serviceCall.billing_type === 'estimate') {
        const lineItemsResponse = await serviceCallsAPI.getServiceCallLineItems(parseInt(id!));
        setLineItems(lineItemsResponse.lineItems);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load service call details');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogMaterials = async () => {
    try {
      const response = await catalogMaterialsAPI.getCatalogMaterials(1, 100, '', '', true);
      setCatalogMaterials(response.materials);
    } catch (err) {
      console.error('Failed to load catalog materials:', err);
    }
  };

  const loadSupportingData = async () => {
    try {
      const [customersRes, projectsRes, techniciansRes] = await Promise.all([
        customersAPI.getSimpleCustomers(),
        projectsAPI.getProjects(1, 100, ''),
        serviceCallsAPI.getTechnicians()
      ]);
      
      setCustomers(customersRes.customers);
      setProjects(projectsRes.projects);
      setTechnicians(techniciansRes.technicians);
    } catch (err) {
      console.error('Failed to load supporting data:', err);
    }
  };

  const handleAddMaterial = async () => {
    try {
      await serviceCallsAPI.addServiceCallMaterial(parseInt(id!), materialForm);
      setSuccess('Material added successfully');
      setShowMaterialModal(false);
      setMaterialForm({
        description: '',
        quantity: 1,
        unit: 'each',
        unit_cost: 0,
        total_cost: 0,
        notes: ''
      });
      loadServiceCallDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add material');
    }
  };

  const handleAddLineItem = async () => {
    try {
      await serviceCallsAPI.addServiceCallLineItem(parseInt(id!), lineItemForm);
      setSuccess('Line item added successfully');
      setShowLineItemModal(false);
      setLineItemForm({
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0
      });
      loadServiceCallDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add line item');
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      const response = await serviceCallsAPI.generateServiceCallInvoice(parseInt(id!));
      setSuccess('Invoice generated successfully');
      setShowInvoiceModal(false);
      // Navigate to the invoice or show success message
      navigate('/invoices');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate invoice');
    }
  };

  const handleSaveEdit = async () => {
    if (!serviceCall) return;

    try {
      setSaving(true);
      setError(null);

      const updateData: UpdateServiceCallRequest = {
        title: editFormData.title,
        description: editFormData.description || undefined,
        customer_name: editFormData.customer_name,
        customer_email: editFormData.customer_email || undefined,
        customer_phone: editFormData.customer_phone || undefined,
        customer_address: editFormData.customer_address || undefined,
        project_id: editFormData.project_id,
        priority: editFormData.priority,
        status: editFormData.status,
        service_type: editFormData.service_type || undefined,
        scheduled_date: editFormData.scheduled_date || undefined,
        completed_date: editFormData.completed_date || undefined,
        technician_id: editFormData.technician_id,
        estimated_hours: editFormData.estimated_hours,
        actual_hours: editFormData.actual_hours,
        hourly_rate: editFormData.hourly_rate,
        materials_cost: editFormData.materials_cost,
        notes: editFormData.notes || undefined
      };

      await serviceCallsAPI.updateServiceCall(serviceCall.id, updateData);
      setSuccess('Service call updated successfully');
      setIsEditing(false);
      loadServiceCallDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update service call');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form data to original values
    if (serviceCall) {
      setEditFormData({
        title: serviceCall.title,
        description: serviceCall.description || '',
        customer_id: serviceCall.customer_id,
        customer_name: serviceCall.customer_name,
        customer_email: serviceCall.customer_email || '',
        customer_phone: serviceCall.customer_phone || '',
        customer_address: serviceCall.customer_address || '',
        project_id: serviceCall.project_id,
        priority: serviceCall.priority,
        status: serviceCall.status,
        service_type: serviceCall.service_type || '',
        scheduled_date: serviceCall.scheduled_date ? serviceCall.scheduled_date.split('T')[0] : '',
        completed_date: serviceCall.completed_date ? serviceCall.completed_date.split('T')[0] : '',
        technician_id: serviceCall.technician_id,
        estimated_hours: serviceCall.estimated_hours,
        actual_hours: serviceCall.actual_hours,
        hourly_rate: serviceCall.hourly_rate,
        materials_cost: serviceCall.materials_cost,
        notes: serviceCall.notes || ''
      });
    }
  };

  const handleMaterialSelect = (materialId: number) => {
    const material = catalogMaterials.find(m => m.id === materialId);
    if (material) {
      setMaterialForm(prev => ({
        ...prev,
        material_id: materialId,
        description: material.name,
        unit: material.unit,
        unit_cost: material.standard_cost,
        total_cost: prev.quantity * material.standard_cost
      }));
    }
  };

  const updateMaterialTotal = (quantity: number, unitCost: number) => {
    setMaterialForm(prev => ({
      ...prev,
      quantity,
      unit_cost: unitCost,
      total_cost: quantity * unitCost
    }));
  };

  const updateLineItemTotal = (quantity: number, unitPrice: number) => {
    setLineItemForm(prev => ({
      ...prev,
      quantity,
      unit_price: unitPrice,
      total_price: quantity * unitPrice
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!serviceCall) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Service Call Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">The service call you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Service Call - {serviceCall.ticket_number}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{serviceCall.title}</p>
        </div>
        <div className="flex space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={serviceCall.status !== 'completed'}
              >
                Generate Invoice
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Service Call Details */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Service Call Details</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Basic Information</h4>
              <div className="space-y-2">
                <p><span className="font-medium">Status:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    serviceCall.status === 'completed' ? 'bg-green-100 text-green-800' :
                    serviceCall.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    serviceCall.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {serviceCall.status.replace('_', ' ')}
                  </span>
                </p>
                <p><span className="font-medium">Priority:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    serviceCall.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    serviceCall.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    serviceCall.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {serviceCall.priority}
                  </span>
                </p>
                <p><span className="font-medium">Billing Type:</span> 
                  <span className="ml-2 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {serviceCall.billing_type === 'time_material' ? 'Time & Material' : 'Estimate'}
                  </span>
                </p>
                <p><span className="font-medium">Service Type:</span> {serviceCall.service_type || 'N/A'}</p>
                <p><span className="font-medium">Technician:</span> {serviceCall.technician_name || 'Unassigned'}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Customer Information</h4>
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {serviceCall.customer_name}</p>
                <p><span className="font-medium">Email:</span> {serviceCall.customer_email || 'N/A'}</p>
                <p><span className="font-medium">Phone:</span> {serviceCall.customer_phone || 'N/A'}</p>
                <p><span className="font-medium">Address:</span> {serviceCall.customer_address || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          {serviceCall.description && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
              <p className="text-gray-700 dark:text-gray-300">{serviceCall.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Materials Section for Time & Material */}
      {serviceCall.billing_type === 'time_material' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Materials</h3>
            <button
              onClick={() => setShowMaterialModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Material
            </button>
          </div>
          <div className="p-6">
            {materials.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No materials added yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Unit Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {materials.map((material) => (
                      <tr key={material.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {material.description}
                          {material.material_name && (
                            <div className="text-xs text-gray-500">
                              {material.material_name} ({material.part_number})
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {material.quantity} {material.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          ${material.unit_cost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          ${material.total_cost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Line Items Section for Estimate */}
      {serviceCall.billing_type === 'estimate' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Line Items</h3>
            <button
              onClick={() => setShowLineItemModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Line Item
            </button>
          </div>
          <div className="p-6">
            {lineItems.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No line items added yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          ${item.total_price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add Material</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select from Catalog (Optional)
                  </label>
                  <select
                    onChange={(e) => e.target.value ? handleMaterialSelect(parseInt(e.target.value)) : null}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Material</option>
                    {catalogMaterials.map(material => (
                      <option key={material.id} value={material.id}>
                        {material.name} - ${material.standard_cost}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={materialForm.description}
                    onChange={(e) => setMaterialForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={materialForm.quantity}
                      onChange={(e) => updateMaterialTotal(parseFloat(e.target.value) || 0, materialForm.unit_cost)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={materialForm.unit}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Unit Cost ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={materialForm.unit_cost}
                      onChange={(e) => updateMaterialTotal(materialForm.quantity, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={materialForm.total_cost}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={materialForm.notes}
                    onChange={(e) => setMaterialForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMaterial}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Material
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Line Item Modal */}
      {showLineItemModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add Line Item</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={lineItemForm.description}
                    onChange={(e) => setLineItemForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={lineItemForm.quantity}
                      onChange={(e) => updateLineItemTotal(parseFloat(e.target.value) || 0, lineItemForm.unit_price)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Unit Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={lineItemForm.unit_price}
                      onChange={(e) => updateLineItemTotal(lineItemForm.quantity, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={lineItemForm.total_price}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowLineItemModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLineItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Line Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Comments</h3>
        </div>
        <div className="p-6">
          <ServiceCallComments serviceCallId={parseInt(id!)} />
        </div>
      </div>

      {/* Generate Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Generate Invoice</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will create an invoice based on the service call details and {serviceCall.billing_type === 'time_material' ? 'materials' : 'line items'}.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateInvoice}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Generate Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCallDetail;
