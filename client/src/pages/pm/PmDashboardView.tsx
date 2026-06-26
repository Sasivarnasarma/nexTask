import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  CheckCircle,
  Clock,
  Folder,
  Loader2,
  TrendingUp,
  Users,
  AlertCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { fetchUserProjects } from '@/api/profile.api';
import { createProject, fetchProjectMembers } from '@/api/projects.api';
import { createTask, fetchTasks } from '@/api/tasks.api';
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
import { extractApiError } from '@/lib/apiError';
import { useToastStore } from '@/store/toast.store';
import { Project, Task, ProjectMemberView } from '@nextask/types';

export const PmDashboardView: React.FC = () => {
  const queryClient = useQueryClient();
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);

  // Modals state
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  // Create Project Form State
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');

  // Create Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');

  // 1. Fetch PM's projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['pm-assigned-projects'],
    queryFn: fetchUserProjects,
  });

  // 2. Fetch Tasks for all projects
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['pm-all-tasks', projects.map((p) => p.id).join(',')],
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

  // 3. Fetch unique team members
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery<ProjectMemberView[]>({
    queryKey: ['pm-all-team-members', projects.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (projects.length === 0) return [];
      const memberPromises = projects.map((p) =>
        fetchProjectMembers(p.id).catch((err) => {
          console.error(`Failed to fetch members for project ${p.id}:`, err);
          return [] as ProjectMemberView[];
        }),
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

  // Project Creation Mutation
  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-assigned-projects'] });
      setIsCreateProjectOpen(false);
      showSuccess('Project created successfully.');
      setProjectName('');
      setProjectDesc('');
      setProjectEndDate('');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to create project.'));
    },
  });

  // Task Creation Mutation
  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-all-tasks'] });
      setIsCreateTaskOpen(false);
      showSuccess('Task created successfully.');
      setTaskTitle('');
      setTaskDesc('');
      setTaskProjectId('');
      setTaskDueDate('');
      setTaskPriority('MEDIUM');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to create task.'));
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    createProjectMutation.mutate({
      name: projectName.trim(),
      description: projectDesc.trim() || undefined,
      endDate: projectEndDate ? new Date(projectEndDate).toISOString() : undefined,
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskProjectId) return;
    createTaskMutation.mutate({
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
      projectId: taskProjectId,
      priority: taskPriority,
      dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
    });
  };

  // Calculations
  const totalProjects = projects.length;
  const activeProjectsCount = projects.filter((p) => p.status === 'ACTIVE').length;
  const completedProjectsCount = projects.filter((p) => p.status === 'COMPLETED').length;

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS');
  const completedTasks = tasks.filter((t) => t.status === 'DONE');

  // Overdue and Due Today checks
  const todayStr = new Date().toDateString();
  const tasksDueToday = tasks.filter((t) => {
    if (t.status === 'DONE' || !t.dueDate) return false;
    return new Date(t.dueDate).toDateString() === todayStr;
  });

  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'DONE' || !t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  });

  // Recharts: Tasks by Status
  const statusData = [
    { name: 'To Do', value: tasks.filter((t) => t.status === 'TODO').length },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'IN_PROGRESS').length },
    { name: 'Completed', value: tasks.filter((t) => t.status === 'DONE').length },
  ];
  const STATUS_COLORS = ['#F59E0B', '#3B82F6', '#10B981'];

  // Recharts: Tasks by Priority
  const priorityData = [
    { name: 'High', value: tasks.filter((t) => t.priority === 'HIGH').length },
    { name: 'Medium', value: tasks.filter((t) => t.priority === 'MEDIUM').length },
    { name: 'Low', value: tasks.filter((t) => t.priority === 'LOW').length },
  ];
  const PRIORITY_COLORS = ['#EF4444', '#EC4899', '#6366F1'];

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



  // Recent simulated activities based on task updates
  const recentActivities = tasks
    .slice(0, 6)
    .map((task) => {
      let action = 'Task updated';
      let iconColor = 'text-blue-400';
      if (task.status === 'DONE') {
        action = `Task "${task.title}" was completed`;
        iconColor = 'text-emerald-400';
      } else if (task.status === 'IN_PROGRESS') {
        action = `Task "${task.title}" is in progress`;
        iconColor = 'text-amber-400';
      } else {
        action = `Task "${task.title}" was added`;
        iconColor = 'text-indigo-400';
      }
      return {
        id: task.id,
        action,
        time: task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : 'Just now',
        color: iconColor,
      };
    });

  // Deadlines filtering
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toDateString();

  const startOfWeek = new Date();
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const upcomingToday = tasks.filter(
    (t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate).toDateString() === todayStr
  );
  const upcomingTomorrow = tasks.filter(
    (t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate).toDateString() === tomorrowStr
  );
  const upcomingThisWeek = tasks.filter((t) => {
    if (t.status === 'DONE' || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= startOfWeek && due <= endOfWeek && due.toDateString() !== todayStr && due.toDateString() !== tomorrowStr;
  });

  const isDataLoading = projectsLoading || tasksLoading || membersLoading;

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full text-slate-100 bg-transparent">
      {/* Header */}
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight">PM Workspace Overview</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Operational cockpit for project schedules, task status, team capacity, and metrics.
        </p>
      </div>

      {isDataLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-slate-450">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <span className="text-sm font-medium">Analyzing manager workspace metrics...</span>
        </div>
      ) : (
        <>
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              {
                label: 'Assigned Projects',
                value: totalProjects,
                detail: `${activeProjectsCount} Active, ${completedProjectsCount} Completed`,
                icon: Folder,
                color: 'text-indigo-400',
              },
              {
                label: 'Active Tasks',
                value: activeTasks.length,
                detail: 'Work in progress',
                icon: Clock,
                color: 'text-amber-400',
              },
              {
                label: 'Completed Tasks',
                value: completedTasks.length,
                detail: 'Ready and delivered',
                icon: CheckCircle,
                color: 'text-emerald-400',
              },
              {
                label: 'Due Today',
                value: tasksDueToday.length,
                detail: 'Require action now',
                icon: AlertCircle,
                color: 'text-rose-455',
              },
              {
                label: 'Overdue Tasks',
                value: overdueTasks.length,
                detail: 'Past target deadline',
                icon: AlertCircle,
                color: 'text-red-500',
              },
              {
                label: 'Team Members',
                value: teamMembers.length,
                detail: 'Collaborators total',
                icon: Users,
                color: 'text-blue-400',
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 font-semibold">{card.label}</span>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-extrabold tracking-tight">{card.value}</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">{card.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Analytical Visualizers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Progress */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl p-4 lg:col-span-2">
              <CardHeader className="p-2 pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" /> Project Completion Rates (%)
                </CardTitle>
                <CardDescription className="text-xs text-slate-450">
                  Overall progress based on completed tasks versus total tasks.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 p-0">
                {projectProgressData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                    No active projects assigned.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectProgressData} margin={{ left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8 }}
                        labelStyle={{ color: '#F1F5F9', fontWeight: 'bold', fontSize: 11 }}
                      />
                      <Bar dataKey="Progress" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                        {projectProgressData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3B82F6' : '#6366F1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Task Status Share */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl p-4">
              <CardHeader className="p-2 pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Tasks by Status
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64 p-0 flex flex-col justify-between">
                {totalTasks === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                    No tasks to analyze.
                  </div>
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
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8 }}
                          />
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tasks by Priority */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl p-5">
              <CardHeader className="p-2 pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-455" /> Task Priority Distributions
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64 p-0 flex flex-col justify-between">
                {totalTasks === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                    No priority levels loaded.
                  </div>
                ) : (
                  <>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={priorityData}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                             {priorityData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-around text-xs font-semibold">
                      {priorityData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[i] }} />
                          <span className="text-slate-400">{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Recent activity log */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl p-5">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-sm font-semibold">Workspace Execution Stream</CardTitle>
                <CardDescription className="text-xs text-slate-450">
                  Live updates reflecting PM and team activity on board tasks.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {recentActivities.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs italic">
                    No recent events logged.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((act) => (
                      <div key={act.id} className="flex items-start gap-3 border-b border-slate-850 pb-3 last:border-0 last:pb-0">
                        <div className={`mt-1 font-bold ${act.color} text-xs`}>●</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">{act.action}</p>
                          <span className="text-[10px] text-slate-500">{act.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming deadlines */}
            <Card className="bg-slate-900 border-slate-800/80 text-slate-100 rounded-2xl p-5">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-450" /> Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                {/* Today */}
                <div>
                  <h4 className="text-xs font-semibold text-rose-455 mb-2">Today</h4>
                  {upcomingToday.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic pl-2">No deadlines today</p>
                  ) : (
                    <ul className="space-y-1.5 pl-2">
                      {upcomingToday.map((t) => (
                        <li key={t.id} className="text-xs text-slate-350 truncate">
                          • {t.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Tomorrow */}
                <div>
                  <h4 className="text-xs font-semibold text-amber-400 mb-2">Tomorrow</h4>
                  {upcomingTomorrow.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic pl-2">No deadlines tomorrow</p>
                  ) : (
                    <ul className="space-y-1.5 pl-2">
                      {upcomingTomorrow.map((t) => (
                        <li key={t.id} className="text-xs text-slate-350 truncate">
                          • {t.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* This Week */}
                <div>
                  <h4 className="text-xs font-semibold text-indigo-400 mb-2">This Week</h4>
                  {upcomingThisWeek.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic pl-2">No deadlines this week</p>
                  ) : (
                    <ul className="space-y-1.5 pl-2">
                      {upcomingThisWeek.map((t) => (
                        <li key={t.id} className="text-xs text-slate-350 truncate">
                          • {t.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>Create Project Board</DialogTitle>
              <DialogDescription className="text-slate-400">
                Setup a new project team board.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-slate-200">
              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Project Name</label>
                <Input
                  required
                  placeholder="e.g. Project Launch"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  placeholder="Briefly describe what this project targets..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full min-h-20 p-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">End Date</label>
                <Input
                  type="date"
                  value={projectEndDate}
                  onChange={(e) => setProjectEndDate(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateProjectOpen(false)}
                className="hover:bg-slate-800 text-slate-400 hover:text-slate-100 border-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
              >
                {createProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
          <form onSubmit={handleCreateTask}>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription className="text-slate-400">
                Add a new task to one of your assigned project boards.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-slate-200">
              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Project Board</label>
                <select
                  required
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Task Title</label>
                <Input
                  required
                  placeholder="e.g. Design Login Page"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  placeholder="Scope details, links, or expectations..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full min-h-20 p-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Due Date</label>
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateTaskOpen(false)}
                className="hover:bg-slate-800 text-slate-400 hover:text-slate-100 border-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
              >
                {createTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
