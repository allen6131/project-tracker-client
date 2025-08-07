import React, { useEffect, useState } from 'react';
import { RFI, Project } from '../types';
import { rfiAPI, projectsAPI, customersAPI } from '../services/api';

const RFIs: React.FC = () => {
  const [rfis, setRFIs] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create/Edit state
  const [showForm, setShowForm] = useState(false);
  const [editingRfi, setEditingRfi] = useState<RFI | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: number; first_name: string; last_name: string; email?: string }[]>([]);
  const [formData, setFormData] = useState({
    project_id: 0,
    customer_id: 0,
    contact_id: 0,
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    response_needed_by: ''
  });

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRfi, setEmailRfi] = useState<RFI | null>(null);
  const [emailPdfUrl, setEmailPdfUrl] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await rfiAPI.getRFIs(page, 10, search, status);
        setRFIs(res.rfis);
        setTotalPages(res.pagination.totalPages || 1);
      } catch (e: any) {
        setError(e.response?.data?.message || 'Failed to load RFIs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, search, status]);

  useEffect(() => {
    const loadAux = async () => {
      try {
        const [projRes, custRes] = await Promise.all([
          projectsAPI.getProjects(1, 100, ''),
          customersAPI.getSimpleCustomers()
        ]);
        setProjects(projRes.projects.map((p: Project) => ({ id: p.id, name: p.name })));
        setCustomers(custRes.customers);
      } catch (e) {
        // ignore
      }
    };
    loadAux();
  }, []);

  const parseDateOnly = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const ymd = dateString.split('T')[0];
      const [y, m, d] = ymd.split('-').map(Number);
      const dt = y && m && d ? new Date(y, m - 1, d) : new Date(dateString);
      return dt.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const handleViewPDF = async (id: number) => {
    try {
      const url = await rfiAPI.viewRFIPDF(id);
      setViewUrl(url);
    } catch (e) {
      setError('Failed to load RFI PDF');
    }
  };

  const handleDownloadPDF = async (id: number) => {
    try {
      const blob = await rfiAPI.downloadRFIPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rfi-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess('RFI PDF downloaded successfully');
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      setError('Failed to download RFI PDF');
    }
  };

  const openCreate = () => {
    setEditingRfi(null);
    setFormData({ project_id: 0, customer_id: 0, contact_id: 0, subject: '', message: '', priority: 'medium', response_needed_by: '' });
    setContacts([]);
    setShowForm(true);
  };

  const openEdit = (rfi: RFI) => {
    setEditingRfi(rfi);
    setFormData({
      project_id: rfi.project_id,
      customer_id: rfi.customer_id,
      contact_id: rfi.contact_id,
      subject: rfi.subject,
      message: rfi.message,
      priority: rfi.priority,
      response_needed_by: rfi.response_needed_by || ''
    });
    // Load contacts for the selected customer
    if (rfi.customer_id) loadContacts(rfi.customer_id);
    setShowForm(true);
  };

  const loadContacts = async (customerId: number) => {
    try {
      const res = await customersAPI.getCustomer(customerId);
      const ct = (res.customer.contacts || []).map((c: any) => ({ id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email }));
      setContacts(ct);
    } catch {
      setContacts([]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent, sendNow = false) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      if (!formData.project_id || !formData.customer_id || !formData.contact_id || !formData.subject.trim() || !formData.message.trim()) {
        setError('Please fill in all required fields');
        return;
      }
      if (editingRfi) {
        await rfiAPI.updateRFI(editingRfi.id, {
          subject: formData.subject,
          message: formData.message,
          priority: formData.priority,
          response_needed_by: formData.response_needed_by || undefined
        });
        setSuccess('RFI updated successfully');
      } else {
        await rfiAPI.createRFI({
          project_id: formData.project_id,
          customer_id: formData.customer_id,
          contact_id: formData.contact_id,
          subject: formData.subject,
          message: formData.message,
          priority: formData.priority,
          response_needed_by: formData.response_needed_by || undefined,
          action: sendNow ? 'send' : 'draft'
        } as any);
        setSuccess(sendNow ? 'RFI sent successfully' : 'RFI saved as draft');
      }
      setShowForm(false);
      // reload list
      const res = await rfiAPI.getRFIs(page, 10, search, status);
      setRFIs(res.rfis);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save RFI');
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenEmail = async (rfi: RFI) => {
    setEmailRfi(rfi);
    setShowEmailModal(true);
    try {
      const url = await rfiAPI.viewRFIPDF(rfi.id);
      setEmailPdfUrl(url);
    } catch {
      setEmailPdfUrl(null);
    }
  };

  const handleSendEmail = async () => {
    if (!emailRfi) return;
    setEmailLoading(true);
    setError(null);
    try {
      await rfiAPI.sendRFI(emailRfi.id);
      setSuccess('RFI sent successfully');
      setShowEmailModal(false);
      setEmailRfi(null);
      setEmailPdfUrl(null);
      // refresh list
      const res = await rfiAPI.getRFIs(page, 10, search, status);
      setRFIs(res.rfis);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send RFI');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-colors">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">RFIs</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Global list of Requests for Information</p>
            </div>
            <div className="space-x-2">
              <button
                onClick={openCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Create New RFI
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search subject/message..."
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <select
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="responded">Responded</option>
            <option value="closed">Closed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* List */}
      {error && (
        <div className="mb-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="mb-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">{success}</div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
          <div className="text-center text-gray-900 dark:text-white">Loading RFIs...</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">RFI #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {rfis.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No RFIs found.</td>
                  </tr>
                ) : rfis.map((rfi) => (
                  <tr key={rfi.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">#{rfi.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{(rfi as any).project_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{rfi.customer_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{rfi.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{rfi.priority}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{parseDateOnly(rfi.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">{rfi.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button onClick={() => handleViewPDF(rfi.id)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">View PDF</button>
                      <button onClick={() => handleDownloadPDF(rfi.id)} className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">Download</button>
                      {rfi.status === 'draft' && (
                        <>
                          <button onClick={() => openEdit(rfi)} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">Edit</button>
                          <button onClick={() => handleOpenEmail(rfi)} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300">Send</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">Previous</button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">Next</button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button key={p} onClick={() => setPage(p)} className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${p === page ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-300' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{p}</button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF Modal */}
      {viewUrl && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">RFI PDF</h3>
              <button onClick={() => setViewUrl(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-white dark:bg-gray-800 h-96 flex items-center justify-center">
              <iframe src={viewUrl} className="w-full h-full border-0" title="RFI PDF Preview" />
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{editingRfi ? 'Edit RFI' : 'Create New RFI'}</h3>
              <form onSubmit={(e) => handleFormSubmit(e)} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project *</label>
                    <select
                      value={formData.project_id || ''}
                      onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? parseInt(e.target.value) : 0 })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer *</label>
                    <select
                      value={formData.customer_id || ''}
                      onChange={async (e) => {
                        const cid = e.target.value ? parseInt(e.target.value) : 0;
                        setFormData({ ...formData, customer_id: cid, contact_id: 0 });
                        if (cid) await loadContacts(cid);
                        else setContacts([]);
                      }}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select Customer</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact *</label>
                    <select
                      value={formData.contact_id || ''}
                      onChange={(e) => setFormData({ ...formData, contact_id: e.target.value ? parseInt(e.target.value) : 0 })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                      disabled={!formData.customer_id}
                    >
                      <option value="">Select Contact</option>
                      {contacts.map(ct => (
                        <option key={ct.id} value={ct.id}>{ct.first_name} {ct.last_name}{ct.email ? ` (${ct.email})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message *</label>
                  <textarea
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Response Needed By</label>
                    <input
                      type="date"
                      value={formData.response_needed_by}
                      onChange={(e) => setFormData({ ...formData, response_needed_by: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                  {!editingRfi && (
                    <button type="button" disabled={formLoading} onClick={(e) => handleFormSubmit(e as any, true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">Send Now</button>
                  )}
                  <button type="submit" disabled={formLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{formLoading ? 'Saving...' : (editingRfi ? 'Update RFI' : 'Save Draft')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal with PDF preview */}
      {showEmailModal && emailRfi && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Send RFI</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{emailRfi.subject}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Project: {(emailRfi as any).project_name || '-'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">To: {(emailRfi.first_name || '') + ' ' + (emailRfi.last_name || '')}</p>
                    {emailRfi.response_needed_by && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Response by: {parseDateOnly(emailRfi.response_needed_by)}</p>
                    )}
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <button onClick={handleSendEmail} disabled={emailLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{emailLoading ? 'Sending...' : 'Send Email'}</button>
                    <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PDF Preview</label>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden h-96 bg-white dark:bg-gray-800 flex items-center justify-center">
                    {emailPdfUrl ? (
                      <iframe src={emailPdfUrl} className="w-full h-full border-0" title="RFI PDF Preview" />
                    ) : (
                      <div className="text-gray-400 dark:text-gray-500">No preview available</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RFIs;


