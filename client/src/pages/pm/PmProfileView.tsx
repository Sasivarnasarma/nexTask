import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Lock, Mail, Shield, User, Camera } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { changePassword, getProfile, updateProfile } from '@/api/profile.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToastStore } from '@/store/toast.store';
import { extractApiError } from '@/lib/apiError';
import { useAuthStore } from '@/store/auth.store';

export const PmProfileView: React.FC = () => {
  const queryClient = useQueryClient();
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);
  const updateUserStore = useAuthStore((s) => s.updateUser);

  // Profile Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Password Change Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch Profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['pm-profile-me'],
    queryFn: getProfile,
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['pm-profile-me'], updatedUser);
      updateUserStore(updatedUser);
      showSuccess('Profile updated successfully.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to update profile.')),
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      showSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to change password.')),
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateProfileMutation.mutate({ name: name.trim() });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('Please fill out all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters.');
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword, confirmNewPassword: confirmPassword });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full text-slate-100 bg-transparent text-left">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight">Account Profile</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Update name metadata, profile avatar simulation, and authentication password.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-xs font-semibold">Reading user settings...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left profile card */}
          <Card className="bg-slate-900 border-slate-805 rounded-2xl overflow-hidden p-5 flex flex-col items-center text-center">
            <div className="relative group">
              <div className="h-20 w-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-3xl shadow-xl shadow-blue-500/10">
                {profile?.name?.charAt(0).toUpperCase() || 'P'}
              </div>
              <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={18} className="text-white" />
              </div>
            </div>
            <h3 className="text-sm font-semibold mt-4 text-slate-200">{profile?.name || 'Project Manager'}</h3>
            <span className="text-[10px] text-slate-500 mt-1 block">{profile?.email}</span>
            <div className="w-full h-px bg-slate-800/60 my-4" />
            <div className="w-full space-y-3 text-left">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Shield size={14} className="text-blue-500" />
                <span className="font-semibold text-slate-350">Workspace Role:</span>
                <span className="text-slate-250 font-bold">{profile?.role}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Mail size={14} className="text-blue-500" />
                <span className="font-semibold text-slate-350">Account Status:</span>
                <span className="text-emerald-450 font-bold">Active</span>
              </div>
            </div>
          </Card>

          {/* Right form sections */}
          <div className="md:col-span-2 space-y-6">
            {/* General Info */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-6">
              <CardHeader className="p-0 pb-4 flex flex-row items-center gap-2.5">
                <User className="text-blue-500 w-4 h-4" />
                <div>
                  <CardTitle className="text-sm font-semibold">General Information</CardTitle>
                  <CardDescription className="text-[10px] text-slate-455 mt-0.5">Customize your displayed account name.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Display Name</label>
                    <Input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Email Address (Read Only)</label>
                    <Input
                      disabled
                      value={email}
                      className="bg-slate-955 border-slate-850 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs h-9 px-4 self-end"
                  >
                    {updateProfileMutation.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                    Save Details
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-6">
              <CardHeader className="p-0 pb-4 flex flex-row items-center gap-2.5">
                <Lock className="text-blue-500 w-4 h-4" />
                <div>
                  <CardTitle className="text-sm font-semibold">Change Password</CardTitle>
                  <CardDescription className="text-[10px] text-slate-455 mt-0.5">Modify the authentication password for security.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Current Password</label>
                    <Input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">New Password</label>
                      <Input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">Confirm New Password</label>
                      <Input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-755 text-white font-semibold rounded-xl text-xs h-9 px-4 self-end"
                  >
                    {changePasswordMutation.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
