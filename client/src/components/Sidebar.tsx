import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  Folder,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useWebPush } from '@/hooks/useWebPush';
import { useAuthStore } from '@/store/auth.store';
import { useProjectStore } from '@/store/project.store';
import { useToastStore } from '@/store/toast.store';

import { fetchUserProjects } from '../api/profile.api';
import { createProject } from '../api/projects.api';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

export function Sidebar({ isOpen }: { isOpen: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { unsubscribe } = useWebPush();

  const { activeProjectId, setActiveProjectId } = useProjectStore();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const isActive = (path: string) => location.pathname.includes(path);

  // Fetch projects list
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchUserProjects,
  });

  const activeProjectIdResolved =
    (activeProjectId && projects.some((p) => p.id === activeProjectId)
      ? activeProjectId
      : projects[0]?.id) || null;
  const activeProject = projects.find((p) => p.id === activeProjectIdResolved);
  const activeProjectName = activeProject ? activeProject.name : 'Select Project';

  const canCreateProject = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  // Create Project mutation
  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setActiveProjectId(data.id);
      setIsCreateProjectOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      useToastStore.getState().showSuccess('Project created successfully!');
    },
    onError: () => {
      useToastStore.getState().showError('Failed to create project.');
    },
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createProjectMutation.mutate({
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
    });
  };

  const handleLogout = async () => {
    try {
      await unsubscribe();
    } catch (e) {
      console.error('Failed to unsubscribe push notifications on logout:', e);
    }
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-full border-r border-border h-full py-6 bg-background flex flex-col justify-between transition-all duration-300">
      <div className="flex flex-col gap-6">
        <div
          className={`font-extrabold tracking-tight text-foreground transition-all duration-300 ${isOpen ? 'text-2xl px-6' : 'text-xl text-center'}`}
        >
          {isOpen ? 'nexTask' : 'T'}
        </div>

        {/* Project Switcher */}
        <div className="px-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`w-full flex items-center gap-2 border-border bg-background hover:bg-muted text-foreground text-sm font-semibold h-10 ${
                  isOpen ? 'px-3 justify-between' : 'p-0 justify-center'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Folder className="h-4 w-4 shrink-0 text-primary" />
                  {isOpen && <span className="truncate">{activeProjectName}</span>}
                </div>
                {isOpen && <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border-border text-popover-foreground w-56">
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => setActiveProjectId(project.id)}
                  className={`cursor-pointer ${
                    project.id === activeProjectIdResolved
                      ? 'bg-primary/10 text-primary font-medium'
                      : ''
                  }`}
                >
                  <Folder className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                  <span className="truncate">{project.name}</span>
                </DropdownMenuItem>
              ))}
              {canCreateProject && (
                <>
                  <div className="h-px bg-border my-1" />
                  <DropdownMenuItem
                    onClick={() => setIsCreateProjectOpen(true)}
                    className="cursor-pointer text-primary focus:text-primary font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2 shrink-0" />
                    Create Project...
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col gap-6 px-3">
          <div className="flex flex-col gap-1.5">
            {isOpen && (
              <div className="text-muted-foreground font-bold text-[10px] tracking-widest uppercase mb-1.5 px-3">
                Main Menu
              </div>
            )}
            <Link
              to="/dashboard"
              title="Dashboard"
              className={`flex items-center gap-3 ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} ${
                isActive('/dashboard')
                  ? 'bg-primary/10 text-primary font-bold shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              } rounded-lg text-sm transition-all duration-200`}
            >
              <LayoutDashboard
                className={`w-5 h-5 shrink-0 ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}
              />
              {isOpen && <span>Dashboard</span>}
            </Link>
            <Link
              to="/calendar"
              title="Schedule Visualizer"
              className={`flex items-center gap-3 ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} ${
                isActive('/calendar')
                  ? 'bg-primary/10 text-primary font-bold shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              } rounded-lg text-sm transition-all duration-200`}
            >
              <Calendar
                className={`w-5 h-5 shrink-0 ${isActive('/calendar') ? 'text-primary' : 'text-muted-foreground'}`}
              />
              {isOpen && <span>Calendar</span>}
            </Link>
            <Link
              to="/messages"
              title="Team Chat"
              className={`flex items-center gap-3 ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} ${
                isActive('/messages')
                  ? 'bg-primary/10 text-primary font-bold shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              } rounded-lg text-sm transition-all duration-200`}
            >
              <MessageSquare
                className={`w-5 h-5 shrink-0 ${isActive('/messages') ? 'text-primary' : 'text-muted-foreground'}`}
              />
              {isOpen && <span>Messages</span>}
            </Link>
          </div>

          {/* Admin Portal (Admin Only) */}
          {user?.role === 'ADMIN' && (
            <div className="flex flex-col gap-1.5">
              {isOpen && (
                <div className="text-muted-foreground font-bold text-[10px] tracking-widest uppercase mb-1.5 px-3">
                  Admin
                </div>
              )}
              <Link
                to="/admin"
                title="Admin Portal"
                className={`flex items-center gap-3 ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} ${
                  isActive('/admin')
                    ? 'bg-primary/10 text-primary font-bold shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                } rounded-lg text-sm transition-all duration-200`}
              >
                <Shield
                  className={`w-5 h-5 shrink-0 ${isActive('/admin') ? 'text-primary' : 'text-muted-foreground'}`}
                />
                {isOpen && <span>Admin Portal</span>}
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {isOpen && (
              <div className="text-muted-foreground font-bold text-[10px] tracking-widest uppercase mb-1.5 px-3">
                General
              </div>
            )}
            <Link
              to="/settings"
              title="Settings"
              className={`flex items-center gap-3 ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} ${
                isActive('/settings')
                  ? 'bg-primary/10 text-primary font-bold shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              } rounded-lg text-sm transition-all duration-200`}
            >
              <Settings
                className={`w-5 h-5 shrink-0 ${isActive('/settings') ? 'text-primary' : 'text-muted-foreground'}`}
              />
              {isOpen && <span>Settings</span>}
            </Link>
          </div>
        </div>
      </div>

      <div className="px-3">
        <button
          onClick={handleLogout}
          title="Log Out"
          className={`group flex items-center gap-3 w-full ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg font-bold text-sm transition-all duration-200`}
        >
          <LogOut className="w-5 h-5 shrink-0 text-muted-foreground group-hover:text-destructive" />
          {isOpen && <span>Log Out</span>}
        </button>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set up a new workspace for your team.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Project Name</label>
              <Input
                placeholder="e.g. Website Redesign"
                className="bg-background border-border focus-visible:ring-primary"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                placeholder="Briefly describe the project goals..."
                className="bg-background border-border focus-visible:ring-primary resize-none"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateProjectOpen(false)}
              className="hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={createProjectMutation.isPending || !newProjectName.trim()}
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
