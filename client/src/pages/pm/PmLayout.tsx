import {
  BarChart2,
  Bell,
  Folder,
  LayoutDashboard,
  User,
  FileText,
} from 'lucide-react';
import React from 'react';
import { Outlet } from 'react-router-dom';
import { BaseLayout } from '@/components/BaseLayout';

interface PmLayoutProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  children?: React.ReactNode;
}

export const PmLayout: React.FC<PmLayoutProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  children,
}) => {
  const navItems = [
    { label: 'Dashboard', path: '/pm/dashboard', icon: LayoutDashboard },
    { label: 'Projects', path: '/pm/projects', icon: Folder },
    { label: 'Kanban Board', path: '/pm/tasks', icon: FileText },
    { label: 'Reports', path: '/pm/reports', icon: BarChart2 },
    { label: 'Notifications', path: '/pm/notifications', icon: Bell },
    { label: 'Profile', path: '/pm/profile', icon: User },
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
