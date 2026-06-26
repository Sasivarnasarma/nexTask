import { useQuery } from '@tanstack/react-query';
import {
  BarChart2,
  Download,
  Loader2,
  TrendingUp,
  Clock,
  AlertCircle,
} from 'lucide-react';
import React from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { fetchUserProjects } from '@/api/profile.api';
import { fetchProjectMembers } from '@/api/projects.api';
import { fetchTasks } from '@/api/tasks.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Project, Task, ProjectMemberView } from '@nextask/types';

export const PmReportsView: React.FC = () => {
  // 1. Fetch PM's projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['pm-reports-projects-list'],
    queryFn: fetchUserProjects,
  });

  // 2. Fetch Tasks for all projects
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['pm-reports-all-tasks', projects.map((p) => p.id).join(',')],
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

  // 3. Fetch unique team members
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery<ProjectMemberView[]>({
    queryKey: ['pm-reports-unique-members', projects.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (projects.length === 0) return [];
      const memberPromises = projects.map((p) =>
        fetchProjectMembers(p.id).catch(() => [] as ProjectMemberView[])
      );
      const results = await Promise.all(memberPromises);
      const allMembers = results.flat();
      const seen = new Set<string>();
      return allMembers.filter((m) => {
        if (seen.has(m.userId)) return false;
        seen.add(m.userId);
        return true;
      });
    },
    enabled: projects.length > 0,
  });

  // Calculations for stats
  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const activeTasks = tasks.filter((t) => t.status !== 'DONE').length;
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'DONE' || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  // Recharts: Project Progress rates
  const projectProgressData = projects.map((p) => {
    const projTasks = tasks.filter((t) => t.projectId === p.id);
    const total = projTasks.length;
    const completed = projTasks.filter((t) => t.status === 'DONE').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      name: p.name.length > 15 ? p.name.substring(0, 12) + '...' : p.name,
      Progress: rate,
    };
  });

  // Recharts: Tasks by Status
  const statusData = [
    { name: 'To Do', value: tasks.filter((t) => t.status === 'TODO').length },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'IN_PROGRESS').length },
    { name: 'Completed', value: tasks.filter((t) => t.status === 'DONE').length },
  ];
  const STATUS_COLORS = ['#F59E0B', '#3B82F6', '#10B981'];

  // Recharts: Team Workload (Active tasks per user)
  const workloadData = teamMembers.map((m) => {
    const activeAssignedCount = tasks.filter(
      (t) => t.assignees?.some((a: any) => a.userId === m.userId) && t.status !== 'DONE'
    ).length;
    return {
      name: m.user.name || m.user.email,
      'Active Tasks': activeAssignedCount,
    };
  });

  // Export report to CSV helper
  const handleExportCSV = () => {
    if (tasks.length === 0) return;
    const headers = ['Task ID', 'Project ID', 'Title', 'Priority', 'Status', 'Due Date', 'Created At'];
    const rows = tasks.map((t) => [
      t.id,
      t.projectId,
      `"${t.title.replace(/"/g, '""')}"`,
      t.priority,
      t.status,
      t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A',
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PM_Workspace_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isDataLoading = projectsLoading || tasksLoading || membersLoading;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-slate-100 bg-transparent">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Performance Analytics</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Examine task velocities, priority spreads, team workloads, and export compiled spreadsheets.
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={tasks.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 py-2.5"
        >
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {isDataLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-xs font-semibold">Compiling workspace statistics...</span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Managed Boards', value: totalProjects, icon: TrendingUp, color: 'text-indigo-400' },
              { label: 'Active Tasks', value: activeTasks, icon: Clock, color: 'text-amber-400' },
              { label: 'Completed Deliverables', value: completedTasks, icon: BarChart2, color: 'text-emerald-400' },
              { label: 'Overdue Items', value: overdueTasks, icon: AlertCircle, color: 'text-red-500' },
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

          {/* Charts Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Progress Rates */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl p-5">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-sm font-semibold">Project Completion Speed</CardTitle>
                <CardDescription className="text-xs text-slate-450">Percentage of tasks resolved per board.</CardDescription>
              </CardHeader>
              <CardContent className="h-64 p-0">
                {projectProgressData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">No active projects.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectProgressData} margin={{ left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8 }} />
                      <Bar dataKey="Progress" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Task Completion Share */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl p-5">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-sm font-semibold">Task Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-64 p-0 flex flex-col justify-between">
                {totalTasks === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">No tasks found.</div>
                ) : (
                  <>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                             {statusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-around text-xs font-semibold">
                      {statusData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[i] }} />
                          <span className="text-slate-400">{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Workload Distribution */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl p-5 lg:col-span-2">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-sm font-semibold">Teammate Workload Spread</CardTitle>
                <CardDescription className="text-xs text-slate-450">Active tickets currently handled by team members.</CardDescription>
              </CardHeader>
              <CardContent className="h-64 p-0">
                {workloadData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">No members found.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workloadData} margin={{ left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8 }} />
                      <Bar dataKey="Active Tasks" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
