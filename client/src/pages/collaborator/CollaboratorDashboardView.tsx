import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  CheckCircle,
  Clock,
  Folder,
  Loader2,
  TrendingUp,
  AlertCircle,
  BarChart2,
} from 'lucide-react';
import React from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { fetchUserProjects } from '@/api/profile.api';
import { fetchMyTasks } from '@/api/tasks.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project, Task } from '@nextask/types';

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

  // Upcoming deadlines (chronological sort of active/undone tasks with due dates)
  const upcomingTasks = tasks
    .filter((t) => t.status !== 'DONE' && t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

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
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider block">Assigned Projects</span>
                <span className="text-3xl font-black text-slate-150 block">{totalProjects}</span>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <Folder className="w-5 h-5" />
              </div>
            </Card>

            {/* Total Assigned Tasks */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
              <div className="space-y-2">
                <span className="text-xs text-slate-455 font-bold uppercase tracking-wider block">Total Tasks</span>
                <span className="text-3xl font-black text-slate-150 block">{totalTasks}</span>
              </div>
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <TrendingUp className="w-5 h-5" />
              </div>
            </Card>

            {/* Tasks In Progress */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
              <div className="space-y-2">
                <span className="text-xs text-slate-455 font-bold uppercase tracking-wider block">In Progress</span>
                <span className="text-3xl font-black text-slate-150 block">{inProgressTasks}</span>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <Clock className="w-5 h-5" />
              </div>
            </Card>

            {/* Tasks Done */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
              <div className="space-y-2">
                <span className="text-xs text-slate-455 font-bold uppercase tracking-wider block">Completed</span>
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
                <CardDescription className="text-[10px] text-slate-455">Visual split of your current workload.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col justify-center items-center">
                {totalTasks === 0 ? (
                  <div className="text-center text-slate-500 text-xs italic py-10">No tasks assigned yet.</div>
                ) : (
                  <div className="flex items-center justify-center w-full gap-8">
                    <div className="h-40 w-40 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            innerRadius={38}
                            outerRadius={55}
                            dataKey="value"
                          >
                            {statusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[index]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 text-xs">
                      {statusData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[idx] }} />
                          <span className="text-slate-400 font-semibold">{item.name}:</span>
                          <span className="text-slate-200 font-bold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Deadlines Column */}
            <Card className="bg-slate-900 border-slate-805 rounded-2xl p-6 lg:col-span-2 min-h-[350px] flex flex-col">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Upcoming Deliverables
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-455">Chronological warning of approaching task dates.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                {upcomingTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-xs italic gap-2">
                    <AlertCircle className="w-5 h-5 text-slate-600" />
                    No upcoming deadlines found.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {upcomingTasks.map((task) => {
                      const daysLeft = Math.ceil(
                        (new Date(task.dueDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
                      const isOverdue = daysLeft < 0;

                      return (
                        <div key={task.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                          <div className="space-y-1 pr-4 text-left">
                            <span className="text-xs font-semibold text-slate-200 line-clamp-1">{task.title}</span>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              Project: {projects.find((p) => p.id === task.projectId)?.name || 'Unknown Project'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {new Date(task.dueDate!).toLocaleDateString()}
                            </span>
                            <Badge
                              className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                                isOverdue
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : daysLeft <= 2
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-slate-800 text-slate-350 border-slate-700'
                              }`}
                            >
                              {isOverdue ? 'Overdue' : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
