import React, { useState, useEffect, useCallback } from 'react';
import { ProjectMaterial, MaterialReceipt, CreateMaterialRequest, UpdateMaterialRequest, CatalogMaterial } from '../types';
import { materialsAPI, catalogMaterialsAPI } from '../services/api';

interface MaterialCostsProps {
  projectId: number;
}

const MaterialCosts: React.FC<MaterialCostsProps> = ({ projectId }) => {
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ProjectMaterial | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<ProjectMaterial | null>(null);
  const [receipts, setReceipts] = useState<MaterialReceipt[]>([]);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Catalog selection state
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogMaterials, setCatalogMaterials] = useState<CatalogMaterial[]>([]);
  const [selectedCatalogMaterials, setSelectedCatalogMaterials] = useState<Set<number>>(new Set());
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [catalogCategories, setCatalogCategories] = useState<string[]>([]);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState('');

  const [formData, setFormData] = useState({
    description: '',
    quantity: '',
    unit_cost: '',
    supplier: '',
    purchase_date: '',
    notes: ''
  });

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await materialsAPI.getProjectMaterials(projectId);
      setMaterials(response.materials);
    } catch (err: any) {
      setError('Failed to load materials');
      console.error('Load materials error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const resetForm = () => {
    setFormData({
      description: '',
      quantity: '',
      unit_cost: '',
      supplier: '',
      purchase_date: '',
      notes: ''
    });
    setEditingMaterial(null);
    setShowAddForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim() || !formData.quantity || !formData.unit_cost) {
      setError('Description, quantity, and unit cost are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const materialData = {
        project_id: projectId,
        description: formData.description.trim(),
        quantity: parseFloat(formData.quantity),
        unit_cost: parseFloat(formData.unit_cost),
        supplier: formData.supplier.trim() || undefined,
        purchase_date: formData.purchase_date || undefined,
        notes: formData.notes.trim() || undefined
      };

      if (editingMaterial) {
        await materialsAPI.updateMaterial(editingMaterial.id, materialData);
        setSuccess('Material updated successfully');
      } else {
        await materialsAPI.createMaterial(materialData);
        setSuccess('Material added successfully');
      }

      resetForm();
      loadMaterials();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save material');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (material: ProjectMaterial) => {
    console.log('Edit clicked for material:', material);
    setFormData({
      description: material.description,
      quantity: material.quantity.toString(),
      unit_cost: material.unit_cost.toString(),
      supplier: material.supplier || '',
      purchase_date: formatDateForInput(material.purchase_date || ''),
      notes: material.notes || ''
    });
    setEditingMaterial(material);
    setShowAddForm(true);
    console.log('Form should now be visible. showAddForm:', true, 'editingMaterial:', material);
  };

  const handleDelete = async (materialId: number) => {
    if (!window.confirm('Are you sure you want to delete this material entry? This will also delete all associated receipts.')) {
      return;
    }

    try {
      setLoading(true);
      await materialsAPI.deleteMaterial(materialId);
      setSuccess('Material deleted successfully');
      loadMaterials();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete material');
    } finally {
      setLoading(false);
    }
  };

  // Catalog material functions
  const loadCatalogMaterials = async () => {
    try {
      setCatalogLoading(true);
      const [materialsResponse, categoriesResponse] = await Promise.all([
        catalogMaterialsAPI.getCatalogMaterials(1, 100, catalogSearchTerm, selectedCatalogCategory),
        catalogMaterialsAPI.getCategories()
      ]);
      setCatalogMaterials(materialsResponse.materials);
      setCatalogCategories(categoriesResponse.categories);
    } catch (err: any) {
      setError('Failed to load catalog materials');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleOpenCatalogModal = () => {
    setShowCatalogModal(true);
    setSelectedCatalogMaterials(new Set());
    loadCatalogMaterials();
  };

  const handleCatalogSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCatalogMaterials();
  };

  const handleToggleCatalogMaterial = (materialId: number) => {
    const newSelected = new Set(selectedCatalogMaterials);
    if (newSelected.has(materialId)) {
      newSelected.delete(materialId);
    } else {
      newSelected.add(materialId);
    }
    setSelectedCatalogMaterials(newSelected);
  };

  const handleBulkAddFromCatalog = async () => {
    if (selectedCatalogMaterials.size === 0) {
      setError('Please select at least one material to add');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const selectedMats = catalogMaterials.filter(m => selectedCatalogMaterials.has(m.id));
      
      // Add each selected material to the project
      for (const catalogMaterial of selectedMats) {
        const materialData = {
          project_id: projectId,
          description: catalogMaterial.name + (catalogMaterial.description ? ` - ${catalogMaterial.description}` : ''),
          quantity: 1, // Default quantity
          unit_cost: catalogMaterial.standard_cost,
          supplier: catalogMaterial.supplier || undefined,
          notes: catalogMaterial.part_number ? `Part #: ${catalogMaterial.part_number}` : undefined
        };

        await materialsAPI.createMaterial(materialData);
      }

      setSuccess(`Added ${selectedMats.length} material(s) from catalog`);
      setShowCatalogModal(false);
      setSelectedCatalogMaterials(new Set());
      loadMaterials();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add materials from catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipts = async (material: ProjectMaterial) => {
    try {
      setSelectedMaterial(material);
      const response = await materialsAPI.getMaterialReceipts(material.id);
      setReceipts(response.receipts);
      setShowReceiptsModal(true);
    } catch (err: any) {
      setError('Failed to load receipts');
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedMaterial) return;

    const file = e.target.files[0];
    
    try {
      setUploadingReceipt(true);
      await materialsAPI.uploadReceipt(selectedMaterial.id, file);
      setSuccess('Receipt uploaded successfully');
      
      // Refresh receipts
      const response = await materialsAPI.getMaterialReceipts(selectedMaterial.id);
      setReceipts(response.receipts);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleDownloadReceipt = async (receipt: MaterialReceipt) => {
    try {
      const blob = await materialsAPI.downloadReceipt(receipt.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = receipt.original_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download receipt');
    }
  };

  const handleDeleteReceipt = async (receiptId: number) => {
    if (!window.confirm('Are you sure you want to delete this receipt?')) return;

    try {
      await materialsAPI.deleteReceipt(receiptId);
      setSuccess('Receipt deleted successfully');
      
      // Refresh receipts
      if (selectedMaterial) {
        const response = await materialsAPI.getMaterialReceipts(selectedMaterial.id);
        setReceipts(response.receipts);
      }
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to delete receipt');
    }
  };

  const formatCurrency = (amount: number | string) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numericAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format date for form input (extracts YYYY-MM-DD without timezone conversion)
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    // Extract just the date part to avoid timezone shifts
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTotalCost = () => {
    return materials.reduce((total, material) => {
      const cost = typeof material.total_cost === 'string' ? parseFloat(material.total_cost) || 0 : material.total_cost || 0;
      return total + cost;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Material Costs</h3>
          <p className="text-sm text-gray-500">Track material costs and upload receipts for this project</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleOpenCatalogModal}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Add from Catalog</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Material</span>
          </button>
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

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingMaterial ? 'Edit Material' : 'Add New Material'}
            {/* Debug info */}
            <span className="text-xs text-gray-500 ml-2">
              (Debug: showAddForm={showAddForm.toString()}, editingMaterial={editingMaterial?.id || 'null'})
            </span>
          </h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter material description"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Cost *
                </label>
                <input
                  type="number"
                  name="unit_cost"
                  value={formData.unit_cost}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter supplier name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes about this material"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (editingMaterial ? 'Update Material' : 'Add Material')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Materials List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading && materials.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No materials added yet. Click "Add Material" to get started.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipts
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {materials.map((material) => (
                    <tr key={material.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {material.description}
                          </div>
                          {material.purchase_date && (
                            <div className="text-sm text-gray-500">
                              Purchased: {formatDate(material.purchase_date)}
                            </div>
                          )}
                          {material.notes && (
                            <div className="text-xs text-gray-500 mt-1">
                              {material.notes.length > 50 
                                ? `${material.notes.substring(0, 50)}...` 
                                : material.notes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {material.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(material.unit_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(material.total_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {material.supplier || (
                          <span className="text-gray-400 italic">No supplier</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleViewReceipts(material)}
                          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>
                            {material.receipt_count ? `${material.receipt_count} receipts` : 'Add receipt'}
                          </span>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Edit button clicked!');
                              handleEdit(material);
                            }}
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 border border-blue-600 rounded hover:bg-blue-50"
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(material.id);
                            }}
                            className="text-red-600 hover:text-red-900 px-2 py-1 border border-red-600 rounded hover:bg-red-50"
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Total Summary */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Total Materials Cost ({materials.length} items)
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(getTotalCost())}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Receipts Modal */}
      {showReceiptsModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Receipts for: {selectedMaterial.description}
              </h3>
              <button
                onClick={() => setShowReceiptsModal(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Upload Receipt */}
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Upload New Receipt</h4>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptUpload}
                  disabled={uploadingReceipt}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: Images (PNG, JPG, etc.) and PDF files (max 10MB)
                </p>
                {uploadingReceipt && (
                  <div className="mt-2 text-sm text-blue-600">Uploading...</div>
                )}
              </div>

              {/* Receipts List */}
              {receipts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No receipts uploaded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">
                          {receipt.file_type.includes('pdf') ? '📄' : '🖼️'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {receipt.original_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Uploaded {formatDate(receipt.created_at)}
                            {receipt.uploaded_by_username && ` by ${receipt.uploaded_by_username}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDownloadReceipt(receipt)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Download"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteReceipt(receipt.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Catalog Selection Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Materials from Catalog</h2>
              <p className="text-sm text-gray-500 mt-1">Select materials from the global catalog to add to this project</p>
            </div>

            {/* Search and Filter */}
            <div className="p-6 border-b border-gray-200">
              <form onSubmit={handleCatalogSearch} className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={catalogSearchTerm}
                    onChange={(e) => setCatalogSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="min-w-48">
                  <select
                    value={selectedCatalogCategory}
                    onChange={(e) => setSelectedCatalogCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {catalogCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Materials List */}
            <div className="max-h-96 overflow-y-auto">
              {catalogLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-600">Loading catalog materials...</div>
                </div>
              ) : catalogMaterials.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">No materials found</div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {catalogMaterials.map((material) => (
                    <div key={material.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedCatalogMaterials.has(material.id)}
                          onChange={() => handleToggleCatalogMaterial(material.id)}
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{material.name}</h4>
                              {material.description && (
                                <p className="text-sm text-gray-500">{material.description}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                {material.category && (
                                  <span className="bg-gray-100 px-2 py-1 rounded">
                                    {material.category}
                                  </span>
                                )}
                                <span>Unit: {material.unit}</span>
                                {material.part_number && (
                                  <span>Part #: {material.part_number}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(material.standard_cost)}
                              </div>
                              {material.supplier && (
                                <div className="text-xs text-gray-500">{material.supplier}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {selectedCatalogMaterials.size} material(s) selected
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCatalogModal(false);
                    setSelectedCatalogMaterials(new Set());
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAddFromCatalog}
                  disabled={selectedCatalogMaterials.size === 0 || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : `Add ${selectedCatalogMaterials.size} Material(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialCosts; 