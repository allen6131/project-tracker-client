import React, { useState, useEffect } from 'react';
import { TodoList as TodoListType, TodoItem as TodoItemType, User } from '../types';
import { todoAPI, usersAPI } from '../services/api';

interface TodoListProps {
    list: TodoListType;
    onListUpdate: (updatedList: TodoListType) => void;
    onListDelete: (listId: number) => void;
}

const TodoList: React.FC<TodoListProps> = ({ list, onListUpdate, onListDelete }) => {
    const [newItemContent, setNewItemContent] = useState('');
    const [newItemAssignedTo, setNewItemAssignedTo] = useState<number | ''>('');
    const [newItemDueDate, setNewItemDueDate] = useState('');
    const [activeUsers, setActiveUsers] = useState<User[]>([]);
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [editingAssignment, setEditingAssignment] = useState<number | ''>('');
    const [editingDueDate, setEditingDueDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load active users on component mount
    useEffect(() => {
        const loadActiveUsers = async () => {
            try {
                const response = await usersAPI.getActiveUsers();
                setActiveUsers(response.users);
            } catch (error) {
                console.error("Failed to load active users", error);
            }
        };
        loadActiveUsers();
    }, []);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemContent.trim() || isSubmitting) return;

        try {
            setIsSubmitting(true);
            
            // Handle optional assignment - convert empty string and 0 to null
            const assignedTo = (newItemAssignedTo === '' || newItemAssignedTo === 0) ? null : Number(newItemAssignedTo);
            // Handle optional due date - convert empty string to null
            const dueDate = (newItemDueDate === '' || !newItemDueDate.trim()) ? null : newItemDueDate;
            
            const newItem = await todoAPI.createTodoItem(list.id, newItemContent.trim(), assignedTo, dueDate);
            const updatedList = { ...list, items: [...list.items, newItem] };
            onListUpdate(updatedList);
            
            // Reset form fields
            setNewItemContent('');
            setNewItemAssignedTo('');
            setNewItemDueDate('');
        } catch (error) {
            console.error("Failed to add item:", error);
            // You could add a toast notification here if needed
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleItem = async (item: TodoItemType) => {
        try {
            const updatedItem = await todoAPI.updateTodoItem(item.id, { is_completed: !item.is_completed });
            const updatedItems = list.items.map(i => i.id === item.id ? updatedItem : i);
            const updatedList = { ...list, items: updatedItems };
            onListUpdate(updatedList);
        } catch (error) {
            console.error("Failed to toggle item", error);
        }
    };

    const handleDeleteItem = async (itemId: number) => {
        try {
            await todoAPI.deleteTodoItem(itemId);
            const updatedItems = list.items.filter(i => i.id !== itemId);
            const updatedList = { ...list, items: updatedItems };
            onListUpdate(updatedList);
        } catch (error) {
            console.error("Failed to delete item", error);
        }
    };

    const handleAssignmentChange = async (itemId: number, newAssignedTo: number | '') => {
        try {
            const assignedTo = newAssignedTo === '' ? null : Number(newAssignedTo);
            const updatedItem = await todoAPI.updateTodoItem(itemId, { assigned_to: assignedTo });
            const updatedItems = list.items.map(i => i.id === itemId ? updatedItem : i);
            const updatedList = { ...list, items: updatedItems };
            onListUpdate(updatedList);
            setEditingItemId(null);
        } catch (error) {
            console.error("Failed to update assignment", error);
        }
    };

    const handleDueDateChange = async (itemId: number, newDueDate: string) => {
        try {
            const dueDate = newDueDate.trim() === '' ? null : newDueDate;
            const updatedItem = await todoAPI.updateTodoItem(itemId, { due_date: dueDate });
            const updatedItems = list.items.map(i => i.id === itemId ? updatedItem : i);
            const updatedList = { ...list, items: updatedItems };
            onListUpdate(updatedList);
            setEditingItemId(null);
        } catch (error) {
            console.error("Failed to update due date", error);
        }
    };

    const startEditingAssignment = (item: TodoItemType) => {
        setEditingItemId(item.id);
        setEditingAssignment(item.assigned_to || '');
        setEditingDueDate(item.due_date || '');
    };

    const cancelEditingAssignment = () => {
        setEditingItemId(null);
        setEditingAssignment('');
        setEditingDueDate('');
    };
    
    const handleDeleteList = () => {
        if (window.confirm(`Are you sure you want to delete the list "${list.title}"?`)) {
            onListDelete(list.id);
        }
    };

    const getRoleBadgeColor = (role: 'admin' | 'user' | null | undefined) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'user':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    const getDueDateColor = (dueDate: string | null | undefined, isCompleted: boolean) => {
        if (!dueDate || isCompleted) return 'text-gray-500';
        
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'text-red-600'; // Overdue
        if (diffDays === 0) return 'text-orange-600'; // Due today
        if (diffDays <= 3) return 'text-yellow-600'; // Due soon
        return 'text-gray-600'; // Future
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{list.title}</h3>
                <button onClick={handleDeleteList} className="text-gray-400 hover:text-red-500">&times;</button>
            </div>
            
            <div className="flex-grow space-y-3 mb-4">
                {list.items.map(item => (
                    <div key={item.id} className="flex items-start justify-between p-2 border rounded-lg">
                        <div className="flex items-start flex-grow">
                            <input
                                type="checkbox"
                                checked={item.is_completed}
                                onChange={() => handleToggleItem(item)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                            />
                            <div className="ml-3 flex-grow">
                                <span className={`text-sm ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                    {item.content}
                                </span>
                                
                                {/* Assignment and Due Date section */}
                                <div className="mt-1 flex items-center gap-2 flex-wrap">
                                    {editingItemId === item.id ? (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <select
                                                value={editingAssignment}
                                                onChange={(e) => setEditingAssignment(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="text-xs border border-gray-300 rounded px-2 py-1"
                                            >
                                                <option value="">Unassigned</option>
                                                {activeUsers.map(user => (
                                                    <option key={user.id} value={user.id}>
                                                        {user.username} ({user.role})
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="date"
                                                value={editingDueDate}
                                                onChange={(e) => setEditingDueDate(e.target.value)}
                                                className="text-xs border border-gray-300 rounded px-2 py-1"
                                            />
                                            <button
                                                onClick={() => {
                                                    handleAssignmentChange(item.id, editingAssignment);
                                                    handleDueDateChange(item.id, editingDueDate);
                                                }}
                                                className="text-xs text-green-600 hover:text-green-800"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEditingAssignment}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {item.assigned_username ? (
                                                <span 
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border cursor-pointer hover:bg-opacity-80 ${getRoleBadgeColor(item.assigned_user_role)}`}
                                                    onClick={() => startEditingAssignment(item)}
                                                    title="Click to change assignment"
                                                >
                                                    {item.assigned_username}
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => startEditingAssignment(item)}
                                                    className="text-xs text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 rounded px-2 py-1"
                                                >
                                                    Assign
                                                </button>
                                            )}
                                            
                                            {item.due_date ? (
                                                <span 
                                                    className={`text-xs px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${getDueDateColor(item.due_date, item.is_completed)}`}
                                                    onClick={() => startEditingAssignment(item)}
                                                    title="Click to change due date"
                                                >
                                                    📅 {formatDate(item.due_date)}
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => startEditingAssignment(item)}
                                                    className="text-xs text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 rounded px-2 py-1"
                                                >
                                                    Set due date
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleDeleteItem(item.id)} 
                            className="text-gray-400 hover:text-red-500 text-xs ml-2"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>

            <form onSubmit={handleAddItem} className="mt-auto space-y-2">
                <input
                    type="text"
                    value={newItemContent}
                    onChange={e => setNewItemContent(e.target.value)}
                    placeholder="Add a new task..."
                    className="w-full border-t pt-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
                <div className="flex items-center gap-2">
                    <select
                        value={newItemAssignedTo}
                        onChange={e => setNewItemAssignedTo(e.target.value === '' ? '' : Number(e.target.value))}
                        className="text-xs border border-gray-300 rounded px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">👤 Assign to someone (optional)</option>
                        {activeUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.username} ({user.role})
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={newItemDueDate}
                        onChange={e => setNewItemDueDate(e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="📅 Set due date (optional)"
                        placeholder="Due date (optional)"
                    />
                    <button
                        type="submit"
                        className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled={!newItemContent.trim() || isSubmitting}
                    >
                        {isSubmitting ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TodoList; 