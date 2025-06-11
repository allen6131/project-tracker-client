import React, { useState } from 'react';
import { TodoList as TodoListType, TodoItem as TodoItemType } from '../types';
import { todoAPI } from '../services/api';

interface TodoListProps {
    list: TodoListType;
    onListUpdate: (updatedList: TodoListType) => void;
    onListDelete: (listId: number) => void;
}

const TodoList: React.FC<TodoListProps> = ({ list, onListUpdate, onListDelete }) => {
    const [newItemContent, setNewItemContent] = useState('');

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemContent.trim()) return;

        try {
            const newItem = await todoAPI.createTodoItem(list.id, newItemContent.trim());
            const updatedList = { ...list, items: [...list.items, newItem] };
            onListUpdate(updatedList);
            setNewItemContent('');
        } catch (error) {
            console.error("Failed to add item", error);
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
    
    const handleDeleteList = () => {
        if (window.confirm(`Are you sure you want to delete the list "${list.title}"?`)) {
            onListDelete(list.id);
        }
    }

    return (
        <div className="bg-white shadow-md rounded-lg p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{list.title}</h3>
                <button onClick={handleDeleteList} className="text-gray-400 hover:text-red-500">&times;</button>
            </div>
            
            <div className="flex-grow space-y-2 mb-4">
                {list.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={item.is_completed}
                                onChange={() => handleToggleItem(item)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className={`ml-3 text-sm ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                {item.content}
                            </span>
                        </div>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-500 text-xs">Delete</button>
                    </div>
                ))}
            </div>

            <form onSubmit={handleAddItem} className="mt-auto">
                <input
                    type="text"
                    value={newItemContent}
                    onChange={e => setNewItemContent(e.target.value)}
                    placeholder="Add a new task"
                    className="w-full border-t pt-2 mt-2 text-sm focus:outline-none"
                />
            </form>
        </div>
    );
};

export default TodoList; 