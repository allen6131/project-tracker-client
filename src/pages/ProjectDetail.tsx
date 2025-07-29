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

    // Dropdown state for action menus
    const [openEstimateDropdownId, setOpenEstimateDropdownId] = useState<number | null>(null);
    const [openInvoiceDropdownId, setOpenInvoiceDropdownId] = useState<number | null>(null);

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    // Dropdown handlers
    const toggleEstimateDropdown = (estimateId: number, event: React.MouseEvent) => {
        event.stopPropagation();
        setOpenEstimateDropdownId(openEstimateDropdownId === estimateId ? null : estimateId);
    };

    const toggleInvoiceDropdown = (invoiceId: number, event: React.MouseEvent) => {
        event.stopPropagation();
        setOpenInvoiceDropdownId(openInvoiceDropdownId === invoiceId ? null : invoiceId);
    };

    // Handle click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.dropdown-container')) {
                setOpenEstimateDropdownId(null);
                setOpenInvoiceDropdownId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 transition-colors" style={{ overflow: 'visible' }}>
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
                        ) : activeTab === 'invoices' ? (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Project Invoices</h2>
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{invoices.length} invoice(s) for this project</span>
                                        {isAdmin && (
                                            <button
                                                onClick={handleCreateInvoiceForm}
                                                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                <span>Create Invoice</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                {invoices.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500 dark:text-gray-400">
                                            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="text-lg">No invoices found for this project</p>
                                            <p className="text-sm mt-2">Invoices created for this project will appear here</p>
                                            {isAdmin && (
                                                <button
                                                    onClick={handleCreateInvoiceForm}
                                                    className="mt-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Create First Invoice
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Invoice
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Customer
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Amount
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Created
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {invoices.map((invoice) => (
                                                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">{invoice.title}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900 dark:text-white">{invoice.customer_name || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                ${invoice.total_amount.toFixed(2)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                                invoice.status === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                                                invoice.status === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                            }`}>
                                                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {new Date(invoice.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="relative dropdown-container">
                                                                <button
                                                                    onClick={(e) => toggleInvoiceDropdown(invoice.id, e)}
                                                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                                >
                                                                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                    </svg>
                                                                </button>
                                                                
                                                                {openInvoiceDropdownId === invoice.id && (
                                                                    <div className="absolute right-0 top-full mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5"
                                                                         style={{ 
                                                                             zIndex: 9999,
                                                                             boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                                                         }}>
                                                                        <div className="py-1">
                                                                            <button
                                                                                onClick={() => {
                                                                                    handleViewInvoice(invoice);
                                                                                    setOpenInvoiceDropdownId(null);
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                                            >
                                                                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                </svg>
                                                                                View PDF
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    handleDownloadInvoicePDF();
                                                                                    setOpenInvoiceDropdownId(null);
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                                            >
                                                                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                </svg>
                                                                                Download PDF
                                                                            </button>
                                                                            {isAdmin && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            handleEditInvoice(invoice);
                                                                                            setOpenInvoiceDropdownId(null);
                                                                                        }}
                                                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                                                    >
                                                                                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                                        </svg>
                                                                                        Edit
                                                                                    </button>
                                                                                    <hr className="border-gray-200 dark:border-gray-600 my-1" />
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            handleDeleteInvoice(invoice.id);
                                                                                            setOpenInvoiceDropdownId(null);
                                                                                        }}
                                                                                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                                                    >
                                                                                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                        </svg>
                                                                                        Delete
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
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
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Project Estimates</h2>
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{estimates.length} estimate(s) for this project</span>
                                        {isAdmin && (
                                            <button
                                                onClick={handleCreateEstimate}
                                                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
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
                                        <div className="text-gray-500 dark:text-gray-400">
                                            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-lg">No estimates found for this project</p>
                                            <p className="text-sm mt-2">Project estimates will appear here once created</p>
                                            {isAdmin && (
                                                <button
                                                    onClick={handleCreateEstimate}
                                                    className="mt-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Create First Estimate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Estimate
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Customer
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Amount
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Document
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {estimates.map((estimate) => (
                                                    <tr key={estimate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{estimate.title}</div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">{estimate.description}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900 dark:text-white">{estimate.customer_name || project.customer_name || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                ${estimate.total_amount.toFixed(2)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                estimate.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                                estimate.status === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                                                estimate.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                            }`}>
                                                                {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {estimate.document_path ? 'Document attached' : 'No document'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="relative dropdown-container">
                                                                <button
                                                                    onClick={(e) => toggleEstimateDropdown(estimate.id, e)}
                                                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                                >
                                                                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                    </svg>
                                                                </button>
                                                                
                                                                {openEstimateDropdownId === estimate.id && (
                                                                    <div className="absolute right-0 top-full mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5"
                                                                         style={{ 
                                                                             zIndex: 9999,
                                                                             boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                                                         }}>
                                                                        <div className="py-1">
                                                                            <button
                                                                                onClick={() => {
                                                                                    handleViewEstimate(estimate);
                                                                                    setOpenEstimateDropdownId(null);
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                                            >
                                                                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                </svg>
                                                                                View PDF
                                                                            </button>
                                                                            {estimate.document_path && (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        handleDownloadEstimate(estimate.id);
                                                                                        setOpenEstimateDropdownId(null);
                                                                                    }}
                                                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                                                >
                                                                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                    </svg>
                                                                                    {estimate.document_path ? 'Download PDF' : 'Generate PDF'}
                                                                                </button>
                                                                            )}
                                                                            {isAdmin && (
                                                                                <>
                                                                                    {estimate.status === 'draft' && (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                handleQuickStatusUpdate(estimate.id, 'sent');
                                                                                                setOpenEstimateDropdownId(null);
                                                                                            }}
                                                                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                                                        >
                                                                                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                                                            </svg>
                                                                                            Mark as Sent
                                                                                        </button>
                                                                                    )}
                                                                                    {estimate.status === 'sent' && (
                                                                                        <>
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    handleQuickStatusUpdate(estimate.id, 'approved');
                                                                                                    setOpenEstimateDropdownId(null);
                                                                                                }}
                                                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                                                            >
                                                                                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                                </svg>
                                                                                                Approve
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    handleQuickStatusUpdate(estimate.id, 'rejected');
                                                                                                    setOpenEstimateDropdownId(null);
                                                                                                }}
                                                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                                                            >
                                                                                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                                </svg>
                                                                                                Reject
                                                                                            </button>
                                                                                        </>
                                                                                    )}
                                                                                    {estimate.status !== 'approved' && estimate.status !== 'sent' && (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                handleQuickStatusUpdate(estimate.id, 'approved');
                                                                                                setOpenEstimateDropdownId(null);
                                                                                            }}
                                                                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                                                        >
                                                                                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                            </svg>
                                                                                            Approve
                                                                                        </button>
                                                                                    )}
                                                                                    {estimate.status === 'approved' && (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                handleCreateInvoiceFromEstimate(estimate);
                                                                                                setOpenEstimateDropdownId(null);
                                                                                            }}
                                                                                            className="flex items-center w-full px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                                                        >
                                                                                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                            </svg>
                                                                                            Create Invoice
                                                                                        </button>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
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
                        ) : activeTab === 'comments' ? (
                            <div>
                                <ProjectComments 
                                    projectId={parseInt(id || '0')}
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Estimate Creation Modal */}
            {showEstimateForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Create New Estimate for {project?.name}
                            </h3>
                            
                            <form onSubmit={handleEstimateFormSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={estimateFormData.title}
                                        onChange={(e) => setEstimateFormData({ ...estimateFormData, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Enter estimate title"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={estimateFormData.description}
                                        onChange={(e) => setEstimateFormData({ ...estimateFormData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        rows={3}
                                        placeholder="Enter estimate description"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Total Amount *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={estimateFormData.total_amount}
                                            onChange={(e) => setEstimateFormData({ ...estimateFormData, total_amount: parseFloat(e.target.value) || 0 })}
                                            className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Document *
                                    </label>
                                    <input
                                        type="file"
                                        required
                                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                                        onChange={handleDocumentChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Upload a document (PDF, Word, images, etc.)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        value={estimateFormData.notes}
                                        onChange={(e) => setEstimateFormData({ ...estimateFormData, notes: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        rows={2}
                                        placeholder="Additional notes (optional)"
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleEstimateFormCancel}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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

            {/* Estimate PDF Viewer Modal */}
            <PDFViewer
                isOpen={showEstimatePDFViewer}
                onClose={handleCloseEstimatePDFViewer}
                pdfUrl={estimatePdfUrl}
                title={estimatePdfTitle}
                onDownload={handleDownloadEstimatePDF}
                onRegenerate={handleRegenerateEstimatePDF}
                loading={estimatePdfLoading}
            />

            {/* Invoice PDF Viewer Modal */}
            <PDFViewer
                isOpen={showInvoicePDFViewer}
                onClose={handleCloseInvoicePDFViewer}
                pdfUrl={invoicePdfUrl}
                title={invoicePdfTitle}
                onDownload={handleDownloadInvoicePDF}
                onRegenerate={handleRegenerateInvoicePDF}
                loading={invoicePdfLoading}
            />

            {/* Create Invoice from Estimate Modal */}
            {showInvoiceFromEstimateModal && selectedEstimateForInvoice && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Create Invoice from Estimate
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Creating invoice from: <strong>{selectedEstimateForInvoice.title}</strong><br />
                                Estimate Amount: <strong>${selectedEstimateForInvoice.total_amount.toFixed(2)}</strong>
                            </p>
                            
                            <form onSubmit={handleInvoiceFromEstimateSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Percentage of Estimate Amount to Invoice *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        max="100"
                                        value={invoiceFromEstimateData.percentage}
                                        onChange={(e) => setInvoiceFromEstimateData({ 
                                            ...invoiceFromEstimateData, 
                                            percentage: e.target.value 
                                        })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Enter percentage (1-100)"
                                        required
                                    />
                                    {invoiceFromEstimateData.percentage && (
                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                            Invoice Amount: ${((selectedEstimateForInvoice.total_amount * parseFloat(invoiceFromEstimateData.percentage || '0')) / 100).toFixed(2)}
                                        </p>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Invoice Title (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={invoiceFromEstimateData.title}
                                        onChange={(e) => setInvoiceFromEstimateData({ 
                                            ...invoiceFromEstimateData, 
                                            title: e.target.value 
                                        })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Custom invoice title"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Due Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={invoiceFromEstimateData.due_date}
                                        onChange={(e) => setInvoiceFromEstimateData({ 
                                            ...invoiceFromEstimateData, 
                                            due_date: e.target.value 
                                        })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseInvoiceFromEstimateModal}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={invoiceFromEstimateLoading || !invoiceFromEstimateData.percentage}
                                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {invoiceFromEstimateLoading ? 'Creating Invoice...' : 'Create Invoice'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Form Modal */}
            {showInvoiceForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
                            </h3>
                            
                            <form onSubmit={handleInvoiceFormSubmit} className="space-y-6">
                                {/* Basic Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
                                        <input
                                            type="text"
                                            required
                                            value={invoiceFormData.title}
                                            onChange={(e) => setInvoiceFormData({ ...invoiceFormData, title: e.target.value })}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
                                        <input
                                            type="date"
                                            value={invoiceFormData.due_date}
                                            onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                    <textarea
                                        rows={3}
                                        value={invoiceFormData.description}
                                        onChange={(e) => setInvoiceFormData({ ...invoiceFormData, description: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                {/* Customer Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name</label>
                                        <input
                                            type="text"
                                            value={invoiceFormData.customer_name}
                                            onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customer_name: e.target.value })}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Email</label>
                                        <input
                                            type="email"
                                            value={invoiceFormData.customer_email}
                                            onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customer_email: e.target.value })}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Phone</label>
                                        <input
                                            type="tel"
                                            value={invoiceFormData.customer_phone}
                                            onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customer_phone: e.target.value })}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tax Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={invoiceFormData.tax_rate}
                                            onChange={(e) => setInvoiceFormData({ ...invoiceFormData, tax_rate: parseFloat(e.target.value) || 0 })}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Address</label>
                                    <textarea
                                        rows={2}
                                        value={invoiceFormData.customer_address}
                                        onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customer_address: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                {/* Items Section */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-md font-medium text-gray-900 dark:text-white">Invoice Items</h4>
                                        <button
                                            type="button"
                                            onClick={addInvoiceItem}
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                        >
                                            Add Item
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {invoiceItems.map((item, index) => (
                                            <div key={index} className="grid grid-cols-12 gap-2 items-end">
                                                <div className="col-span-5">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => handleInvoiceItemChange(index, 'description', e.target.value)}
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
                                                        onChange={(e) => handleInvoiceItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
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
                                                        onChange={(e) => handleInvoiceItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total</label>
                                                    <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white">
                                                        ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="col-span-1">
                                                    {invoiceItems.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeInvoiceItem(index)}
                                                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded text-sm"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Totals Display */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    {(() => {
                                        const { subtotal, taxAmount, total } = calculateInvoiceTotal();
                                        return (
                                            <>
                                                <div className="flex justify-between text-sm text-gray-900 dark:text-white">
                                                    <span>Subtotal:</span>
                                                    <span>${subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-gray-900 dark:text-white">
                                                    <span>Tax ({invoiceFormData.tax_rate}%):</span>
                                                    <span>${taxAmount.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-lg font-medium border-t border-gray-200 dark:border-gray-600 pt-2 mt-2 text-gray-900 dark:text-white">
                                                    <span>Total:</span>
                                                    <span>${total.toFixed(2)}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                                    <textarea
                                        rows={3}
                                        value={invoiceFormData.notes}
                                        onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                {/* Form Actions */}
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={handleInvoiceFormCancel}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={invoiceFormLoading}
                                        className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {invoiceFormLoading ? 'Saving...' : (editingInvoice ? 'Update Invoice' : 'Create Invoice')}
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