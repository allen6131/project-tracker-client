import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, TodoList as TodoListType } from '../types';
import { projectsAPI, todoAPI } from '../services/api';
import TodoList from '../components/TodoList';
import ProjectFilesModal from '../components/ProjectFilesModal';

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [todoLists, setTodoLists] = useState<TodoListType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newListName, setNewListName] = useState('');
    const [showFilesModal, setShowFilesModal] = useState(false);

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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
                    <p className="text-gray-600">{project.description}</p>
                </div>
                <button 
                    onClick={() => setShowFilesModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg"
                >
                    Manage Files
                </button>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Todo Lists</h2>
                
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

            <ProjectFilesModal
                isOpen={showFilesModal}
                onClose={() => setShowFilesModal(false)}
                project={project}
            />
        </div>
    );
};

export default ProjectDetail; 