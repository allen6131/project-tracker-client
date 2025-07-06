import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, TodoList as TodoListType } from '../types';
import { projectsAPI, todoAPI, invoicesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TodoList from '../components/TodoList';
import MaterialCosts from '../components/MaterialCosts';
import CustomerInfo from '../components/CustomerInfo';

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [project, setProject] = useState<Project | null>(null);
    const [todoLists, setTodoLists] = useState<TodoListType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [newListName, setNewListName] = useState('');
    const [activeTab, setActiveTab] = useState<'todos' | 'materials' | 'customer'>('todos');

    useEffect(() => {
        const fetchProjectDetails = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const projectResponse = await projectsAPI.getProject(parseInt(id));
                setProject(projectResponse.project);

                const todoResponse = await todoAPI.getTodoLists(parseInt(id));
                setTodoLists(todoResponse);

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
                    ) : (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Customer Information</h2>
                            </div>
                            <CustomerInfo customerId={project.customer_id || null} customerName={project.customer_name} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail; 