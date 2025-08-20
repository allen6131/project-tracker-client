import React, { useState, useEffect } from 'react';
import { CatalogMaterial, CreateCatalogMaterialRequest, UpdateCatalogMaterialRequest } from '../types';
import { catalogMaterialsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MaterialsCatalog: React.FC = () => {
  const { isAdmin } = useAuth();
  const [materials, setMaterials] = useState<CatalogMaterial[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minCost, setMinCost] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [partNumberFilter, setPartNumberFilter] = useState('');
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  
  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  
  // Modal and form states
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<CatalogMaterial | null>(null);
  const [formData, setFormData] = useState<CreateCatalogMaterialRequest>({
    name: '',
    description: '',
    category: '',
    unit: 'each',
    standard_cost: 0,
    supplier: '',
    part_number: '',
    notes: ''
  });

  useEffect(() => {
    loadMaterials();
    loadCategories();
    loadSuppliers();
    loadUnits();
  }, [currentPage, searchTerm, selectedCategory, minCost, maxCost, supplierFilter, unitFilter, partNumberFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const toggleDropdown = (materialId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDropdown(openDropdown === materialId ? null : materialId);
  };

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const response = await catalogMaterialsAPI.getCatalogMaterials(currentPage, 20, searchTerm, selectedCategory);
      
      // Apply client-side filters for additional filtering
      let filteredMaterials = response.materials;
      
      if (minCost) {
        filteredMaterials = filteredMaterials.filter(m => m.standard_cost >= parseFloat(minCost));
      }
      if (maxCost) {
        filteredMaterials = filteredMaterials.filter(m => m.standard_cost <= parseFloat(maxCost));
      }
      if (supplierFilter) {
        filteredMaterials = filteredMaterials.filter(m => 
          m.supplier && m.supplier.toLowerCase().includes(supplierFilter.toLowerCase())
        );
      }
      if (unitFilter) {
        filteredMaterials = filteredMaterials.filter(m => m.unit === unitFilter);
      }
      if (partNumberFilter) {
        filteredMaterials = filteredMaterials.filter(m => 
          m.part_number && m.part_number.toLowerCase().includes(partNumberFilter.toLowerCase())
        );
      }
      
      setMaterials(filteredMaterials);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await catalogMaterialsAPI.getCategories();
      setCategories(response.categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadSuppliers = async () => {
    try {
      // Extract unique suppliers from all materials
      const response = await catalogMaterialsAPI.getCatalogMaterials(1, 1000, '', '');
      const suppliers = response.materials
        .map(m => m.supplier)
        .filter((s): s is string => Boolean(s && s.trim()));
      const uniqueSuppliers = Array.from(new Set(suppliers)).sort();
      setSuppliers(uniqueSuppliers);
    } catch (err: any) {
      console.error('Load suppliers error:', err);
    }
  };

  const loadUnits = async () => {
    try {
      // Extract unique units from all materials
      const response = await catalogMaterialsAPI.getCatalogMaterials(1, 1000, '', '');
      const units = response.materials
        .map(m => m.unit)
        .filter((u): u is string => Boolean(u && u.trim()));
      const uniqueUnits = Array.from(new Set(units)).sort();
      setUnits(uniqueUnits);
    } catch (err: any) {
      console.error('Load units error:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadMaterials();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setMinCost('');
    setMaxCost('');
    setSupplierFilter('');
    setUnitFilter('');
    setPartNumberFilter('');
    setCurrentPage(1);
    loadMaterials();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      unit: 'each',
      standard_cost: 0,
      supplier: '',
      part_number: '',
      notes: ''
    });
  };

  const openCreateForm = () => {
    resetForm();
    setEditingMaterial(null);
    setShowForm(true);
  };

  const openEditForm = (material: CatalogMaterial) => {
    setFormData({
      name: material.name,
      description: material.description || '',
      category: material.category || '',
      unit: material.unit,
      standard_cost: material.standard_cost,
      supplier: material.supplier || '',
      part_number: material.part_number || '',
      notes: material.notes || ''
    });
    setEditingMaterial(material);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      clearMessages();
      if (editingMaterial) {
        await catalogMaterialsAPI.updateCatalogMaterial(editingMaterial.id, formData as UpdateCatalogMaterialRequest);
        setSuccess('Material updated successfully');
      } else {
        await catalogMaterialsAPI.createCatalogMaterial(formData);
        setSuccess('Material created successfully');
      }
      setShowForm(false);
      resetForm();
      setEditingMaterial(null);
      loadMaterials();
      loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save material');
    }
  };

  const handleDelete = async (materialId: number) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    
    try {
      clearMessages();
      await catalogMaterialsAPI.deleteCatalogMaterial(materialId);
      setSuccess('Material deleted successfully');
      loadMaterials();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete material');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Materials Catalog</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage your global materials catalog for quick project material selection
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={openCreateForm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Material</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearMessages} className="text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={clearMessages} className="text-green-500 hover:text-green-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Enhanced Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Primary filters row */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary filters row */}
          <div className="flex flex-wrap gap-4">
            <div className="min-w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Cost</label>
              <input
                type="number"
                placeholder="0.00"
                value={minCost}
                onChange={(e) => setMinCost(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="min-w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Cost</label>
              <input
                type="number"
                placeholder="999.99"
                value={maxCost}
                onChange={(e) => setMaxCost(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="min-w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Units</option>
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
              <input
                type="text"
                placeholder="Search part numbers..."
                value={partNumberFilter}
                onChange={(e) => setPartNumberFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Clear</span>
            </button>
          </div>
        </form>
      </div>

      {/* Materials Table */}
      {loading && materials.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading materials...</div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Number
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {materials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{material.name}</div>
                        <div className="text-sm text-gray-500">{material.description}</div>
                        <div className="text-xs text-gray-400">Unit: {material.unit}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{material.category || 'Uncategorized'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(material.standard_cost)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{material.supplier || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{material.part_number || 'N/A'}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative flex justify-end">
                          <button
                            onClick={(e) => toggleDropdown(material.id, e)}
                            className="inline-flex items-center justify-center w-8 h-8 text-gray-400 bg-transparent border-0 rounded-full hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                          >
                            <span className="sr-only">Open options</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>

                          {openDropdown === material.id && (
                            <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                              <button
                                onClick={() => {
                                  openEditForm(material);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Material
                              </button>

                              <div className="border-t border-gray-100 my-1"></div>
                              
                              <button
                                onClick={() => {
                                  handleDelete(material.id);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Material
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {/* Add empty rows when there are fewer than 5 materials to ensure dropdown has space */}
                {materials.length > 0 && materials.length < 5 && Array.from({ length: 5 - materials.length }).map((_, index) => (
                  <tr key={`empty-material-${index}`} className="pointer-events-none">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-transparent">.</div>
                        <div className="text-sm text-transparent">.</div>
                        <div className="text-xs text-transparent">.</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-transparent">.</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-transparent">.</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-transparent">.</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-transparent">.</span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-transparent">.</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}

          {materials.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No materials</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new material.</p>
              {isAdmin && (
                <div className="mt-6">
                  <button
                    onClick={openCreateForm}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Material
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Material Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingMaterial ? 'Edit Material' : 'Create New Material'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Material Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="each, ft, sq ft, etc."
                  />
                </div>

                <div>
                  <label htmlFor="standard_cost" className="block text-sm font-medium text-gray-700 mb-1">
                    Standard Cost
                  </label>
                  <input
                    type="number"
                    id="standard_cost"
                    step="0.01"
                    min="0"
                    value={formData.standard_cost}
                    onChange={(e) => setFormData({ ...formData, standard_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <input
                    type="text"
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="part_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Part Number
                  </label>
                  <input
                    type="text"
                    id="part_number"
                    value={formData.part_number}
                    onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingMaterial(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingMaterial ? 'Update Material' : 'Create Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsCatalog; 