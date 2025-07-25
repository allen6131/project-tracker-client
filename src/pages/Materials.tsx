import React from 'react';
import MaterialsCatalog from '../components/MaterialsCatalog';

const Materials: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Materials Catalog</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage your materials inventory and pricing</p>
      </div>
      <MaterialsCatalog />
    </div>
  );
};

export default Materials; 