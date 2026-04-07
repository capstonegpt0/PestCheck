import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Map, Book, User, LogOut, Bug } from 'lucide-react';
import NotificationBell from './NotificationBell';

const Navigation = ({ user, onLogout }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
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
                        ? 'bg-primary text-gray-900 font-semibold'
                        : 'text-gray-700 hover:bg-yellow-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell />
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

      {/* Mobile Navigation - Top Bar (logo + bell only; routing handled by bottom nav) */}
      <nav className="bg-white shadow-lg md:hidden">
        <div className="px-4">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center">
              <Bug className="w-7 h-7 text-primary mr-2" />
              <span className="text-lg font-bold text-gray-800">PestCheck</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500 mr-1">Hi, {user.username}</span>
              <NotificationBell />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full relative ${
                  active ? 'text-yellow-600' : 'text-gray-500'
                }`}
              >
                {active && (
                  <span className="absolute top-1.5 w-8 h-1 bg-yellow-500 rounded-full" />
                )}
                <Icon className={`w-5 h-5 mt-1 ${active ? 'text-yellow-600' : ''}`} />
                <span className={`text-xs mt-0.5 ${active ? 'font-semibold' : ''}`}>{item.label}</span>
              </Link>
            );
          })}
          {/* Logout as last bottom-nav item */}
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center flex-1 h-full text-red-400"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5 mt-1" />
            <span className="text-xs mt-0.5">Logout</span>
          </button>
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