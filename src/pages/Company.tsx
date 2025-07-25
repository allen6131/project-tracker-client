import React from 'react';
import CompanyProfile from '../components/CompanyProfile';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Company: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  React.useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Company Profile</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage your company information and branding</p>
      </div>
      <CompanyProfile />
    </div>
  );
};

export default Company; 