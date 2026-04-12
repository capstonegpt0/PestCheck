import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, MapPin, AlertTriangle, Book,
  Bell, Activity, LogOut, Shield, FileText, UserCheck
} from 'lucide-react';
import AdminNotificationBell from './AdminNotificationBell';

const AdminNavigation = ({ user, onLogout }) => {
  const location = useLocation();
  const isAdmin   = user?.role === 'admin';
  const isMAOStaff = user?.role === 'mao_staff';

  const adminNavItems = [
    { path: '/admin/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/users',          icon: Users,           label: 'Users' },
    { path: '/admin/farms',          icon: MapPin,          label: 'Farms' },
    { path: '/admin/farm-requests',  icon: FileText,        label: 'Farm Requests' },
    { path: '/admin/detections',     icon: AlertTriangle,   label: 'Detections' },
    { path: '/admin/pests',          icon: Book,            label: 'Pest Info' },
    { path: '/admin/alerts',         icon: Bell,            label: 'Alerts' },
    { path: '/admin/activities',     icon: Activity,        label: 'Activity Logs' },
    { path: '/admin/monthly-report', icon: FileText,        label: 'Monthly Report' },
  ];

  const maoNavItems = [
    { path: '/admin/users',          icon: UserCheck,       label: 'Farmer Verification' },
    { path: '/admin/farms',          icon: MapPin,          label: 'Farms' },
    { path: '/admin/farm-requests',  icon: FileText,        label: 'Farm Requests' },
    { path: '/admin/detections',     icon: AlertTriangle,   label: 'Detections' },
    { path: '/admin/pests',          icon: Book,            label: 'Pest Info' },
    { path: '/admin/alerts',         icon: Bell,            label: 'Send Alerts' },
    { path: '/admin/monthly-report', icon: FileText,        label: 'Monthly Report' },
  ];

  const navItems = isAdmin ? adminNavItems : maoNavItems;

  return (
    <nav className="bg-gradient-to-r from-gray-800 to-gray-900 shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-6">

        {/* Top row — brand + notification bell + user info + logout */}
        <div className="flex items-center justify-between h-12 border-b border-gray-700">
          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Shield className="w-6 h-6 text-yellow-400" />
            <span className="text-lg font-bold text-white tracking-tight">PestCheck</span>
            {isAdmin && (
              <span className="text-xs bg-yellow-500 text-gray-900 px-2 py-0.5 rounded-full font-semibold">
                Admin
              </span>
            )}
            {isMAOStaff && (
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                MAO Staff
              </span>
            )}
          </div>

          {/* Right side: notification bell + user + logout */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Admin Notification Bell */}
            <AdminNotificationBell user={user} />

            <div className="w-px h-6 bg-gray-700" />

            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-white">{user?.username}</p>
              <p className="text-xs text-yellow-400">
                {isAdmin ? 'Administrator' : 'MAO Staff'}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Bottom row — nav links */}
        <div className="flex items-center gap-1 h-11 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  isActive
                    ? 'bg-yellow-500 text-gray-900'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
};

export default AdminNavigation;