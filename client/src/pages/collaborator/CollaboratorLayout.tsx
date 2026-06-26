import React from 'react';
import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Folder,
  Bell,
  User,
} from 'lucide-react';
import { BaseLayout } from '@/components/BaseLayout';

interface CollaboratorLayoutProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  children?: React.ReactNode;
}

export const CollaboratorLayout: React.FC<CollaboratorLayoutProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  children,
}) => {
  const navItems = [
    { label: 'Dashboard', path: '/collaborator/dashboard', icon: LayoutDashboard },
    { label: 'My Tasks', path: '/collaborator/tasks', icon: FileText },
    { label: 'My Projects', path: '/collaborator/projects', icon: Folder },
    { label: 'Notifications', path: '/collaborator/notifications', icon: Bell },
    { label: 'Profile', path: '/collaborator/profile', icon: User },
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
