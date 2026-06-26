import {
  AdminUpdateUserRequest,
  User,
  UserActivityResponse,
  UserRole,
} from '@nextask/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit,
  History,
  Key,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';

import {
  activateUser,
  createUser,
  deactivateUser,
  deleteUser,
  getUserActivity,
  listUsers,
  resetUserPassword,
  updateUser,
} from '@/api/users.api';
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
import { useAuthStore } from '@/store/auth.store';
import { useToastStore } from '@/store/toast.store';

export const AdminUsersView: React.FC = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected User for Audit/Logs Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);

  // User Forms State
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('COLLABORATOR');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingUserEmail, setDeletingUserEmail] = useState('');

  // Fetch Users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-list', page, searchQuery],
    queryFn: () => listUsers(page, 100, searchQuery), // Fetch a larger batch for filtering/stats calculations
  });

  // Fetch Activities for selected user
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<UserActivityResponse[]>({
    queryKey: ['admin-user-activities', selectedUser?.id],
    queryFn: () => (selectedUser ? getUserActivity(selectedUser.id) : Promise.resolve([])),
    enabled: !!selectedUser,
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setIsCreateOpen(false);
      showSuccess('User account created successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to create user.'));
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUpdateUserRequest }) =>
      updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setIsEditOpen(false);
      showSuccess('User profile details updated successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to update user.'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      showSuccess('User account deactivated successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to deactivate user.'));
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      showSuccess('User account activated successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to activate user.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setIsDeleteOpen(false);
      showSuccess('User deleted successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to delete user.'));
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: () => {
      showSuccess('Password reset requested successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to request password reset.'));
    },
  });

  // Action Handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) return;
    createUserMutation.mutate({
      email: formEmail.trim(),
      name: formName.trim() || null,
      role: formRole,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId || !formEmail.trim()) return;
    updateUserMutation.mutate({
      id: editingUserId,
      payload: {
        email: formEmail.trim(),
        name: formName.trim() || null,
        role: formRole,
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingUserId) return;
    deleteMutation.mutate(deletingUserId);
  };

  const openCreateModal = () => {
    setFormEmail('');
    setFormName('');
    setFormRole('COLLABORATOR');
    setIsCreateOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUserId(user.id);
    setFormEmail(user.email);
    setFormName(user.name || '');
    setFormRole(user.role);
    setIsEditOpen(true);
  };

  const openDeleteModal = (user: User) => {
    setDeletingUserId(user.id);
    setDeletingUserEmail(user.email);
    setIsDeleteOpen(true);
  };

  // Stats calculation over all users
  const rawUsers = usersData?.users || [];
  const totalCount = rawUsers.length;
  const activeCount = rawUsers.filter((u) => u.isActive).length;
  const adminCount = rawUsers.filter((u) => u.role === 'ADMIN').length;
  const pmCount = rawUsers.filter((u) => u.role === 'PROJECT_MANAGER').length;
  const collaboratorCount = rawUsers.filter((u) => u.role === 'COLLABORATOR').length;

  // Frontend Filter application
  const filteredUsers = rawUsers.filter((u) => {
    const roleMatches = roleFilter === 'ALL' || u.role === roleFilter;
    const statusMatches =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.isActive) ||
      (statusFilter === 'DEACTIVATED' && !u.isActive);
    return roleMatches && statusMatches;
  });

  // Client-side pagination over filtered results
  const totalFiltered = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
  const startIndex = (page - 1) * limit;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-slate-100 bg-transparent">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">User Administration</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Configure platform permissions, manage roles, view user directories, and monitor audit trails.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2.5 transition-all text-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Create User
        </Button>
      </div>

      {/* 2. Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: totalCount, icon: Users, color: 'text-indigo-400' },
          { label: 'Active Users', value: activeCount, icon: UserCheck, color: 'text-emerald-400' },
          { label: 'Administrators', value: adminCount, icon: Shield, color: 'text-indigo-400' },
          { label: 'Project Managers', value: pmCount, icon: Shield, color: 'text-purple-400' },
          { label: 'Collaborators', value: collaboratorCount, icon: Shield, color: 'text-amber-400' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400 font-medium truncate">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.color} shrink-0`} />
              </div>
              <h3 className="text-2xl font-extrabold mt-2 tracking-tight">{card.value}</h3>
            </div>
          );
        })}
      </div>

      {/* 3. Search & Filters */}
      <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-550 focus-visible:ring-indigo-500 rounded-xl"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-slate-400 shrink-0 font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Administrators</option>
              <option value="PROJECT_MANAGER">Project Managers</option>
              <option value="COLLABORATOR">Collaborators</option>
            </select>
          </div>

          {/* Status Filter */}
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
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DEACTIVATED">Deactivated Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Main Content (Table) */}
      <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span className="text-sm font-medium">Querying users directory...</span>
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm font-medium italic">
              No users found matching filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/40 border-b border-slate-800/60">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-300">Name</TableHead>
                    <TableHead className="font-semibold text-slate-300">Email</TableHead>
                    <TableHead className="font-semibold text-slate-300">Role</TableHead>
                    <TableHead className="font-semibold text-slate-300">Status</TableHead>
                    <TableHead className="font-semibold text-slate-300">Created At</TableHead>
                    <TableHead className="w-20 text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <TableRow key={u.id} className="hover:bg-slate-950/20 border-b border-slate-800/60 transition-colors">
                        <TableCell className="font-medium text-slate-100 pl-6">
                          {u.name || <span className="text-slate-500 italic">Unnamed</span>}
                          {isSelf && (
                            <Badge variant="secondary" className="ml-2 bg-indigo-950/40 text-indigo-400 border border-indigo-800/30 text-[10px]">
                              You
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-300">{u.email}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              u.role === 'ADMIN'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-medium'
                                : u.role === 'PROJECT_MANAGER'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-medium'
                                  : 'bg-slate-800 text-slate-300 border-slate-700 font-medium'
                            }
                          >
                            {u.role.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                              }`}
                            />
                            <span className={`text-xs font-semibold ${u.isActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {u.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">
                          {new Date(u.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(u)}
                              disabled={isSelf}
                              title="Edit User Details"
                              className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {u.isActive ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deactivateMutation.mutate(u.id)}
                                disabled={isSelf}
                                title="Deactivate User"
                                className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg"
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => activateMutation.mutate(u.id)}
                                disabled={isSelf}
                                title="Activate User"
                                className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setResettingUser(u);
                                setIsResetOpen(true);
                              }}
                              disabled={isSelf}
                              title="Force Reset Password"
                              className="h-8 w-8 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedUser(u)}
                              title="View Activity Logs"
                              className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteModal(u)}
                              disabled={isSelf}
                              title="Delete Account"
                              className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
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
            Showing Page {page} of {totalPages} ({totalFiltered} users total)
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

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Add User Account</DialogTitle>
              <DialogDescription className="text-slate-400">
                Setup a new workspace user. They will be forced to change their password on first
                login.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-slate-200">
              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Email Address</label>
                <Input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Display Name</label>
                <Input
                  placeholder="e.g. John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Workspace Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="COLLABORATOR">Collaborator (Standard User)</option>
                  <option value="PROJECT_MANAGER">Project Manager (PM)</option>
                  <option value="ADMIN">Administrator (Full Admin Access)</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="hover:bg-slate-800 text-slate-400 hover:text-slate-100 border-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-755 text-white"
              >
                {createUserMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Modify User Profile</DialogTitle>
              <DialogDescription className="text-slate-400">
                Edit the profile information and workspace role of this account.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-slate-200">
              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Email Address</label>
                <Input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Display Name</label>
                <Input
                  placeholder="e.g. John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-semibold text-slate-400">Workspace Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="COLLABORATOR">Collaborator (Standard User)</option>
                  <option value="PROJECT_MANAGER">Project Manager (PM)</option>
                  <option value="ADMIN">Administrator (Full Admin Access)</option>
                </select>
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
                disabled={updateUserMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-755 text-white"
              >
                {updateUserMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-rose-500 flex items-center gap-2 font-bold">
              Delete User Account?
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-2">
              Are you sure you want to permanently delete user{' '}
              <strong className="text-slate-100">{deletingUserEmail}</strong>? This action cannot
              be undone and will purge their membership.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              className="hover:bg-slate-800 text-slate-450 hover:text-slate-100 border-none animate-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirmation Dialog */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-purple-400 flex items-center gap-2 font-bold">
              Reset User Password?
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-2">
              Are you sure you want to require a password reset for{' '}
              <strong className="text-slate-100">{resettingUser?.email}</strong>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsResetOpen(false);
                setResettingUser(null);
              }}
              className="hover:bg-slate-800 text-slate-450 hover:text-slate-100 border-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => {
                if (resettingUser) {
                  resetPasswordMutation.mutate(resettingUser.id);
                }
                setIsResetOpen(false);
                setResettingUser(null);
              }}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Logs Modal Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-indigo-400 flex items-center gap-2 font-bold">
              Audit Logs: {selectedUser?.email}
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-1">
              Audit trail of operations logged for this user.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 overflow-y-auto max-h-[350px] pr-2 text-slate-200">
            {activitiesLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm italic">
                No activity logs recorded.
              </div>
            ) : (
              <div className="relative pl-5 border-l border-slate-850 space-y-6">
                {activities.map((act) => (
                  <div key={act.id} className="relative">
                    <span className="absolute -left-[26px] top-1.5 bg-slate-900 border border-slate-850 rounded-full p-1 h-3.5 w-3.5 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-indigo-400 bg-indigo-550/10 px-2 py-0.5 rounded border border-indigo-500/10">
                          {act.action}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(act.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
