import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, TodoList as TodoListType, Invoice, Estimate, Customer, CreateEstimateRequest } from '../types';
import { projectsAPI, todoAPI, invoicesAPI, estimatesAPI, customersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TodoList from '../components/TodoList';
import MaterialCosts from '../components/MaterialCosts';
import CustomerInfo from '../components/CustomerInfo';
import RFIForm from '../components/RFIForm';
import ChangeOrdersManagement from '../components/ChangeOrdersManagement';

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [project, setProject] = useState<Project | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [todoLists, setTodoLists] = useState<TodoListType[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [newListName, setNewListName] = useState('');
    const [activeTab, setActiveTab] = useState<'todos' | 'materials' | 'customer' | 'rfi' | 'invoices' | 'estimates' | 'change-orders'>('todos');

    // Estimate form state
    const [showEstimateForm, setShowEstimateForm] = useState(false);
    const [estimateFormLoading, setEstimateFormLoading] = useState(false);
    const [estimateFormData, setEstimateFormData] = useState({
        title: '',
        description: '',
        total_amount: 0,
        notes: ''
    });
    const [selectedDocument, setSelectedDocument] = useState<File | null>(null);

    useEffect(() => {
        const fetchProjectDetails = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const projectResponse = await projectsAPI.getProject(parseInt(id));
                setProject(projectResponse.project);

                const todoResponse = await todoAPI.getTodoLists(parseInt(id));
                setTodoLists(todoResponse);

                // Fetch invoices for this project
                const invoicesResponse = await invoicesAPI.getProjectInvoices(parseInt(id));
                setInvoices(invoicesResponse.invoices);

                // Fetch customer data if exists
                if (projectResponse.project.customer_id) {
                    try {
                        const customerResponse = await customersAPI.getCustomer(projectResponse.project.customer_id);
                        setCustomer(customerResponse.customer);
                    } catch (customerErr) {
                        console.warn('Failed to fetch customer data:', customerErr);
                    }
                }

                // Fetch estimates for this project
                try {
                    const estimatesResponse = await estimatesAPI.getProjectEstimates(parseInt(id!));
                    setEstimates(estimatesResponse.estimates);
                } catch (estimatesErr) {
                    console.warn('Failed to fetch project estimates:', estimatesErr);
                }

            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load project details');
            } finally {
                setLoading(false);
            }
        };

        fetchProjectDetails();
    }, [id]);

    const handleAddList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim() || !id) return;

        try {
            const newList = await todoAPI.createTodoList(parseInt(id), newListName.trim());
            setTodoLists(prev => [...prev, newList]);
            setNewListName('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create list');
        }
    };

    const handleListUpdate = (updatedList: TodoListType) => {
        setTodoLists(prev => prev.map(list => list.id === updatedList.id ? updatedList : list));
    };

    const handleListDelete = async (listId: number) => {
        try {
            await todoAPI.deleteTodoList(listId);
            setTodoLists(prev => prev.filter(list => list.id !== listId));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete list');
        }
    };

    const handleManageFiles = () => {
        navigate(`/projects/${id}/files`);
    };

    const handleCreateInvoice = async () => {
        if (!project || !id) return;
        
        const projectName = prompt(`Enter invoice title for project "${project.name}":`, `Invoice for ${project.name}`);
        if (!projectName) return;

        try {
            const invoiceData = {
                title: projectName,
                description: `Invoice for project: ${project.name}`,
                project_id: parseInt(id),
                customer_id: null,
                customer_name: '',
                customer_email: '',
                customer_phone: '',
                customer_address: '',
                items: [{
                    description: `Work on project: ${project.name}`,
                    quantity: 1,
                    unit_price: 0
                }],
                tax_rate: 0,
                due_date: '',
                notes: '',
                status: 'draft' as const
            };

            await invoicesAPI.createInvoice(invoiceData);
            setSuccess('Invoice created successfully! You can now edit it in the Invoices section.');
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create invoice');
            setTimeout(() => setError(null), 5000);
        }
    };

    // Estimate form handlers
    const handleCreateEstimate = () => {
        if (!project) return;
        
        setError(null);
        setSuccess(null);
        setEstimateFormData({
            title: `Estimate for ${project.name}`,
            description: '',
            total_amount: 0,
            notes: ''
        });
        setSelectedDocument(null);
        setShowEstimateForm(true);
    };

    const handleEstimateFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !id) return;

        if (!selectedDocument) {
            setError('Please select a document to upload');
            return;
        }

        if (estimateFormData.total_amount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setEstimateFormLoading(true);
        try {
            const createData: CreateEstimateRequest = {
                title: estimateFormData.title,
                description: estimateFormData.description,
                project_id: parseInt(id),
                total_amount: estimateFormData.total_amount,
                notes: estimateFormData.notes
            };

            await estimatesAPI.createEstimate(createData, selectedDocument);
            setSuccess('Estimate created successfully!');
            
            // Refresh estimates list
            const estimatesResponse = await estimatesAPI.getProjectEstimates(parseInt(id));
            setEstimates(estimatesResponse.estimates);
            
            // Reset form and close modal
            setShowEstimateForm(false);
            setEstimateFormData({
                title: '',
                description: '',
                total_amount: 0,
                notes: ''
            });
            setSelectedDocument(null);
            
            // Clear success message after 5 seconds
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create estimate');
            setTimeout(() => setError(null), 5000);
        } finally {
            setEstimateFormLoading(false);
        }
    };

    const handleEstimateFormCancel = () => {
        setShowEstimateForm(false);
        setEstimateFormData({
            title: '',
            description: '',
            total_amount: 0,
            notes: ''
        });
        setSelectedDocument(null);
        setError(null);
        setSuccess(null);
    };

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedDocument(e.target.files[0]);
        }
    };

    const handleDownloadEstimate = async (estimateId: number) => {
        try {
            const blob = await estimatesAPI.downloadEstimate(estimateId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `estimate-${estimateId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to download estimate');
        }
    };

    if (loading) {
        return <div className="p-8">Loading project details...</div>;
    }

    if (error) {
        return <div className="p-8 text-red-500">Error: {error}</div>;
    }

    if (!project) {
        return <div className="p-8">Project not found.</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-4">
                <Link to="/dashboard" className="text-blue-600 hover:underline">&larr; Back to Dashboard</Link>
            </div>

            {/* Messages */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
                    <p className="text-gray-600 mb-4">{project.description}</p>
                    
                    {/* Project Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="font-medium text-gray-700">Status:</span>
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                project.status === 'bidding' ? 'bg-yellow-100 text-yellow-800' :
                                project.status === 'started' ? 'bg-blue-100 text-blue-800' :
                                project.status === 'active' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                            </span>
                        </div>
                        
                        <div>
                            <span className="font-medium text-gray-700">Customer:</span>
                            <span className="ml-2 text-gray-900">
                                {project.customer_name || 'No customer assigned'}
                            </span>
                        </div>
                        
                        <div>
                            <span className="font-medium text-gray-700">Main Technician:</span>
                            <div className="ml-2">
                                {project.main_technician_username ? (
                                    <div>
                                        <div className="text-gray-900 font-medium">{project.main_technician_username}</div>
                                        {project.main_technician_email && (
                                            <div className="text-gray-500 text-xs">{project.main_technician_email}</div>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-gray-500 italic">No technician assigned</span>
                                )}
                            </div>
                        </div>
                        
                        {/* Second row for address and permit number */}
                        <div>
                            <span className="font-medium text-gray-700">Address:</span>
                            <div className="ml-2 text-gray-900">
                                {project.address ? (
                                    <span className="inline-flex items-start">
                                        <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="break-words">{project.address}</span>
                                    </span>
                                ) : (
                                    <span className="text-gray-500 italic">No address specified</span>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <span className="font-medium text-gray-700">Master Permit:</span>
                            <div className="ml-2 text-gray-900">
                                {project.master_permit_number ? (
                                    <span className="inline-flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="font-mono">{project.master_permit_number}</span>
                                    </span>
                                ) : (
                                    <span className="text-gray-500 italic">No master permit</span>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <span className="font-medium text-gray-700">Electrical Sub Permit:</span>
                            <div className="ml-2 text-gray-900">
                                {project.electrical_sub_permit ? (
                                    <span className="inline-flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="font-mono">{project.electrical_sub_permit}</span>
                                    </span>
                                ) : (
                                    <span className="text-gray-500 italic">No electrical sub permit</span>
                                )}
                            </div>
                        </div>
                        
                        {/* Empty cell to maintain grid alignment */}
                        <div></div>
                        
                        {/* Third row - empty cells for proper alignment */}
                        <div></div>
                        <div></div>
                    </div>
                </div>
                <div className="flex space-x-3">
                    {isAdmin && (
                        <button 
                            onClick={handleCreateInvoice}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span>Create Invoice</span>
                        </button>
                    )}
                    <button 
                        onClick={handleManageFiles}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Manage Files</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="mt-8">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('todos')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'todos'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Todo Lists
                        </button>
                        <button
                            onClick={() => setActiveTab('materials')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'materials'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Material Costs
                        </button>
                        <button
                            onClick={() => setActiveTab('customer')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'customer'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Customer Info
                        </button>
                        <button
                            onClick={() => setActiveTab('rfi')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'rfi'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            RFI Emails
                        </button>
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'invoices'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Invoices
                        </button>
                        <button
                            onClick={() => setActiveTab('estimates')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'estimates'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Estimates
                        </button>
                        <button
                            onClick={() => setActiveTab('change-orders')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'change-orders'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Change Orders
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                    {activeTab === 'todos' ? (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Todo Lists</h2>
                            </div>
                            
                            {/* Add new list form */}
                            <form onSubmit={handleAddList} className="mb-6 flex gap-2">
                                <input
                                    type="text"
                                    value={newListName}
                                    onChange={e => setNewListName(e.target.value)}
                                    placeholder="New list title"
                                    className="border rounded px-2 py-1 flex-grow"
                                />
                                <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">Add List</button>
                            </form>

                            {/* Container for Todo Lists */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {todoLists.map(list => (
                                    <TodoList 
                                        key={list.id} 
                                        list={list}
                                        onListUpdate={handleListUpdate}
                                        onListDelete={handleListDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : activeTab === 'materials' ? (
                        <MaterialCosts projectId={parseInt(id || '0')} />
                    ) : activeTab === 'customer' ? (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Customer Information</h2>
                            </div>
                            <CustomerInfo customerId={project.customer_id || null} customerName={project.customer_name} />
                        </div>
                    ) : activeTab === 'rfi' ? (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">RFI Emails</h2>
                                <span className="text-sm text-gray-600">Send Request for Information emails to customer contacts</span>
                            </div>
                            <RFIForm 
                                projectId={parseInt(id || '0')} 
                                project={project}
                                onSuccess={setSuccess}
                                onError={setError}
                            />
                        </div>
                    ) : activeTab === 'invoices' ? (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Project Invoices</h2>
                                <span className="text-sm text-gray-600">{invoices.length} invoice(s) for this project</span>
                            </div>
                            
                            {invoices.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-gray-500">
                                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-lg">No invoices found for this project</p>
                                        <p className="text-sm mt-2">Invoices created for this project will appear here</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white shadow rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Invoice
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Customer
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Amount
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Created
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {invoices.map((invoice) => (
                                                <tr key={invoice.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                                                        <div className="text-sm text-gray-500">{invoice.title}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{invoice.customer_name || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            ${invoice.total_amount.toFixed(2)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                            invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(invoice.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'estimates' ? (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Project Estimates</h2>
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-gray-600">{estimates.length} estimate(s) for this project</span>
                                    {isAdmin && (
                                        <button
                                            onClick={handleCreateEstimate}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span>Create Estimate</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {estimates.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-gray-500">
                                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-lg">No estimates found for this project</p>
                                        <p className="text-sm mt-2">Project estimates will appear here once created</p>
                                        {isAdmin && (
                                            <button
                                                onClick={handleCreateEstimate}
                                                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                            >
                                                Create First Estimate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white shadow rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Estimate
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Customer
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Amount
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Document
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {estimates.map((estimate) => (
                                                <tr key={estimate.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{estimate.title}</div>
                                                        <div className="text-sm text-gray-500">{estimate.description}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{estimate.customer_name || project.customer_name || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            ${estimate.total_amount.toFixed(2)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            estimate.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                            estimate.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                                            estimate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {estimate.document_path ? 'Document attached' : 'No document'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                        {estimate.document_path && (
                                                            <button
                                                                onClick={() => handleDownloadEstimate(estimate.id)}
                                                                className="text-green-600 hover:text-green-900"
                                                                title="Download estimate document"
                                                            >
                                                                Download
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => navigate(`/estimates/${estimate.id}`)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'change-orders' ? (
                        <div>
                            <ChangeOrdersManagement 
                                projectId={parseInt(id || '0')}
                                projectName={project.name}
                                customerInfo={customer ? {
                                    id: customer.id,
                                    name: customer.name,
                                    email: customer.email || '',
                                    phone: customer.phone || '',
                                    address: customer.address || project.address || ''
                                } : project.customer_id ? {
                                    id: project.customer_id,
                                    name: project.customer_name || '',
                                    email: '',
                                    phone: '',
                                    address: project.address || ''
                                } : undefined}
                            />
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Estimate Creation Modal */}
            {showEstimateForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Create New Estimate for {project?.name}
                            </h3>
                            
                            <form onSubmit={handleEstimateFormSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={estimateFormData.title}
                                        onChange={(e) => setEstimateFormData({ ...estimateFormData, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter estimate title"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={estimateFormData.description}
                                        onChange={(e) => setEstimateFormData({ ...estimateFormData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        rows={3}
                                        placeholder="Enter estimate description"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Total Amount *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={estimateFormData.total_amount}
                                            onChange={(e) => setEstimateFormData({ ...estimateFormData, total_amount: parseFloat(e.target.value) || 0 })}
                                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Document *
                                    </label>
                                    <input
                                        type="file"
                                        required
                                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                                        onChange={handleDocumentChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Upload a document (PDF, Word, images, etc.)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        value={estimateFormData.notes}
                                        onChange={(e) => setEstimateFormData({ ...estimateFormData, notes: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        rows={2}
                                        placeholder="Additional notes (optional)"
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleEstimateFormCancel}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={estimateFormLoading}
                                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {estimateFormLoading ? 'Creating...' : 'Create Estimate'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail; 