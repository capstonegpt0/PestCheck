import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Camera, Map, Book, User, LogOut, Bug } from 'lucide-react';

const Navigation = ({ user, onLogout }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/detect', icon: Camera, label: 'Detect' },
    { path: '/heatmap', icon: Map, label: 'Heat Map' },
    { path: '/pests', icon: Book, label: 'Pest Library' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Bug className="w-8 h-8 text-primary mr-2" />
            <span className="text-xl font-bold text-gray-800">PestCheck</span>
          </div>

          <div className="hidden md:flex space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Hello, {user.username}</span>
            <button
              onClick={onLogout}
              className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
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

// ✅ Add this at the bottom:
export default Navigation;
