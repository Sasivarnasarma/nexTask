import { Project, ProjectMemberView } from '@nextask/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Edit,
  Folder,
  Loader2,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';

import {
  addProjectMember,
  archiveProject,
  deleteProject,
  fetchProjectMembers,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole,
} from '@/api/projects.api';
import { fetchTasks } from '@/api/tasks.api';
import { listUsers } from '@/api/users.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { extractApiError } from '@/lib/apiError';
import { useToastStore } from '@/store/toast.store';

export const AdminProjectsView: React.FC = () => {
  const queryClient = useQueryClient();
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected entities for modals
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [managingProject, setManagingProject] = useState<Project | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // Project Form States
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');

  // Add Member Form States
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'PROJECT_MANAGER' | 'COLLABORATOR'>('COLLABORATOR');

  // 1. Fetch Projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['admin-projects-list'],
    queryFn: async () => {
      const { fetchAllProjects } = await import('@/api/projects.api');
      return fetchAllProjects();
    },
  });

  // 2. Fetch Tasks per project to calculate progress
  const { data: progressMap = {} } = useQuery<
    Record<string, { total: number; completed: number; rate: number }>
  >({
    queryKey: ['projects-progress-map', projects.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (projects.length === 0) return {};
      const results: Record<string, { total: number; completed: number; rate: number }> = {};
      await Promise.all(
        projects.map(async (p) => {
          try {
            const tasks = await fetchTasks(p.id);
            const total = tasks.length;
            const completed = tasks.filter((t) => t.status === 'DONE').length;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            results[p.id] = { total, completed, rate };
          } catch (e) {
            results[p.id] = { total: 0, completed: 0, rate: 0 };
          }
        }),
      );
      return results;
    },
    enabled: projects.length > 0,
  });

  // 3. Fetch Project Members for current managed project
  const { data: members = [], isLoading: membersLoading } = useQuery<ProjectMemberView[]>({
    queryKey: ['project-members', managingProject?.id],
    queryFn: () => (managingProject ? fetchProjectMembers(managingProject.id) : Promise.resolve([])),
    enabled: !!managingProject,
  });

  // 4. Fetch Users list (for member assignment dropdown)
  const { data: usersData } = useQuery({
    queryKey: ['users-list-members-dropdown'],
    queryFn: () => listUsers(1, 1000),
    enabled: !!managingProject,
  });

  // Project Mutations

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; description: string } }) =>
      updateProject(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects-list'] });
      setEditingProject(null);
      showSuccess('Project details updated successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to update project.'));
    },
  });

  const archiveProjectMutation = useMutation({
    mutationFn: archiveProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects-list'] });
      showSuccess('Project archived successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to archive project.'));
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects-list'] });
      setIsDeleteOpen(false);
      setDeletingProject(null);
      showSuccess('Project deleted successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to delete project.'));
    },
  });

  // Member Mutations
  const addMemberMutation = useMutation({
    mutationFn: ({ projectId, body }: { projectId: string; body: { userId: string; role: 'PROJECT_MANAGER' | 'COLLABORATOR' } }) =>
      addProjectMember(projectId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', managingProject?.id] });
      setSelectedUserId('');
      showSuccess('Member added to project.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to add member.'));
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ projectId, userId, body }: { projectId: string; userId: string; body: { role: 'PROJECT_MANAGER' | 'COLLABORATOR' } }) =>
      updateProjectMemberRole(projectId, userId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', managingProject?.id] });
      showSuccess('Member role updated.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to update member role.'));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      removeProjectMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', managingProject?.id] });
      showSuccess('Member removed from project.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to remove member.'));
    },
  });

  // Handlers

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !formName.trim()) return;
    updateProjectMutation.mutate({
      id: editingProject.id,
      payload: {
        name: formName.trim(),
        description: formDesc.trim(),
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingProject) return;
    deleteProjectMutation.mutate(deletingProject.id);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingProject || !selectedUserId) return;
    addMemberMutation.mutate({
      projectId: managingProject.id,
      body: {
        userId: selectedUserId,
        role: memberRole,
      },
    });
  };

  // Stats
  const totalCount = projects.length;
  const activeCount = projects.filter((p) => p.status === 'ACTIVE').length;
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;
  const archivedCount = projects.filter((p) => p.status === 'ARCHIVED').length;

  // Filter application
  const filteredProjects = projects.filter((p) => {
    const statusMatches =
      statusFilter === 'ALL' || p.status === statusFilter;
    const searchMatches =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return statusMatches && searchMatches;
  });

  // Pagination
  const totalFiltered = filteredProjects.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
  const startIndex = (page - 1) * limit;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + limit);

  // Available users to add (exclude current project members)
  const allUsers = usersData?.users || [];
  const currentMemberIds = new Set(members.map((m) => m.userId));
  const availableUsersToAdd = allUsers.filter((u) => !currentMemberIds.has(u.id));

  // Find PM (Owner or PM role in members)
  const getProjectManager = (proj: Project) => {
    // If the project metadata owner corresponds to a user, display it. Or retrieve PM from members.
    const pm = allUsers.find((u) => u.id === proj.ownerId);
    return pm ? pm.name || pm.email : 'Unassigned';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-slate-100 bg-transparent">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Project Administration</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Overview and configure project metadata, managers, team memberships, and archival states.
          </p>
        </div>
      </div>

      {/* 2. Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: totalCount, icon: Folder, color: 'text-indigo-400' },
          { label: 'Active Projects', value: activeCount, icon: Folder, color: 'text-emerald-400' },
          { label: 'Completed Projects', value: completedCount, icon: Folder, color: 'text-blue-400' },
          { label: 'Archived Projects', value: archivedCount, icon: Folder, color: 'text-amber-400' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-400 font-medium">{card.label}</span>
                <Icon className={`w-4.5 h-4.5 ${card.color}`} />
              </div>
              <h3 className="text-3xl font-extrabold mt-3 tracking-tight">{card.value}</h3>
            </div>
          );
        })}
      </div>

      {/* 3. Search & Filters */}
      <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-550 focus-visible:ring-indigo-500 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs text-slate-400 shrink-0 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All States</option>
            <option value="ACTIVE">Active Only</option>
            <option value="COMPLETED">Completed Only</option>
            <option value="ARCHIVED">Archived Only</option>
          </select>
        </div>
      </div>

      {/* 4. Main Content (Table) */}
      <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {projectsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span className="text-sm font-medium">Gathering project lists...</span>
            </div>
          ) : paginatedProjects.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm font-medium italic">
              No projects found matching filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/40 border-b border-slate-800/60">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-300">Project Name</TableHead>
                    <TableHead className="font-semibold text-slate-300">Project Manager</TableHead>
                    <TableHead className="font-semibold text-slate-300">Status</TableHead>
                    <TableHead className="font-semibold text-slate-300">Progress</TableHead>
                    <TableHead className="w-20 text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProjects.map((p) => {
                    const prog = progressMap[p.id] || { total: 0, completed: 0, rate: 0 };
                    return (
                      <TableRow key={p.id} className="hover:bg-slate-950/20 border-b border-slate-800/60 transition-colors">
                        <TableCell className="font-semibold text-slate-100 pl-6">
                          <div>
                            <div>{p.name}</div>
                            {p.description && (
                              <div className="text-xs text-slate-400 font-normal mt-0.5 line-clamp-1">
                                {p.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">{getProjectManager(p)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              p.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/30'
                                : p.status === 'COMPLETED'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                            }
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-40">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                              <span>Progress</span>
                              <span className="font-bold">{prog.rate}%</span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                              <div
                                className="bg-indigo-500 h-full transition-all duration-300"
                                style={{ width: `${prog.rate}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingProject(p);
                                setFormName(p.name);
                                setFormDesc(p.description || '');
                              }}
                              title="Edit Project Details"
                              className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {p.status === 'ACTIVE' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => archiveProjectMutation.mutate(p.id)}
                                title="Archive Project"
                                className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setManagingProject(p)}
                              title="Manage Project Members"
                              className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingProject(p);
                                setIsDeleteOpen(true);
                              }}
                              title="Delete Project"
                              className="h-8 w-8 text-rose-500 hover:text-rose-455 hover:bg-rose-500/10 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-900 pt-4">
          <span className="text-xs text-slate-400 font-medium">
            Showing Page {page} of {totalPages} ({totalFiltered} projects total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 rounded-xl"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 rounded-xl"
            >
              Next
            </Button>
          </div>
        </div>
      )}



      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Project Metadata</DialogTitle>
              <DialogDescription className="text-slate-400">
                Update name and details for this project.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-slate-200">
              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Project Name</label>
                <Input
                  required
                  placeholder="e.g. Project Launch"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  placeholder="Description..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full min-h-20 p-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingProject(null)}
                className="hover:bg-slate-800 text-slate-400 hover:text-slate-100 border-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProjectMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-755 text-white"
              >
                {updateProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-rose-500 flex items-center gap-2 font-bold">
              Delete Project board?
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-2">
              Are you sure you want to permanently delete project{' '}
              <strong className="text-slate-100">{deletingProject?.name}</strong>? This will purge
              all tasks, assignees, and comments linked to this project board. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              className="hover:bg-slate-800 text-slate-450 hover:text-slate-100 border-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteProjectMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl"
            >
              {deleteProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={!!managingProject} onOpenChange={(open) => !open && setManagingProject(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-indigo-400 flex items-center gap-2 font-bold">
              Manage Board Members: {managingProject?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Add users to project team, grant Manager roles, or remove memberships.
            </DialogDescription>
          </DialogHeader>

          {/* Add Member Section */}
          <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3 py-3 border-b border-slate-850">
            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">User</span>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select a user...</option>
                {availableUsersToAdd.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ? `${u.name} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Role</span>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as any)}
                className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="COLLABORATOR">Collaborator</option>
                <option value="PROJECT_MANAGER">Project Manager</option>
              </select>
            </div>
            <Button
              type="submit"
              disabled={addMemberMutation.isPending || !selectedUserId}
              className="sm:self-end h-9 bg-indigo-600 hover:bg-indigo-755 text-white text-xs px-4"
            >
              Add Member
            </Button>
          </form>

          {/* Members list */}
          <div className="py-4 overflow-y-auto max-h-[250px] text-slate-250">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Current Members
            </span>
            {membersLoading ? (
              <div className="flex justify-center items-center py-5">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center text-slate-500 italic text-xs py-5">
                No members found in project.
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between gap-3 p-2 bg-slate-950/20 border border-slate-850 rounded-xl">
                    <div className="min-w-0 leading-tight">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {m.user.name || 'Unnamed'}
                      </div>
                      <div className="text-[10px] text-slate-550 truncate mt-0.5">
                        {m.user.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={m.role}
                        onChange={(e) =>
                          changeRoleMutation.mutate({
                            projectId: managingProject!.id,
                            userId: m.userId,
                            body: { role: e.target.value as any },
                          })
                        }
                        className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-200 outline-none"
                      >
                        <option value="COLLABORATOR">Collaborator</option>
                        <option value="PROJECT_MANAGER">Project Manager</option>
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          removeMemberMutation.mutate({
                            projectId: managingProject!.id,
                            userId: m.userId,
                          })
                        }
                        className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setManagingProject(null)}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
