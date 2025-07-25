import React from 'react';
import ServicesCatalog from '../components/ServicesCatalog';

const Services: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Services Catalog</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage your service offerings and pricing</p>
      </div>
      <ServicesCatalog />
    </div>
  );
};

export default Services; 