import { Project, Task } from '@nextask/types';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, Calendar, CheckCircle, Clock, Folder, Loader2, TrendingUp } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { fetchUserProjects } from '@/api/profile.api';
import { fetchMyTasks, mapPriorityToFrontend, mapStatusToFrontend } from '@/api/tasks.api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const CollaboratorDashboardView: React.FC = () => {
  // 1. Fetch collaborator's projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['collaborator-assigned-projects'],
    queryFn: fetchUserProjects,
  });

  // 2. Fetch collaborator's assigned tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['collaborator-assigned-tasks'],
    queryFn: fetchMyTasks,
  });

  // Calculations
  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;

  // Recharts status data
  const statusData = [
    { name: 'To Do', value: todoTasks },
    { name: 'In Progress', value: inProgressTasks },
    { name: 'Completed', value: completedTasks },
  ];
  const STATUS_COLORS = ['#F59E0B', '#3B82F6', '#10B981'];

  // Sort tasks by:
  // 1. Nearest due date (tasks with due dates sorted ascending, tasks without due dates placed last)
  // 2. Highest priority (HIGH = 3, MEDIUM = 2, LOW = 1) descending.
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dateDiff !== 0) return dateDiff;
    } else if (a.dueDate) {
      return -1;
    } else if (b.dueDate) {
      return 1;
    }

    const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const aPriority = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
    const bPriority = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
    return bPriority - aPriority;
  });

  const getPriorityBadgeStyle = (p: string) => {
    switch (p) {
      case 'HIGH':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'MEDIUM':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default:
        return 'bg-slate-800 text-slate-350 border-slate-700';
    }
  };

  const getStatusBadgeStyle = (s: string) => {
    switch (s) {
      case 'TODO':
        return 'bg-slate-850 text-slate-400 border-slate-700';
      case 'IN_PROGRESS':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'DONE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-800 text-slate-350 border-slate-700';
    }
  };

  const isDataLoading = projectsLoading || tasksLoading;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-slate-100 bg-transparent text-left">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight">My Workspace</h1>
        <p className="text-slate-400 mt-1 text-sm">
          A dedicated portal for executing your daily deliverables and tracking status.
        </p>
      </div>

      {isDataLoading ? (
        <div className="py-40 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <span className="text-xs font-semibold">Gathering workspace stats...</span>
        </div>
      ) : (
        <>
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Projects */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
              <div className="space-y-2">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider block">
                  Assigned Projects
                </span>
                <span className="text-3xl font-black text-slate-150 block">{totalProjects}</span>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <Folder className="w-5 h-5" />
              </div>
            </Card>

            {/* Total Assigned Tasks */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
              <div className="space-y-2">
                <span className="text-xs text-slate-455 font-bold uppercase tracking-wider block">
                  Total Tasks
                </span>
                <span className="text-3xl font-black text-slate-150 block">{totalTasks}</span>
              </div>
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <TrendingUp className="w-5 h-5" />
              </div>
            </Card>

            {/* Tasks In Progress */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
              <div className="space-y-2">
                <span className="text-xs text-slate-455 font-bold uppercase tracking-wider block">
                  In Progress
                </span>
                <span className="text-3xl font-black text-slate-150 block">{inProgressTasks}</span>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <Clock className="w-5 h-5" />
              </div>
            </Card>

            {/* Tasks Done */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
              <div className="space-y-2">
                <span className="text-xs text-slate-455 font-bold uppercase tracking-wider block">
                  Completed
                </span>
                <span className="text-3xl font-black text-slate-150 block">{completedTasks}</span>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <CheckCircle className="w-5 h-5" />
              </div>
            </Card>
          </div>

          {/* Grid Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Column */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-6 flex flex-col justify-between min-h-[350px]">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-500" />
                  Task Status Distribution
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-455">
                  Visual split of your current workload.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col justify-center items-center">
                {totalTasks === 0 ? (
                  <div className="text-center text-slate-500 text-xs italic py-10">
                    No tasks assigned yet.
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full gap-8">
                    <div className="h-40 w-40 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} innerRadius={38} outerRadius={55} dataKey="value">
                            {statusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[index]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0B0F19',
                              borderColor: '#1E293B',
                              fontSize: 10,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 text-xs">
                      {statusData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: STATUS_COLORS[idx] }}
                          />
                          <span className="text-slate-400 font-semibold">{item.name}:</span>
                          <span className="text-slate-200 font-bold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Assigned Tasks Column */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-6 lg:col-span-2 min-h-[350px] flex flex-col justify-between">
              <div>
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    My Assigned Tasks
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-455">
                    List of tasks assigned to you, prioritized and sorted by due date.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto">
                  {sortedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center gap-2">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-300">
                          No assigned tasks at the moment.
                        </p>
                        <p className="text-[10px] text-slate-500 max-w-sm">
                          You're all caught up! New assignments will appear here when they're
                          available.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {sortedTasks.slice(0, 5).map((task) => (
                        <div
                          key={task.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0"
                        >
                          <div className="space-y-1 text-left flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                                {task.title}
                              </span>
                              <Badge
                                className={`${getPriorityBadgeStyle(
                                  task.priority,
                                )} text-[9px] uppercase tracking-wider border px-2 py-0.5 rounded-full font-bold`}
                              >
                                {mapPriorityToFrontend(task.priority)}
                              </Badge>
                              <Badge
                                className={`${getStatusBadgeStyle(
                                  task.status,
                                )} text-[9px] uppercase tracking-wider border px-2 py-0.5 rounded-full font-bold`}
                              >
                                {mapStatusToFrontend(task.status)}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              Project:{' '}
                              {projects.find((p) => p.id === task.projectId)?.name ||
                                'Unknown Project'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>
                                {task.dueDate
                                  ? new Date(task.dueDate).toLocaleDateString()
                                  : 'No Target Date'}
                              </span>
                            </div>
                            <Link
                              to={`/collaborator/tasks?taskId=${task.id}`}
                              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-slate-100 text-[10px] font-bold rounded-lg transition-colors"
                            >
                              Open Task
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </div>
              {sortedTasks.length > 5 && (
                <div className="pt-4 border-t border-slate-800/60 mt-4 text-center shrink-0">
                  <Link
                    to="/collaborator/tasks"
                    className="text-xs font-semibold text-blue-400 hover:text-blue-350 transition-colors inline-flex items-center gap-1"
                  >
                    View All Tasks
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
