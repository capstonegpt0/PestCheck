import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, AlertTriangle, Book, Bell, Activity, LogOut, Shield, FileText, Database } from 'lucide-react';

const AdminNavigation = ({ user, onLogout }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/farms', icon: MapPin, label: 'Farms' },
    { path: '/admin/farm-requests', icon: FileText, label: 'Farm Requests' },
    { path: '/admin/detections', icon: AlertTriangle, label: 'Detections' },
    { path: '/admin/pests', icon: Book, label: 'Pest Info' },
    { path: '/admin/alerts', icon: Bell, label: 'Alerts' },
    { path: '/admin/activities', icon: Activity, label: 'Activity Logs' },
  ];

  // Add super admin only items
  if (user.role === 'super_admin') {
    navItems.push({
      path: '/super-admin/database',
      icon: Database,
      label: 'Database',
      superAdmin: true
    });
  }

  return (
    <nav className="bg-gradient-to-r from-gray-800 to-gray-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-yellow-400 mr-2" />
            <div>
              <span className="text-xl font-bold text-white">PestCheck Admin</span>
              {user.role === 'super_admin' && (
                <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded">SUPER ADMIN</span>
              )}
            </div>
          </div>

          <div className="hidden md:flex space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? item.superAdmin 
                        ? 'bg-purple-600 text-white'
                        : 'bg-yellow-500 text-gray-900'
                      : item.superAdmin
                        ? 'text-purple-300 hover:bg-purple-900 hover:text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-gray-300 text-sm">{user.username}</span>
              <span className="block text-xs text-yellow-400">
                {user.role === 'super_admin' ? 'Super Administrator' : 'Administrator'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavigation;