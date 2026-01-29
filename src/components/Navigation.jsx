import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Camera, Map, Book, User, LogOut, Bug, Menu, X } from 'lucide-react';

const Navigation = ({ user, onLogout }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/detect', icon: Camera, label: 'Detect' },
    { path: '/heatmap', icon: Map, label: 'Heat Map' },
    { path: '/pests', icon: Book, label: 'Pest Library' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-white shadow-lg hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Bug className="w-8 h-8 text-primary mr-2" />
              <span className="text-xl font-bold text-gray-800">PestCheck</span>
            </div>

            <div className="flex space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.path)
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

      {/* Mobile Navigation - Top Bar */}
      <nav className="bg-white shadow-lg md:hidden">
        <div className="px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Bug className="w-7 h-7 text-primary mr-2" />
              <span className="text-lg font-bold text-gray-800">PestCheck</span>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white">
            <div className="px-4 py-2">
              <div className="text-sm text-gray-600 mb-2">
                Hello, <span className="font-semibold">{user.username}</span>
              </div>
              
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg mb-1 transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center px-4 py-3 mt-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full ${
                  isActive(item.path)
                    ? 'text-primary'
                    : 'text-gray-600'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive(item.path) ? 'text-primary' : ''}`} />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Add padding to bottom of page for mobile bottom nav */}
      <style jsx>{`
        @media (max-width: 768px) {
          body {
            padding-bottom: 4rem;
          }
        }
      `}</style>
    </>
  );
};

export default Navigation;