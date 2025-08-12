import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { companyProfileAPI } from '../services/api';
import { CompanyProfile as CompanyProfileType } from '../types';

const CompanyProfile: React.FC = () => {
  const { isAdmin } = useAuth();
  const [profile, setProfile] = useState<CompanyProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    company_name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    tax_id: '',
    footer_text: ''
  });

  // Custom statuses state
  const [customStatuses, setCustomStatuses] = useState<string[]>(['bidding', 'started', 'active', 'done']);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await companyProfileAPI.getProfile();
      const profileData = response.profile;
      setProfile(profileData);
      
      // Update form data
      setFormData({
        company_name: profileData.company_name || '',
        address: profileData.address || '',
        city: profileData.city || '',
        state: profileData.state || '',
        postal_code: profileData.postal_code || '',
        country: profileData.country || '',
        phone: profileData.phone || '',
        email: profileData.email || '',
        website: profileData.website || '',
        tax_id: profileData.tax_id || '',
        footer_text: profileData.footer_text || ''
      });
      
      // Set logo preview if exists
      if (profileData.logo_url) {
        const apiBase = (process.env.REACT_APP_API_URL || 'https://project-tracker-server-f1d3541c891e.herokuapp.com/api');
        const serverOrigin = apiBase.replace(/\/api$/, '');
        const url = profileData.logo_url.startsWith('http') ? profileData.logo_url : `${serverOrigin}${profileData.logo_url}`;
        setLogoPreview(url);
      }
      
      // Set custom statuses if they exist
      if (profileData.custom_statuses && profileData.custom_statuses.length > 0) {
        setCustomStatuses(profileData.custom_statuses);
      }
    } catch (err: any) {
      // If profile doesn't exist, use default values
      if (err.response?.status === 404) {
        setFormData(prev => ({ ...prev, company_name: 'AmpTrack' }));
      } else {
        setError(err.response?.data?.message || 'Failed to load company profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddStatus = () => {
    const trimmedStatus = newStatus.trim();
    
    if (!trimmedStatus) {
      setError('Status name cannot be empty');
      return;
    }
    
    if (trimmedStatus.length > 50) {
      setError('Status name must be 50 characters or less');
      return;
    }
    
    // Check for duplicates (case-insensitive)
    if (customStatuses.some(status => status.toLowerCase() === trimmedStatus.toLowerCase())) {
      setError('This status already exists');
      return;
    }
    
    setCustomStatuses(prev => [...prev, trimmedStatus]);
    setNewStatus('');
    setError(null);
  };

  const handleRemoveStatus = (indexToRemove: number) => {
    if (customStatuses.length <= 1) {
      setError('At least one status is required');
      return;
    }
    
    setCustomStatuses(prev => prev.filter((_, index) => index !== indexToRemove));
    setError(null);
  };

  const handleStatusKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddStatus();
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = async () => {
    if (window.confirm('Are you sure you want to remove the company logo?')) {
      try {
        await companyProfileAPI.deleteLogo();
        setLogoFile(null);
        setLogoPreview(null);
        setSuccess('Logo removed successfully');
        setTimeout(() => setSuccess(null), 3000);
        loadProfile();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to remove logo');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      setError('Only administrators can update company profile');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const data = new FormData();
      
      // Append form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          data.append(key, value);
        }
      });
      
      // Append logo if selected
      if (logoFile) {
        data.append('logo', logoFile);
      }
      
      // Append custom statuses
      data.append('custom_statuses', JSON.stringify(customStatuses));
      
      const response = await companyProfileAPI.updateProfile(data);
      setProfile(response.profile);
      setSuccess('Company profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      
      // Reset logo file after successful upload
      setLogoFile(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update company profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">Loading company profile...</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Company Profile
        </h3>
        
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Logo
            </label>
            <div className="flex items-center space-x-4">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Company Logo"
                    className="h-20 w-auto max-w-xs object-contain border border-gray-300 rounded p-2"
                  />
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {isAdmin && (
                <div>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB. You can crop after selecting.</p>
                  {/* Simple cropping tool */}
                  {logoFile && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quick Crop</label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Center-crop to square via canvas
                            const img = new Image();
                            img.onload = () => {
                              const size = Math.min(img.width, img.height);
                              const sx = (img.width - size) / 2;
                              const sy = (img.height - size) / 2;
                              const canvas = document.createElement('canvas');
                              canvas.width = 512; canvas.height = 512;
                              const ctx = canvas.getContext('2d');
                              if (!ctx) return;
                              ctx.drawImage(img, sx, sy, size, size, 0, 0, 512, 512);
                              canvas.toBlob((blob) => {
                                if (blob) {
                                  const cropped = new File([blob], logoFile.name.replace(/\.[^.]+$/, '') + '-cropped.png', { type: 'image/png' });
                                  setLogoFile(cropped);
                                  const reader = new FileReader();
                                  reader.onloadend = () => setLogoPreview(reader.result as string);
                                  reader.readAsDataURL(cropped);
                                }
                              }, 'image/png');
                            };
                            img.src = URL.createObjectURL(logoFile);
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Center Crop to Square
                        </button>
                        <button
                          type="button"
                          onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                          className="px-3 py-1 text-sm bg-gray-100 border rounded hover:bg-gray-200"
                        >
                          Reset Selection
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Crop helps ensure the logo fits nicely in the UI and PDFs.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Company Name */}
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
              Company Name *
            </label>
            <input
              type="text"
              name="company_name"
              id="company_name"
              required
              disabled={!isAdmin}
              value={formData.company_name}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
          
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                disabled={!isAdmin}
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                disabled={!isAdmin}
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>
          
          {/* Website and Tax ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                type="url"
                name="website"
                id="website"
                disabled={!isAdmin}
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
            
            <div>
              <label htmlFor="tax_id" className="block text-sm font-medium text-gray-700">
                Tax ID
              </label>
              <input
                type="text"
                name="tax_id"
                id="tax_id"
                disabled={!isAdmin}
                value={formData.tax_id}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>
          
          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <input
              type="text"
              name="address"
              id="address"
              disabled={!isAdmin}
              value={formData.address}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
          
          {/* City, State, Postal Code, Country */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                name="city"
                id="city"
                disabled={!isAdmin}
                value={formData.city}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
            
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                State/Province
              </label>
              <input
                type="text"
                name="state"
                id="state"
                disabled={!isAdmin}
                value={formData.state}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
            
            <div>
              <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                Postal Code
              </label>
              <input
                type="text"
                name="postal_code"
                id="postal_code"
                disabled={!isAdmin}
                value={formData.postal_code}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
            
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <input
                type="text"
                name="country"
                id="country"
                disabled={!isAdmin}
                value={formData.country}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>
          
          {/* Footer Text */}
          <div>
            <label htmlFor="footer_text" className="block text-sm font-medium text-gray-700">
              PDF Footer Text
            </label>
            <textarea
              name="footer_text"
              id="footer_text"
              rows={3}
              disabled={!isAdmin}
              value={formData.footer_text}
              onChange={handleInputChange}
              placeholder="Thank you for your business!"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
            <p className="mt-1 text-sm text-gray-500">This text will appear at the bottom of all PDFs (invoices, estimates, etc.)</p>
          </div>
          
          {/* Custom Project Statuses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Custom Project Statuses
            </label>
            
            <div className="space-y-4">
              {/* Current Statuses */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Current statuses (used in project creation and management):
                </p>
                <div className="flex flex-wrap gap-2">
                  {customStatuses.map((status, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{status}</span>
                      {isAdmin && customStatuses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStatus(index)}
                          className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 focus:outline-none"
                          title="Remove status"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Add New Status */}
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      onKeyPress={handleStatusKeyPress}
                      placeholder="Enter new status name"
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      maxLength={50}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStatus}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Status
                  </button>
                </div>
              )}
              
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  These custom statuses will be available when creating or editing projects. 
                  You can add, remove, or modify them to match your company's workflow.
                </p>
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Company Profile'}
              </button>
            </div>
          )}
          
          {!isAdmin && (
            <div className="text-sm text-gray-500 text-center">
              Only administrators can edit the company profile.
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CompanyProfile; 