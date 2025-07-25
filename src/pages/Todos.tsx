import React from 'react';
import AllTodoLists from '../components/AllTodoLists';

const Todos: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Tasks</h2>
        <p className="text-gray-600 dark:text-gray-400">Master view of all tasks across projects</p>
      </div>
      <AllTodoLists />
    </div>
  );
};

export default Todos; 