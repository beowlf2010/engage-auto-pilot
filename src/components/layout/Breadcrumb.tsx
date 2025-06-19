
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbNameMap: { [key: string]: string } = {
    'dashboard': 'Dashboard',
    'smart-inbox': 'Inbox',
    'leads': 'Leads',
    'inventory-dashboard': 'Inventory',
    'ai-monitor': 'AI Monitor',
    'financial-dashboard': 'Financial',
    'analytics': 'Analytics',
    'settings': 'Settings',
    'upload-inventory': 'Upload Inventory',
    'predictive-analytics': 'Predictive Analytics',
    'message-export': 'Message Export',
    'admin-dashboard': 'Admin Dashboard',
    'manager-dashboard': 'Manager Dashboard',
    'personalization': 'Personalization',
    'rpo-insights': 'RPO Insights',
    'sales-dashboard': 'Sales Dashboard'
  };

  if (pathnames.length === 0 || pathnames[0] === 'dashboard') {
    return null; // Don't show breadcrumb on dashboard
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
      <Link 
        to="/dashboard" 
        className="flex items-center hover:text-gray-700 transition-colors"
      >
        <Home size={16} />
      </Link>
      
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = breadcrumbNameMap[name] || name.charAt(0).toUpperCase() + name.slice(1);

        return (
          <React.Fragment key={name}>
            <ChevronRight size={16} className="text-gray-400" />
            {isLast ? (
              <span className="text-gray-900 font-medium">{displayName}</span>
            ) : (
              <Link 
                to={routeTo} 
                className="hover:text-gray-700 transition-colors"
              >
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
