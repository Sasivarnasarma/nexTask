import {
  BarChart2,
  Bell,
  Folder,
  LayoutDashboard,
  Settings,
  User,
  Users,
  MessageSquare,
} from 'lucide-react';
import React from 'react';
import { Outlet } from 'react-router-dom';
import { BaseLayout } from '@/components/BaseLayout';

interface AdminLayoutProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  children?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  children,
}) => {
  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Projects', path: '/admin/projects', icon: Folder },
    { label: 'Chat', path: '/admin/messages', icon: MessageSquare },
    { label: 'Reports', path: '/admin/reports', icon: BarChart2 },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
    { label: 'Profile', path: '/admin/profile', icon: User },
  ];

  return (
    <BaseLayout
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      navItems={navItems}
    >
      {children || <Outlet />}
    </BaseLayout>
  );
};
