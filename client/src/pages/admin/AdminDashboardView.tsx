import { Task, UserActivityResponse } from '@nextask/types';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  BarChart2,
  CheckCircle,
  Folder,
  Loader2,
  UserCheck,
  Users,
} from 'lucide-react';
import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { fetchAllProjects } from '@/api/projects.api';
import { fetchTasks } from '@/api/tasks.api';
import { getUserActivity, listUsers } from '@/api/users.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const AdminDashboardView: React.FC = () => {
  // 1. Fetch Users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: () => listUsers(1, 100), // Get users for calculation
  });

  // 2. Fetch Projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['admin-all-projects'],
    queryFn: fetchAllProjects,
  });

  // 3. Fetch Tasks for all projects
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['admin-all-tasks', projects.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (projects.length === 0) return [];
      const tasksPromises = projects.map((p) =>
        fetchTasks(p.id).catch((err) => {
          console.error(`Failed to fetch tasks for project ${p.id}:`, err);
          return [] as Task[];
        }),
      );
      const results = await Promise.all(tasksPromises);
      return results.flat();
    },
    enabled: projects.length > 0,
  });

  // 4. Fetch User Activities (Aggregate top users)
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['admin-all-activities', usersData?.users.map((u) => u.id).join(',')],
    queryFn: async () => {
      const users = usersData?.users || [];
      if (users.length === 0) return [];
      // Take top 5 users activity to show aggregate system logs
      const activityPromises = users.slice(0, 5).map((u) =>
        getUserActivity(u.id).catch((err) => {
          console.error(`Failed to fetch activity for user ${u.id}:`, err);
          return [] as UserActivityResponse[];
        }),
      );
      const results = await Promise.all(activityPromises);
      const allActivities = results.flat();
      // Deduplicate and sort
      const seen = new Set<string>();
      const deduped = allActivities.filter((act) => {
        if (seen.has(act.id)) return false;
        seen.add(act.id);
        return true;
      });
      return deduped.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    },
    enabled: !!usersData && usersData.users.length > 0,
  });

  // Calculations
  const totalUsers = usersData?.total || 0;
  const activeUsers = usersData?.users.filter((u) => u.isActive).length || 0;
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length || 0;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const pendingTasks = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== 'DONE',
  ).length;

  const projectProgressRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Chart Formats
  const statusData = [
    { name: 'To Do', value: tasks.filter((t) => t.status === 'TODO').length },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'IN_PROGRESS').length },
    { name: 'Completed', value: completedTasks },
  ];

  const priorityData = [
    { name: 'Low', count: tasks.filter((t) => t.priority === 'LOW').length },
    { name: 'Medium', count: tasks.filter((t) => t.priority === 'MEDIUM').length },
    { name: 'High', count: tasks.filter((t) => t.priority === 'HIGH').length },
  ];

  const roleData = [
    { name: 'Admin', value: usersData?.users.filter((u) => u.role === 'ADMIN').length || 0 },
    {
      name: 'Project Manager',
      value: usersData?.users.filter((u) => u.role === 'PROJECT_MANAGER').length || 0,
    },
    {
      name: 'Collaborator',
      value: usersData?.users.filter((u) => u.role === 'COLLABORATOR').length || 0,
    },
  ];

  const COLORS = ['#F59E0B', '#3B82F6', '#10B981'];
  const ROLE_COLORS = ['#6366F1', '#A855F7', '#EC4899'];

  const isDataLoading = usersLoading || projectsLoading || tasksLoading;

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full text-slate-100 bg-transparent">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Overview</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Monitor real-time system performance, user statuses, platform activities, and health.
          </p>
        </div>
      </div>

      {isDataLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Gathering platform analytics...</span>
        </div>
      ) : (
        <>
          {/* Section 1 — System Summary Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-indigo-400' },
              { label: 'Active Users', value: activeUsers, icon: UserCheck, color: 'text-emerald-400' },
              { label: 'Total Projects', value: totalProjects, icon: Folder, color: 'text-blue-400' },
              { label: 'Active Projects', value: activeProjects, icon: Activity, color: 'text-purple-400' },
              { label: 'Total Tasks', value: totalTasks, icon: BarChart2, color: 'text-cyan-400' },
              { label: 'Completed Tasks', value: completedTasks, icon: CheckCircle, color: 'text-green-400' },
              { label: 'Pending Tasks', value: pendingTasks, icon: AlertCircle, color: 'text-amber-400' },
              { label: 'Overdue Tasks', value: overdueTasks, icon: AlertCircle, color: 'text-rose-450 font-bold' },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/85 transition-all shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs md:text-sm text-slate-400 font-medium">{card.label}</span>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">
                    {card.value}
                  </h3>
                </div>
              );
            })}
          </div>

          {/* Section 2 — Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Status Distribution */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Task Statuses</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Proportion of task completions.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        color: '#f8fafc',
                        borderRadius: '0.75rem',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(val) => <span className="text-xs text-slate-300">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Task Priority Distribution */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Task Priorities</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Distribution of workload urgency.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        color: '#f8fafc',
                        borderRadius: '0.75rem',
                      }}
                    />
                    <Bar dataKey="count" fill="#38bdf8" name="Tasks" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Roles */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">User Role Distribution</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Breakdown of accounts in the workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {roleData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        color: '#f8fafc',
                        borderRadius: '0.75rem',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="square"
                      formatter={(val) => <span className="text-xs text-slate-300">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* System Progress Rating */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Total Platform Progress</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Overall platform completion rate.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col justify-center items-center h-56">
                <div className="relative flex items-center justify-center">
                  <svg className="w-36 h-36">
                    <circle
                      className="text-slate-800"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="72"
                      cy="72"
                    />
                    <circle
                      className="text-indigo-500"
                      strokeWidth="10"
                      strokeDasharray={364}
                      strokeDashoffset={364 - (364 * projectProgressRate) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="72"
                      cy="72"
                    />
                  </svg>
                  <span className="absolute text-3xl font-extrabold text-white">
                    {projectProgressRate}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-4 text-center">
                  {completedTasks} of {totalTasks} tasks completed across all projects
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Section 3 — Recent Activities */}
          <Card className="bg-slate-900 border-slate-800/80 text-slate-100">
            <CardHeader className="border-b border-slate-800/60">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" /> Recent Activities
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Timeline of platform administrative audit events.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 overflow-y-auto max-h-[350px]">
              {activitiesLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm italic">
                  No activity logs recorded in the system.
                </div>
              ) : (
                <div className="relative pl-5 border-l border-slate-850 space-y-6">
                  {activities.slice(0, 10).map((act) => (
                    <div key={act.id} className="relative">
                      <span className="absolute -left-[26px] top-1.5 bg-slate-900 border border-slate-850 rounded-full p-1 h-3.5 w-3.5 flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
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
                        <p className="text-[10px] text-slate-450">
                          By: {act.user?.email || 'System'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
