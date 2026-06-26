import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  Clock,
  Edit,
  Folder,
  Loader2,
  Search,
  Trash2,
  ChevronRight,
  X,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { fetchUserProjects } from '@/api/profile.api';
import {
  createProject,
  addProjectMember,
  archiveProject,
  completeProject,
  deleteProject,
  fetchProjectMembers,
  fetchTeamMembersAutocomplete,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole,
} from '@/api/projects.api';
import { listUsers } from '@/api/users.api';
import { useAuthStore } from '@/store/auth.store';
import { fetchTasks } from '@/api/tasks.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { extractApiError } from '@/lib/apiError';
import { useToastStore } from '@/store/toast.store';
import { Project, ProjectMemberView, Task } from '@nextask/types';

export const PmProjectsView: React.FC = () => {
  const queryClient = useQueryClient();
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);
  const currentUser = useAuthStore((s) => s.user);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDetailTab, setProjectDetailTab] = useState<'overview' | 'members' | 'tasks' | 'timeline' | 'analytics'>('overview');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Create states
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'ARCHIVED' | 'COMPLETED'>('ACTIVE');
  const [newColor, setNewColor] = useState('blue');
  const [selectedCollabs, setSelectedCollabs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation errors
  const [nameError, setNameError] = useState('');
  const [dateError, setDateError] = useState('');

  // Edit states
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Add Member states
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedAddUser, setSelectedAddUser] = useState<{ id: string; name: string | null; email: string } | null>(null);
  const [addMemberRole, setAddMemberRole] = useState<'PROJECT_MANAGER' | 'COLLABORATOR'>('COLLABORATOR');

  // Query: fetch users (for collaborator selection)
  const { data: usersResponse } = useQuery({
    queryKey: ['users-list-create-project-dropdown'],
    queryFn: () => listUsers(1, 1000),
    enabled: isCreateOpen,
  });

  const collaboratorsList = (usersResponse?.users || []).filter(
    (u) => u.role === 'COLLABORATOR'
  );

  // Query: projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['pm-assigned-projects-list'],
    queryFn: fetchUserProjects,
  });

  // Query: tasks for all projects
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['pm-all-projects-tasks', projects.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (projects.length === 0) return [];
      const tasksPromises = projects.map((p) =>
        fetchTasks(p.id).catch(() => [] as Task[])
      );
      const results = await Promise.all(tasksPromises);
      return results.flat();
    },
    enabled: projects.length > 0,
  });

  // Query: current selected project members
  const { data: selectedProjectMembers = [], isLoading: membersLoading } = useQuery<ProjectMemberView[]>({
    queryKey: ['pm-selected-project-members', selectedProject?.id],
    queryFn: () => (selectedProject ? fetchProjectMembers(selectedProject.id) : Promise.resolve([])),
    enabled: !!selectedProject,
  });

  // Query: current selected project tasks
  const { data: selectedProjectTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['pm-selected-project-tasks', selectedProject?.id],
    queryFn: () => (selectedProject ? fetchTasks(selectedProject.id) : Promise.resolve([])),
    enabled: !!selectedProject,
  });

  // Query: member autocomplete lookup
  const { data: autocompleteResults = [] } = useQuery({
    queryKey: ['pm-member-autocomplete', selectedProject?.id, memberSearchQuery],
    queryFn: () => (selectedProject ? fetchTeamMembersAutocomplete(selectedProject.id, memberSearchQuery) : Promise.resolve([])),
    enabled: !!selectedProject && memberSearchQuery.length > 1,
  });

  // Mutations
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; description: string } }) =>
      updateProject(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-assigned-projects-list'] });
      setIsEditOpen(false);
      showSuccess('Project details updated successfully.');
      if (selectedProject) {
        setSelectedProject((prev) => prev ? { ...prev, name: editName, description: editDesc } : null);
      }
    },
    onError: (err) => showError(extractApiError(err, 'Failed to update project.')),
  });

  const archiveProjectMutation = useMutation({
    mutationFn: archiveProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-assigned-projects-list'] });
      showSuccess('Project archived successfully.');
      if (selectedProject) {
        setSelectedProject((prev) => prev ? { ...prev, status: 'ARCHIVED' as any } : null);
      }
    },
    onError: (err) => showError(extractApiError(err, 'Failed to archive project.')),
  });

  const completeProjectMutation = useMutation({
    mutationFn: completeProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-assigned-projects-list'] });
      showSuccess('Project completed successfully.');
      if (selectedProject) {
        setSelectedProject((prev) => prev ? { ...prev, status: 'COMPLETED' as any } : null);
      }
    },
    onError: (err) => showError(extractApiError(err, 'Failed to complete project.')),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-assigned-projects-list'] });
      setIsDeleteOpen(false);
      setSelectedProject(null);
      showSuccess('Project deleted.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to delete project.')),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { userId: string; role: 'PROJECT_MANAGER' | 'COLLABORATOR' } }) =>
      addProjectMember(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-selected-project-members', selectedProject?.id] });
      showSuccess('Team member added to project.');
      setSelectedAddUser(null);
      setMemberSearchQuery('');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to add member.')),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      removeProjectMember(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-selected-project-members', selectedProject?.id] });
      showSuccess('Team member removed.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to remove member.')),
  });

  const changeMemberRoleMutation = useMutation({
    mutationFn: ({ id, userId, role }: { id: string; userId: string; role: 'PROJECT_MANAGER' | 'COLLABORATOR' }) =>
      updateProjectMemberRole(id, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-selected-project-members', selectedProject?.id] });
      showSuccess('Project membership updated.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to update membership role.')),
  });

  // Project health and progress calculation
  const getProjectProgress = (projId: string) => {
    const projTasks = tasks.filter((t) => t.projectId === projId);
    if (projTasks.length === 0) return 0;
    const completed = projTasks.filter((t) => t.status === 'DONE').length;
    return Math.round((completed / projTasks.length) * 100);
  };

  const getProjectHealth = (proj: Project) => {
    const projTasks = tasks.filter((t) => t.projectId === proj.id);
    const overdueCount = projTasks.filter((t) => {
      if (t.status === 'DONE' || !t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    if (overdueCount > 2) return { label: 'At Risk', style: 'bg-red-500/10 text-red-400 border-red-500/20' };
    if (overdueCount > 0) return { label: 'Needs Attention', style: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    return { label: 'Healthy', style: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' };
  };

  // Stats
  const totalCount = projects.length;
  const activeCount = projects.filter((p) => p.status === 'ACTIVE').length;
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;
  const delayedCount = projects.filter((p) => {
    if (p.status === 'COMPLETED' || !p.endDate) return false;
    return new Date(p.endDate) < new Date();
  }).length;

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    setDateError('');

    if (!newName.trim()) {
      setNameError('Project name is required.');
      return;
    }
    if (newName.trim().length < 3) {
      setNameError('Project name must be at least 3 characters.');
      return;
    }

    const isDuplicate = projects.some(
      (p) => p.name.toLowerCase() === newName.trim().toLowerCase()
    );
    if (isDuplicate) {
      setNameError('A project with this name already exists.');
      return;
    }

    if (newStartDate && newDueDate && new Date(newDueDate) < new Date(newStartDate)) {
      setDateError('Due Date cannot be earlier than Start Date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newProject = await createProject({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        endDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
      });

      if (selectedCollabs.length > 0) {
        await Promise.all(
          selectedCollabs.map((userId) =>
            addProjectMember(newProject.id, { userId, role: 'COLLABORATOR' }).catch((err) => {
              console.error(`Failed to assign collaborator ${userId}:`, err);
            })
          )
        );
      }

      showSuccess('Project created successfully.');
      setIsCreateOpen(false);

      // Reset form
      setNewName('');
      setNewDesc('');
      setNewKey('');
      setNewStartDate('');
      setNewDueDate('');
      setNewPriority('MEDIUM');
      setNewStatus('ACTIVE');
      setNewColor('blue');
      setSelectedCollabs([]);

      queryClient.invalidateQueries({ queryKey: ['pm-assigned-projects-list'] });
    } catch (err) {
      showError(extractApiError(err, 'Failed to create project.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !editName.trim()) return;
    updateProjectMutation.mutate({
      id: selectedProject.id,
      payload: { name: editName.trim(), description: editDesc.trim() },
    });
  };

  const handleDeleteConfirm = () => {
    if (!projectToDelete) return;
    deleteProjectMutation.mutate(projectToDelete.id);
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedAddUser) return;
    addMemberMutation.mutate({
      id: selectedProject.id,
      body: { userId: selectedAddUser.id, role: addMemberRole },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-slate-100 bg-transparent">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Project Management</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Control milestones, organize team alignment, and analyze operational metrics for assigned boards.
          </p>
        </div>
      </div>

      {/* Action Button Area */}
      <div className="flex justify-start">
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold rounded-xl px-4 py-2.5 transition-all text-sm flex items-center gap-2 shadow-lg shadow-blue-500/10"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: totalCount, icon: Folder, color: 'text-indigo-400' },
          { label: 'Active Boards', value: activeCount, icon: Clock, color: 'text-amber-400' },
          { label: 'Completed Boards', value: completedCount, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Delayed Boards', value: delayedCount, icon: AlertTriangle, color: 'text-red-500' },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400 font-semibold">{c.label}</span>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <h3 className="text-3xl font-extrabold mt-3 tracking-tight">{c.value}</h3>
            </div>
          );
        })}
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Project Directory List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-xs rounded-xl"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-36 h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
            >
              <option value="ALL">All States</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {projectsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="text-xs font-semibold">Reading assigned project metrics...</span>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="py-20 text-center text-slate-500 text-xs italic">
                  No project boards found.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-950/40 border-b border-slate-800/60">
                    <TableRow>
                      <TableHead className="text-slate-350 text-xs font-bold pl-6">Project Name</TableHead>
                      <TableHead className="text-slate-350 text-xs font-bold">Health</TableHead>
                      <TableHead className="text-slate-350 text-xs font-bold">State</TableHead>
                      <TableHead className="text-slate-350 text-xs font-bold">Progress</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((p) => {
                      const prog = getProjectProgress(p.id);
                      const health = getProjectHealth(p);
                      const isSelected = selectedProject?.id === p.id;
                      return (
                        <TableRow
                          key={p.id}
                          onClick={() => {
                            setSelectedProject(p);
                            setProjectDetailTab('overview');
                          }}
                          className={`cursor-pointer hover:bg-slate-955/20 border-b border-slate-800/60 transition-colors ${
                            isSelected ? 'bg-blue-600/5 hover:bg-blue-600/5' : ''
                          }`}
                        >
                          <TableCell className="font-semibold pl-6 py-4">
                            <div>{p.name}</div>
                            {p.description && (
                              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 font-normal">
                                {p.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${health.style} border text-[10px]`}>{health.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-slate-950 border-slate-850 text-slate-300 text-[10px]">{p.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="w-24">
                              <div className="flex justify-between items-center text-[9px] text-slate-400 mb-1">
                                <span>Complete</span>
                                <span className="font-bold">{prog}%</span>
                              </div>
                              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full" style={{ width: `${prog}%` }} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="pr-4">
                            <ChevronRight size={16} className="text-slate-500" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Selected Project Details Panel */}
        <div className="lg:col-span-1">
          {selectedProject ? (
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl overflow-hidden sticky top-6">
              <CardHeader className="bg-slate-950/40 border-b border-slate-800/60 p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-bold truncate">{selectedProject.name}</CardTitle>
                    <span className="text-[10px] text-slate-550 block mt-1">
                      Due: {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : 'No Target Date'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-slate-200"
                      onClick={() => {
                        setEditName(selectedProject.name);
                        setEditDesc(selectedProject.description || '');
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                      onClick={() => {
                        setProjectToDelete(selectedProject);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {/* Tabs selection */}
                <div className="flex items-center gap-1.5 mt-4 border-t border-slate-800/60 pt-3 overflow-x-auto scrollbar-none">
                  {(['overview', 'members', 'tasks', 'timeline', 'analytics'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setProjectDetailTab(tab)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors capitalize ${
                        projectDetailTab === tab
                          ? 'bg-blue-600/10 text-blue-400'
                          : 'text-slate-400 hover:text-slate-250 hover:bg-slate-800/50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="p-5 max-h-[500px] overflow-y-auto">
                {/* 1. Overview Tab */}
                {projectDetailTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Description</span>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                        {selectedProject.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950/30 border border-slate-850 p-3 rounded-xl">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Start Date</span>
                        <span className="text-xs font-semibold mt-1 block">
                          {selectedProject.createdAt ? new Date(selectedProject.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="bg-slate-950/30 border border-slate-850 p-3 rounded-xl">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Due Date</span>
                        <span className="text-xs font-semibold mt-1 block text-blue-450">
                          {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : 'No Target'}
                        </span>
                      </div>
                    </div>

                    {/* Milestones list */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Board Actions</span>
                      <div className="flex gap-2">
                        {selectedProject.status !== 'COMPLETED' && (
                          <Button
                            onClick={() => completeProjectMutation.mutate(selectedProject.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] rounded-xl h-8 font-semibold"
                          >
                            Mark Completed
                          </Button>
                        )}
                        {selectedProject.status !== 'ARCHIVED' && (
                          <Button
                            onClick={() => archiveProjectMutation.mutate(selectedProject.id)}
                            className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] rounded-xl h-8 font-semibold"
                          >
                            Archive Board
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Members Tab */}
                {projectDetailTab === 'members' && (
                  <div className="space-y-4">
                    {/* Add Member form */}
                    <form onSubmit={handleAddMemberSubmit} className="space-y-2.5 bg-slate-950/30 border border-slate-850 p-3 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Assign Project Member</span>
                      <div className="flex flex-col gap-2">
                        <Input
                          placeholder="Search teammate by name..."
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          className="bg-slate-950 border-slate-800 h-8 text-xs rounded-xl"
                        />
                        {/* Auto-complete suggestions */}
                        {autocompleteResults.length > 0 && (
                          <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden divide-y divide-slate-850 max-h-24 overflow-y-auto">
                            {autocompleteResults.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setSelectedAddUser(item);
                                  setMemberSearchQuery(item.name || item.email);
                                }}
                                className="px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-900 cursor-pointer"
                              >
                                {item.name ? `${item.name} (${item.email})` : item.email}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 items-center">
                          <select
                            value={addMemberRole}
                            onChange={(e) => setAddMemberRole(e.target.value as any)}
                            className="h-8 px-2 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-200 outline-none flex-1"
                          >
                            <option value="COLLABORATOR">Collaborator</option>
                            <option value="PROJECT_MANAGER">Project Manager</option>
                          </select>
                          <Button
                            type="submit"
                            disabled={!selectedAddUser || addMemberMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] rounded-xl h-8 px-3 font-semibold shrink-0"
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </form>

                    {/* Members List */}
                    {membersLoading ? (
                      <div className="flex justify-center py-6 text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Roster</span>
                        {selectedProjectMembers.map((m) => (
                          <div key={m.userId} className="flex items-center justify-between gap-3 bg-slate-950/20 border border-slate-850 p-2.5 rounded-xl">
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-200 block truncate">{m.user.name || m.user.email}</span>
                              <span className="text-[9px] text-slate-550 block mt-0.5">{m.role}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={m.role}
                                onChange={(e) => changeMemberRoleMutation.mutate({
                                  id: selectedProject.id,
                                  userId: m.userId,
                                  role: e.target.value as any,
                                })}
                                className="bg-slate-950 border border-slate-800 text-[9px] h-6 px-1.5 rounded-lg text-slate-350"
                              >
                                <option value="COLLABORATOR">COLLABORATOR</option>
                                <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                              </select>
                              <button
                                onClick={() => removeMemberMutation.mutate({ id: selectedProject.id, userId: m.userId })}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Tasks Tab */}
                {projectDetailTab === 'tasks' && (
                  <div className="space-y-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Board Tasks</span>
                    {tasksLoading ? (
                      <div className="flex justify-center py-6 text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : selectedProjectTasks.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs italic">
                        No tasks assigned to this board.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedProjectTasks.map((t) => (
                          <div key={t.id} className="bg-slate-950/20 border border-slate-855 p-3 rounded-xl flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-200 truncate block">{t.title}</span>
                              <span className="text-[9px] text-slate-500 mt-1 block">Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <Badge className="bg-slate-950 text-slate-400 border-slate-850 text-[9px]">{t.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Timeline Tab */}
                {projectDetailTab === 'timeline' && (
                  <div className="space-y-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Board Timeline schedule</span>
                    {tasksLoading ? (
                      <div className="flex justify-center py-6 text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : selectedProjectTasks.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs italic">
                        No scheduled deliverables.
                      </div>
                    ) : (
                      <div className="space-y-4 border-l border-slate-800 pl-3.5 ml-2.5 py-1">
                        {selectedProjectTasks.map((t) => (
                          <div key={t.id} className="relative space-y-1">
                            <div className="absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-slate-900" />
                            <span className="text-[9px] font-bold text-blue-400 uppercase">
                              {t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Milestone TBD'}
                            </span>
                            <h5 className="text-xs font-semibold text-slate-200">{t.title}</h5>
                            <p className="text-[10px] text-slate-500">{t.description || 'No description detail.'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Analytics Tab */}
                {projectDetailTab === 'analytics' && (
                  <div className="space-y-4">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Analytical Performance</span>
                    {selectedProjectTasks.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs italic">
                        No analytical insights.
                      </div>
                    ) : (
                      <>
                        <div className="h-44 w-full bg-slate-950/20 p-2 border border-slate-850 rounded-xl">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Todo', value: selectedProjectTasks.filter((t) => t.status === 'TODO').length },
                                  { name: 'In Progress', value: selectedProjectTasks.filter((t) => t.status === 'IN_PROGRESS').length },
                                  { name: 'Completed', value: selectedProjectTasks.filter((t) => t.status === 'DONE').length },
                                ]}
                                innerRadius={35}
                                outerRadius={50}
                                dataKey="value"
                              >
                                <Cell fill="#F59E0B" />
                                <Cell fill="#3B82F6" />
                                <Cell fill="#10B981" />
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', fontSize: 10 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-around text-[10px] text-slate-455">
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> To Do</div>
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> In Progress</div>
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed</div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-10 text-center text-slate-500 text-xs italic font-medium leading-relaxed">
              Select a project board from the directory listing to inspect overview, teammates, tasks, calendar milestones, and charts.
            </div>
          )}
        </div>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Board Details</DialogTitle>
              <DialogDescription className="text-slate-400">
                Update the metadata values for this board.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-slate-200">
              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Board Name</label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full min-h-20 p-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                className="hover:bg-slate-800 text-slate-400 hover:text-slate-100 border-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProjectMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Project Board</DialogTitle>
            <DialogDescription className="text-red-400">
              This action is destructive and irreversible. Tasks and attachments will be deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              className="hover:bg-slate-800 text-slate-400 hover:text-slate-100 border-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleteProjectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[500px]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Provide project information and assign collaborators to the new board.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-slate-200 text-left max-h-[60vh] overflow-y-auto px-1">
              {/* Project Name */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Project Name <span className="text-red-500">*</span></label>
                <Input
                  required
                  placeholder="Enter project name"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    const cleanName = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                    setNewKey(cleanName.substring(0, 3).toUpperCase());
                  }}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
                {nameError && <span className="text-[11px] text-red-500 font-medium">{nameError}</span>}
              </div>

              {/* Project Key */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Project Key</label>
                <Input
                  placeholder="e.g. PRJ"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  placeholder="Enter project description..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full min-h-20 p-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-slate-400">Start Date</label>
                  <Input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500 text-slate-350"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-slate-400">Due Date</label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500 text-slate-355"
                  />
                </div>
              </div>
              {dateError && <span className="text-[11px] text-red-500 font-medium">{dateError}</span>}

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-slate-400">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="bg-slate-955 border border-slate-800 rounded-md p-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-slate-400">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="bg-slate-955 border border-slate-800 rounded-md p-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Planning</option>
                    <option value="COMPLETED">On Hold</option>
                  </select>
                </div>
              </div>

              {/* Project Color & Manager */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-slate-400">Project Color</label>
                  <select
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="bg-slate-955 border border-slate-800 rounded-md p-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="blue">Blue</option>
                    <option value="emerald">Emerald</option>
                    <option value="indigo">Indigo</option>
                    <option value="amber">Amber</option>
                    <option value="rose">Rose</option>
                    <option value="purple">Purple</option>
                  </select>
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-slate-400">Project Manager</label>
                  <Input
                    disabled
                    value={currentUser?.name || currentUser?.email || 'Logged-in PM'}
                    className="bg-slate-950 border-slate-800 text-slate-450 opacity-60"
                  />
                </div>
              </div>

              {/* Collaborators Assignment */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Assign Collaborators</label>
                <div className="max-h-28 overflow-y-auto border border-slate-800 bg-slate-950 rounded-md p-2 space-y-1.5">
                  {collaboratorsList.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic block p-1">No collaborators available.</span>
                  ) : (
                    collaboratorsList.map((collab) => {
                      const isSelected = selectedCollabs.includes(collab.id);
                      return (
                        <label key={collab.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-900 rounded cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedCollabs(selectedCollabs.filter((id) => id !== collab.id));
                              } else {
                                setSelectedCollabs([...selectedCollabs, collab.id]);
                              }
                            }}
                            className="rounded bg-slate-950 border-slate-800 accent-blue-600 w-3.5 h-3.5"
                          />
                          <span className="text-slate-300 font-medium">
                            {collab.name || collab.email} <span className="text-[10px] text-slate-500">({collab.email})</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="hover:bg-slate-800 text-slate-400 hover:text-slate-100 border-none text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  'Create Project'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
