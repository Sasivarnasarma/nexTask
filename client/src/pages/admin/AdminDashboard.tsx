import {
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  User,
  UserActivityResponse,
  UserRole,
} from '@nextask/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit,
  History,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';

import {
  activateUser,
  createUser,
  deactivateUser,
  deleteUser,
  getUserActivity,
  listUsers,
  updateUser,
} from '@/api/users.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

interface UserActivity extends UserActivityResponse {
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  task: {
    id: string;
    title: string;
  } | null;
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);

  // States
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected User for Audit/Logs
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // User Forms State
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('COLLABORATOR');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingUserEmail, setDeletingUserEmail] = useState('');

  // Fetch Users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', page, searchQuery],
    queryFn: () => listUsers(page, limit, searchQuery),
    enabled: currentUser?.role === 'ADMIN',
  });

  // Fetch Activities for selected user
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<UserActivity[]>({
    queryKey: ['admin-user-activities', selectedUserId],
    queryFn: () =>
      selectedUserId
        ? (getUserActivity(selectedUserId) as Promise<UserActivity[]>)
        : Promise.resolve([]),
    enabled: currentUser?.role === 'ADMIN' && !!selectedUserId && activeTab === 'audit',
  });

  // Mutations
  const createUserMutation = useMutation<
    { user: User; tempPassword?: string },
    unknown,
    AdminCreateUserRequest
  >({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsCreateOpen(false);
      showSuccess('User account created successfully! Credentials have been sent to their email.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to create user.'));
    },
  });

  const updateUserMutation = useMutation<
    User,
    unknown,
    { id: string; payload: AdminUpdateUserRequest }
  >({
    mutationFn: ({ id, payload }) => updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsEditOpen(false);
      showSuccess('User details updated successfully!');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to update user.'));
    },
  });

  const deactivateMutation = useMutation<User, unknown, string>({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showSuccess('User account deactivated successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to deactivate user.'));
    },
  });

  const activateMutation = useMutation<User, unknown, string>({
    mutationFn: activateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showSuccess('User account activated successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to activate user.'));
    },
  });

  const deleteMutation = useMutation<void, unknown, string>({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsDeleteOpen(false);
      showSuccess('User deleted successfully.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to delete user.'));
    },
  });

  if (currentUser?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

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

  const viewAuditLogs = (user: User) => {
    setSelectedUserId(user.id);
    setSelectedUserEmail(user.email);
    setActiveTab('audit');
  };

  return (
    <div className="flex-1 space-y-6 p-8 max-w-7xl mx-auto w-full text-foreground bg-background">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" /> Admin Portal
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage users, assign security roles, toggle account statuses, and view audit history.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shrink-0 bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Create User
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-3 font-semibold text-sm transition-all relative ${
            activeTab === 'users'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          User Directory
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`pb-3 font-semibold text-sm transition-all relative ${
            activeTab === 'audit'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          disabled={!selectedUserId}
          title={
            !selectedUserId ? 'Select a user first from the Directory to view audit trails' : ''
          }
        >
          Audit Trails {selectedUserId && `(${selectedUserEmail})`}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'users' ? (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>User Directory</CardTitle>
              <CardDescription>A list of all users registered on the platform.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-background border-border"
              />
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm font-medium">Loading user database...</span>
              </div>
            ) : !usersData?.users.length ? (
              <div className="text-center py-12 text-muted-foreground text-sm font-medium">
                No users found.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50 border-b border-border">
                      <TableRow>
                        <TableHead className="font-semibold text-foreground">Name</TableHead>
                        <TableHead className="font-semibold text-foreground">Email</TableHead>
                        <TableHead className="font-semibold text-foreground">Role</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                        <TableHead className="font-semibold text-foreground">Created At</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData.users.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        return (
                          <TableRow key={u.id} className="hover:bg-muted/30 border-b border-border">
                            <TableCell className="font-medium text-foreground">
                              {u.name || (
                                <span className="text-muted-foreground italic">Unnamed</span>
                              )}
                              {isSelf && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 bg-muted text-muted-foreground border-none"
                                >
                                  You
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-foreground">{u.email}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  u.role === 'ADMIN'
                                    ? 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10 border-indigo-500/30'
                                    : u.role === 'PROJECT_MANAGER'
                                      ? 'bg-violet-500/10 text-violet-500 hover:bg-violet-500/10 border-violet-500/30'
                                      : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/10 border-slate-500/30'
                                }
                              >
                                {u.role.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                  }`}
                                />
                                <span
                                  className={`text-xs font-semibold ${u.isActive ? 'text-emerald-500' : 'text-amber-500'}`}
                                >
                                  {u.isActive ? 'Active' : 'Deactivated'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {new Date(u.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditModal(u)}
                                  disabled={isSelf}
                                  title="Edit Profile"
                                  className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {u.isActive ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deactivateMutation.mutate(u.id)}
                                    disabled={isSelf}
                                    title="Deactivate Account"
                                    className="h-8 w-8 hover:bg-amber-500/10 text-amber-500 disabled:opacity-30"
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => activateMutation.mutate(u.id)}
                                    disabled={isSelf}
                                    title="Activate Account"
                                    className="h-8 w-8 hover:bg-emerald-500/10 text-emerald-500 disabled:opacity-30"
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => viewAuditLogs(u)}
                                  title="View Activity Logs"
                                  className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeleteModal(u)}
                                  disabled={isSelf}
                                  title="Delete User"
                                  className="h-8 w-8 hover:bg-destructive/10 text-destructive disabled:opacity-30"
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

                {/* Pagination */}
                {usersData.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-xs text-muted-foreground">
                      Showing Page {page} of {usersData.totalPages} ({usersData.total} users total)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="bg-background border-border text-foreground hover:bg-muted"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(p + 1, usersData.totalPages))}
                        disabled={page === usersData.totalPages}
                        className="bg-background border-border text-foreground hover:bg-muted"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Audit Trails Tab */
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-5">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Audit History for {selectedUserEmail}
              </CardTitle>
              <CardDescription>
                Administrative audit trail representing operations logged for this user account.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedUserId(null)}
              className="bg-background border-border hover:bg-muted"
            >
              Clear Filter
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {activitiesLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm font-medium">Fetching activities log...</span>
              </div>
            ) : !activities.length ? (
              <div className="text-center py-12 text-muted-foreground text-sm font-medium">
                No activity logs found for this user.
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-border space-y-8 py-2">
                {activities.map((act) => (
                  <div key={act.id} className="relative">
                    {/* Timeline Node */}
                    <span className="absolute left-[31px] top-1 bg-background border-2 border-primary rounded-full p-1 h-4.5 w-4.5 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="bg-muted/30 border-border text-xs text-foreground py-0.5"
                        >
                          {act.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(act.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <p className="text-foreground text-sm font-medium">{act.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Actor:{' '}
                        <span className="font-semibold text-foreground">
                          {act.user?.email || 'Deleted User'}
                        </span>
                        {act.task && (
                          <>
                            | Associated Task:{' '}
                            <span className="font-semibold text-primary">{act.task.title}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-[425px]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Add User Account</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Set up a new team member. They will be forced to change their password on first
                login.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <Input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="bg-background border-border focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Display Name</label>
                <Input
                  placeholder="e.g. John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-background border-border focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Workspace Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-md bg-background border border-border text-sm text-foreground outline-none focus:ring-1 focus:ring-primary transition-colors"
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
                className="hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Modify User Profile</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Edit the profile information and workspace role of this account.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <Input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="bg-background border-border focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Display Name</label>
                <Input
                  placeholder="e.g. John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-background border-border focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Workspace Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-md bg-background border border-border text-sm text-foreground outline-none focus:ring-1 focus:ring-primary transition-colors"
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
                className="hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete User Account?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              Are you sure you want to permanently delete user{' '}
              <strong className="text-foreground">{deletingUserEmail}</strong>? This action cannot
              be undone and will purge their membership.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              className="hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
