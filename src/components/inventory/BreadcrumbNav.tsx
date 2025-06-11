
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link, useLocation } from "react-router-dom";
import { Home, Package, BarChart3, Car } from "lucide-react";

const BreadcrumbNav = () => {
  const location = useLocation();
  
  const getBreadcrumbs = () => {
    const path = location.pathname;
    
    if (path === '/inventory-dashboard') {
      return [
        { label: 'Dashboard', path: '/', icon: Home },
        { label: 'Inventory Dashboard', current: true, icon: Package }
      ];
    }
    
    if (path === '/rpo-insights') {
      return [
        { label: 'Dashboard', path: '/', icon: Home },
        { label: 'Inventory', path: '/inventory-dashboard', icon: Package },
        { label: 'RPO Insights', current: true, icon: BarChart3 }
      ];
    }
    
    if (path.startsWith('/vehicle-detail/')) {
      const identifier = path.split('/').pop();
      return [
        { label: 'Dashboard', path: '/', icon: Home },
        { label: 'Inventory', path: '/inventory-dashboard', icon: Package },
        { label: `Vehicle ${identifier}`, current: true, icon: Car }
      ];
    }
    
    return [
      { label: 'Dashboard', path: '/', icon: Home, current: true }
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => {
          const Icon = crumb.icon;
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <BreadcrumbItem key={index}>
              {crumb.current ? (
                <BreadcrumbPage className="flex items-center space-x-1">
                  <Icon className="w-4 h-4" />
                  <span>{crumb.label}</span>
                </BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path!} className="flex items-center space-x-1 hover:text-blue-600">
                      <Icon className="w-4 h-4" />
                      <span>{crumb.label}</span>
                    </Link>
                  </BreadcrumbLink>
                  {!isLast && <BreadcrumbSeparator />}
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default BreadcrumbNav;
