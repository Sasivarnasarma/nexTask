import { Project, Task } from '@nextask/types';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, Download, FileText, Loader2 } from 'lucide-react';
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
import { listUsers } from '@/api/users.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const AdminReportsView: React.FC = () => {
  // 1. Fetch Users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-reports-users'],
    queryFn: () => listUsers(1, 100),
  });

  // 2. Fetch Projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['admin-reports-projects'],
    queryFn: fetchAllProjects,
  });

  // 3. Fetch Tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['admin-reports-tasks', projects.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (projects.length === 0) return [];
      const tasksPromises = projects.map((p) => fetchTasks(p.id).catch(() => [] as Task[]));
      const results = await Promise.all(tasksPromises);
      return results.flat();
    },
    enabled: projects.length > 0,
  });

  // Metrics
  const totalUsers = usersData?.total || 0;
  const activeUsers = usersData?.users.filter((u) => u.isActive).length || 0;
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const pendingTasks = tasks.filter(
    (t) => t.status === 'TODO' || t.status === 'IN_PROGRESS',
  ).length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== 'DONE',
  ).length;

  // Chart Data
  const statusData = [
    { name: 'To Do', value: tasks.filter((t) => t.status === 'TODO').length },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'IN_PROGRESS').length },
    { name: 'Completed', value: completedTasks },
  ];

  // Priority Data
  const priorityData = [
    { name: 'Low', count: tasks.filter((t) => t.priority === 'LOW').length },
    { name: 'Medium', count: tasks.filter((t) => t.priority === 'MEDIUM').length },
    { name: 'High', count: tasks.filter((t) => t.priority === 'HIGH').length },
  ];

  // User productivity: count of tasks assigned per user
  const userProductivityMap: Record<string, number> = {};
  tasks.forEach((t) => {
    if (t.assignees && t.assignees.length > 0) {
      t.assignees.forEach((assignee) => {
        const name = assignee.name || assignee.email;
        userProductivityMap[name] = (userProductivityMap[name] || 0) + 1;
      });
    }
  });
  const productivityData = Object.entries(userProductivityMap).map(([name, count]) => ({
    name,
    count,
  }));

  const COLORS = ['#F59E0B', '#3B82F6', '#10B981'];

  // Exports
  const exportCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Users', totalUsers],
      ['Active Users', activeUsers],
      ['Total Projects', totalProjects],
      ['Active Projects', activeProjects],
      ['Total Tasks', totalTasks],
      ['Completed Tasks', completedTasks],
      ['Pending Tasks', pendingTasks],
      ['Overdue Tasks', overdueTasks],
    ];

    let csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `nexTask_System_Report_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers,
        activeUsers,
        totalProjects,
        activeProjects,
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
      },
      taskStatuses: statusData,
      taskPriorities: priorityData,
      userAllocations: productivityData,
    };

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute(
      'download',
      `nexTask_System_Report_${new Date().toISOString().split('T')[0]}.json`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = usersLoading || projectsLoading || tasksLoading;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-slate-100 bg-transparent">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <BarChart2 className="h-8 w-8 text-indigo-400" /> Platform Reports
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Generate and export system-wide performance, project progressions, and task statuses
            reports.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={exportCSV}
            disabled={isLoading || totalProjects === 0}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs px-4 py-2 flex items-center gap-2 rounded-xl"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            onClick={exportJSON}
            disabled={isLoading || totalProjects === 0}
            className="bg-indigo-600 hover:bg-indigo-755 text-white text-xs px-4 py-2 flex items-center gap-2 rounded-xl"
          >
            <FileText className="w-4 h-4" /> Export JSON
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Compiling system summaries...</span>
        </div>
      ) : (
        <>
          {/* 2. Statistics Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: 'Platform Users', value: totalUsers, sub: `${activeUsers} active accounts` },
              {
                label: 'Boards Administered',
                value: totalProjects,
                sub: `${activeProjects} active boards`,
              },
              {
                label: 'Total Tasks Created',
                value: totalTasks,
                sub: `${completedTasks} closed tasks`,
              },
              { label: 'Urgent Overdue Tasks', value: overdueTasks, sub: 'Needs attention' },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-sm"
              >
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  {card.label}
                </span>
                <h3 className="text-3xl font-extrabold mt-3 tracking-tight">{card.value}</h3>
                <p className="text-xs text-slate-450 mt-1.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* 3. Charts Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Pie Chart */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Task Status Analysis</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Proportion of To Do, In Progress, and Completed tasks platform-wide.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
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

            {/* Task Priority Distribution Bar Chart */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Urgency Classification</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Task priority breakdown across all active project boards.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
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
                    <Bar dataKey="count" fill="#4f46e5" name="Urgent Tasks" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Team Productivity & Resource Allocations */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Team Allocation & Workload
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Quantity of tasks allocated per active team member.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {productivityData.length === 0 ? (
                  <div className="flex justify-center items-center h-full text-slate-500 italic text-sm">
                    No assignments found to build workloads chart.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productivityData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" allowDecimals={false} stroke="#64748b" fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={11}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          color: '#f8fafc',
                          borderRadius: '0.75rem',
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#10b981"
                        name="Assigned Tasks"
                        radius={[0, 4, 4, 0]}
                      />
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
