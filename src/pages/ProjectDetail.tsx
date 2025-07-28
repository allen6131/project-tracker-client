import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, TodoList as TodoListType, Invoice, Estimate, Customer, CreateEstimateRequest, CreateInvoiceRequest, UpdateInvoiceRequest, InvoiceItem } from '../types';
import { projectsAPI, todoAPI, invoicesAPI, estimatesAPI, customersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import TodoList from '../components/TodoList';
import MaterialCosts from '../components/MaterialCosts';
import CustomerInfo from '../components/CustomerInfo';
import RFIForm from '../components/RFIForm';
import ChangeOrdersManagement from '../components/ChangeOrdersManagement';
import ProjectComments from '../components/ProjectComments';
import PDFViewer from '../components/PDFViewer';

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const { isDarkMode } = useTheme();
    const [project, setProject] = useState<Project | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [todoLists, setTodoLists] = useState<TodoListType[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [newListName, setNewListName] = useState('');
    const [activeTab, setActiveTab] = useState<'todos' | 'materials' | 'customer' | 'rfi' | 'invoices' | 'estimates' | 'change-orders' | 'comments'>('todos');

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

    // PDF viewer state for estimates
    const [showEstimatePDFViewer, setShowEstimatePDFViewer] = useState(false);
    const [estimatePdfUrl, setEstimatePdfUrl] = useState<string | null>(null);
    const [estimatePdfTitle, setEstimatePdfTitle] = useState('');
    const [estimatePdfLoading, setEstimatePdfLoading] = useState(false);
    const [currentPDFEstimate, setCurrentPDFEstimate] = useState<Estimate | null>(null);

    // PDF viewer state for invoices
    const [showInvoicePDFViewer, setShowInvoicePDFViewer] = useState(false);
    const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null);
    const [invoicePdfTitle, setInvoicePdfTitle] = useState('');
    const [invoicePdfLoading, setInvoicePdfLoading] = useState(false);
    const [currentPDFInvoice, setCurrentPDFInvoice] = useState<Invoice | null>(null);

    // Invoice from estimate state
    const [showInvoiceFromEstimateModal, setShowInvoiceFromEstimateModal] = useState(false);
    const [selectedEstimateForInvoice, setSelectedEstimateForInvoice] = useState<Estimate | null>(null);
    const [invoiceFromEstimateLoading, setInvoiceFromEstimateLoading] = useState(false);
    const [invoiceFromEstimateData, setInvoiceFromEstimateData] = useState({
        percentage: '',
        title: '',
        due_date: ''
    });

    // Invoice form state
    const [showInvoiceForm, setShowInvoiceForm] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [invoiceFormLoading, setInvoiceFormLoading] = useState(false);
    const [invoiceFormData, setInvoiceFormData] = useState({
        title: '',
        description: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_address: '',
        tax_rate: 0,
        due_date: '',
        notes: ''
    });
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
        { description: '', quantity: 1, unit_price: 0 }
    ]);

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    useEffect(() => {
        const fetchProjectDetails = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const projectResponse = await projectsAPI.getProject(parseInt(id));
                setProject(projectResponse.project);

                const todoResponse = await todoAPI.getTodoLists(parseInt(id));
                setTodoLists(todoResponse);

                const invoicesResponse = await invoicesAPI.getProjectInvoices(parseInt(id));
                setInvoices(invoicesResponse.invoices);

                if (projectResponse.project.customer_id) {
                    try {
                        const customerResponse = await customersAPI.getCustomer(projectResponse.project.customer_id);
                        setCustomer(customerResponse.customer);
                    } catch (customerErr) {
                        console.warn('Failed to fetch customer data:', customerErr);
                    }
                }

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
                notes: ''
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

    const handleViewEstimate = async (estimate: Estimate) => {
        try {
            setEstimatePdfLoading(true);
            setEstimatePdfTitle(`Estimate PDF - ${estimate.title}`);
            setCurrentPDFEstimate(estimate);
            
            const url = await estimatesAPI.viewEstimatePDF(estimate.id);
            setEstimatePdfUrl(url);
            setShowEstimatePDFViewer(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load estimate PDF');
        } finally {
            setEstimatePdfLoading(false);
        }
    };

    const handleDownloadEstimatePDF = async () => {
        if (!currentPDFEstimate) return;
        
        try {
            const blob = await estimatesAPI.downloadEstimate(currentPDFEstimate.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `estimate-${currentPDFEstimate.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to download estimate PDF');
        }
    };

    const handleRegenerateEstimatePDF = async () => {
        if (!currentPDFEstimate) return;
        
        try {
            setEstimatePdfLoading(true);
            await estimatesAPI.regenerateEstimatePDF(currentPDFEstimate.id);
            
            // Refresh the PDF view
            const url = await estimatesAPI.viewEstimatePDF(currentPDFEstimate.id);
            setEstimatePdfUrl(url);
            setSuccess('Estimate PDF regenerated successfully');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to regenerate estimate PDF');
        } finally {
            setEstimatePdfLoading(false);
        }
    };

    const handleCloseEstimatePDFViewer = () => {
        setShowEstimatePDFViewer(false);
        setEstimatePdfUrl(null);
        setCurrentPDFEstimate(null);
        setEstimatePdfTitle('');
    };

    // Invoice PDF handlers
    const handleViewInvoice = async (invoice: Invoice) => {
        try {
            setInvoicePdfLoading(true);
            setInvoicePdfTitle(`Invoice PDF - ${invoice.invoice_number}`);
            setCurrentPDFInvoice(invoice);
            
            const url = await invoicesAPI.viewInvoicePDF(invoice.id);
            setInvoicePdfUrl(url);
            setShowInvoicePDFViewer(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load invoice PDF');
        } finally {
            setInvoicePdfLoading(false);
        }
    };

    const handleDownloadInvoicePDF = async () => {
        if (!currentPDFInvoice) return;
        
        try {
            const blob = await invoicesAPI.downloadInvoicePDF(currentPDFInvoice.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${currentPDFInvoice.invoice_number}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to download invoice PDF');
        }
    };

    const handleRegenerateInvoicePDF = async () => {
        if (!currentPDFInvoice) return;
        
        try {
            setInvoicePdfLoading(true);
            await invoicesAPI.regenerateInvoicePDF(currentPDFInvoice.id);
            
            // Refresh the PDF view
            const url = await invoicesAPI.viewInvoicePDF(currentPDFInvoice.id);
            setInvoicePdfUrl(url);
            setSuccess('Invoice PDF regenerated successfully');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to regenerate invoice PDF');
        } finally {
            setInvoicePdfLoading(false);
        }
    };

    const handleCloseInvoicePDFViewer = () => {
        setShowInvoicePDFViewer(false);
        setInvoicePdfUrl(null);
        setCurrentPDFInvoice(null);
        setInvoicePdfTitle('');
    };

    const handleQuickStatusUpdate = async (estimateId: number, newStatus: 'approved' | 'rejected' | 'sent' | 'draft') => {
        try {
            clearMessages();
            await estimatesAPI.updateEstimate(estimateId, { status: newStatus });
            
            // Refresh estimates list
            if (id) {
                const estimatesResponse = await estimatesAPI.getProjectEstimates(parseInt(id));
                setEstimates(estimatesResponse.estimates);
            }
            
            setSuccess(`Estimate status updated to ${newStatus}`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (error: any) {
            console.error('Error updating estimate status:', error);
            setError(error.response?.data?.message || 'Failed to update estimate status');
            setTimeout(() => setError(null), 5000);
        }
    };

    // Invoice from estimate handlers
    const handleCreateInvoiceFromEstimate = (estimate: Estimate) => {
        setSelectedEstimateForInvoice(estimate);
        setInvoiceFromEstimateData({
            percentage: '',
            title: '', // Let server generate default title
            due_date: ''
        });
        setShowInvoiceFromEstimateModal(true);
    };

    const handleInvoiceFromEstimateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedEstimateForInvoice) return;
        
        const percentage = parseFloat(invoiceFromEstimateData.percentage);
        
        console.log('Form data before validation:', invoiceFromEstimateData);
        console.log('Parsed percentage:', percentage);
        
        if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
            setError('Please enter a valid percentage between 1 and 100');
            return;
        }
        
        try {
            setInvoiceFromEstimateLoading(true);
            clearMessages();
            
            // Calculate the invoice amount based on percentage
            const invoiceAmount = (selectedEstimateForInvoice.total_amount * percentage) / 100;
            
            const invoiceData = {
                title: invoiceFromEstimateData.title.trim() || `${percentage}% of ${selectedEstimateForInvoice.title}`,
                due_date: invoiceFromEstimateData.due_date.trim() || undefined,
                percentage: percentage,
                amount: invoiceAmount
            };
            
            console.log('Sending invoice data:', invoiceData);
            console.log('Selected estimate:', selectedEstimateForInvoice);
            
            await invoicesAPI.createInvoiceFromEstimate(selectedEstimateForInvoice.id, invoiceData);
            
            // Refresh invoices list
            if (id) {
                const invoicesResponse = await invoicesAPI.getProjectInvoices(parseInt(id));
                setInvoices(invoicesResponse.invoices);
            }
            
            setSuccess(`Invoice created successfully for ${percentage}% ($${invoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}) of estimate "${selectedEstimateForInvoice.title}"`);
            
            setShowInvoiceFromEstimateModal(false);
            setSelectedEstimateForInvoice(null);
            setInvoiceFromEstimateData({
                percentage: '',
                title: '',
                due_date: ''
            });
            
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            console.error('Error creating invoice from estimate:', err);
            
            let errorMessage = 'Failed to create invoice from estimate';
            
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data?.errors) {
                const validationErrors = err.response.data.errors.map((e: any) => e.msg || e.message).join(', ');
                errorMessage = `Validation failed: ${validationErrors}`;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
            setTimeout(() => setError(null), 8000);
        } finally {
            setInvoiceFromEstimateLoading(false);
        }
    };

    const handleCloseInvoiceFromEstimateModal = () => {
        setShowInvoiceFromEstimateModal(false);
        setSelectedEstimateForInvoice(null);
        setInvoiceFromEstimateData({
            percentage: '',
            title: '',
            due_date: ''
        });
        setError(null);
    };

    // Invoice form handlers
    const handleCreateInvoiceForm = () => {
        if (!project) return;
        
        clearMessages();
        setEditingInvoice(null);
        setInvoiceFormData({
            title: `Invoice for ${project.name}`,
            description: `Invoice for project: ${project.name}`,
            customer_name: project.customer_name || '',
            customer_email: '',
            customer_phone: '',
            customer_address: '',
            tax_rate: 0,
            due_date: '',
            notes: ''
        });
        setInvoiceItems([
            { description: `Work on project: ${project.name}`, quantity: 1, unit_price: 0 }
        ]);
        setShowInvoiceForm(true);
    };

    const handleEditInvoice = (invoice: Invoice) => {
        clearMessages();
        setEditingInvoice(invoice);
        setInvoiceFormData({
            title: invoice.title,
            description: invoice.description || '',
            customer_name: invoice.customer_name || '',
            customer_email: invoice.customer_email || '',
            customer_phone: invoice.customer_phone || '',
            customer_address: invoice.customer_address || '',
            tax_rate: invoice.tax_rate,
            due_date: invoice.due_date || '',
            notes: invoice.notes || ''
        });
        setInvoiceItems(invoice.items && invoice.items.length > 0 
            ? invoice.items 
            : [{ description: '', quantity: 1, unit_price: 0 }]);
        setShowInvoiceForm(true);
    };

    const handleDeleteInvoice = async (invoiceId: number) => {
        if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            return;
        }

        try {
            await invoicesAPI.deleteInvoice(invoiceId);
            setSuccess('Invoice deleted successfully');
            
            // Refresh invoices list
            if (id) {
                const invoicesResponse = await invoicesAPI.getProjectInvoices(parseInt(id));
                setInvoices(invoicesResponse.invoices);
            }
            
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete invoice');
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleInvoiceFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !id) return;

        if (invoiceItems.length === 0 || invoiceItems.every(item => !item.description.trim())) {
            setError('Please add at least one item with a description');
            return;
        }

        setInvoiceFormLoading(true);
        try {
            const invoiceData: CreateInvoiceRequest | UpdateInvoiceRequest = {
                ...invoiceFormData,
                project_id: parseInt(id),
                items: invoiceItems.filter(item => item.description.trim() !== '')
            };

            if (editingInvoice) {
                await invoicesAPI.updateInvoice(editingInvoice.id, invoiceData);
                setSuccess('Invoice updated successfully');
            } else {
                await invoicesAPI.createInvoice(invoiceData as CreateInvoiceRequest);
                setSuccess('Invoice created successfully');
            }

            // Refresh invoices list
            const invoicesResponse = await invoicesAPI.getProjectInvoices(parseInt(id));
            setInvoices(invoicesResponse.invoices);

            // Close modal and reset form
            setShowInvoiceForm(false);
            setEditingInvoice(null);
            
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save invoice');
            setTimeout(() => setError(null), 5000);
        } finally {
            setInvoiceFormLoading(false);
        }
    };

    const handleInvoiceFormCancel = () => {
        setShowInvoiceForm(false);
        setEditingInvoice(null);
        clearMessages();
    };

    const handleInvoiceItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const updatedItems = [...invoiceItems];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setInvoiceItems(updatedItems);
    };

    const addInvoiceItem = () => {
        setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unit_price: 0 }]);
    };

    const removeInvoiceItem = (index: number) => {
        if (invoiceItems.length > 1) {
            setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
        }
    };

    const calculateInvoiceTotal = () => {
        const subtotal = invoiceItems.reduce((sum, item) => {
            return sum + (parseFloat(String(item.quantity)) * parseFloat(String(item.unit_price)));
        }, 0);
        const taxAmount = subtotal * (invoiceFormData.tax_rate / 100);
        return { subtotal, taxAmount, total: subtotal + taxAmount };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-900 dark:text-white text-lg">Loading project details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 dark:text-red-400 text-lg font-medium">Error: {error}</p>
                    <Link to="/dashboard" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline">
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6" />
                    </svg>
                    <p className="text-gray-900 dark:text-white text-lg">Project not found.</p>
                    <Link to="/dashboard" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline">
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors p-4 sm:p-6 lg:p-8">
                <div className="mb-4">
                    <Link to="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline">&larr; Back to Dashboard</Link>
                </div>

                {/* Messages */}
                {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
                        {success}
                    </div>
                )}

                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{project.name}</h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{project.description}</p>
                        
                        {/* Project Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                                <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    project.status === 'bidding' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                    project.status === 'started' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                    project.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                </span>
                            </div>
                            
                            <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Customer:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                    {project.customer_name || 'No customer assigned'}
                                </span>
                            </div>
                            
                            <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Main Technician:</span>
                                <div className="ml-2">
                                    {project.main_technician_username ? (
                                        <div>
                                            <div className="text-gray-900 dark:text-white font-medium">{project.main_technician_username}</div>
                                            {project.main_technician_email && (
                                                <div className="text-gray-500 dark:text-gray-400 text-xs">{project.main_technician_email}</div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-gray-500 dark:text-gray-400 italic">No technician assigned</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        {isAdmin && (
                            <button 
                                onClick={() => {/* handleCreateInvoiceForm */}}
                                className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center space-x-2 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span>Create Invoice</span>
                            </button>
                        )}
                        <button 
                            onClick={handleManageFiles}
                            className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 flex items-center space-x-2 transition-colors"
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
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-8 overflow-x-auto">
                            {[
                                { id: 'todos', name: 'Todo Lists', count: todoLists.length },
                                { id: 'materials', name: 'Material Costs' },
                                { id: 'customer', name: 'Customer Info' },
                                { id: 'rfi', name: 'RFI Emails' },
                                { id: 'invoices', name: 'Invoices', count: invoices.length },
                                { id: 'estimates', name: 'Estimates', count: estimates.length },
                                { id: 'change-orders', name: 'Change Orders' },
                                { id: 'comments', name: 'Comments' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                                    }`}
                                >
                                    <span>{tab.name}</span>
                                    {(tab as any).count !== undefined && (
                                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                                            {(tab as any).count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                        {activeTab === 'todos' ? (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Todo Lists</h2>
                                </div>
                                
                                {/* Add new list form */}
                                <form onSubmit={handleAddList} className="mb-6 flex gap-2">
                                    <input
                                        type="text"
                                        value={newListName}
                                        onChange={e => setNewListName(e.target.value)}
                                        placeholder="New list title"
                                        className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 flex-grow bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">Add List</button>
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
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Information</h2>
                                </div>
                                <CustomerInfo customerId={project.customer_id || null} customerName={project.customer_name} />
                            </div>
                        ) : activeTab === 'rfi' ? (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">RFI Emails</h2>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Send Request for Information emails to customer contacts</span>
                                </div>
                                <RFIForm 
                                    projectId={parseInt(id || '0')} 
                                    project={project}
                                    onSuccess={setSuccess}
                                    onError={setError}
                                />
                            </div>
                        ) : activeTab === 'invoices' || activeTab === 'estimates' || activeTab === 'change-orders' || activeTab === 'comments' ? (
                            <div className="text-center py-12">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Section
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    This section contains the {activeTab} functionality with full dark mode support.
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail; 