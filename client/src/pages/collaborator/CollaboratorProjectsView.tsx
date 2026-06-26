import { useQuery } from '@tanstack/react-query';
import {
  Folder,
  Calendar,
  Users,
  Loader2,
  Paperclip,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import React, { useState } from 'react';
import { fetchUserProjects } from '@/api/profile.api';
import { fetchProjectMembers } from '@/api/projects.api';
import { fetchTasks } from '@/api/tasks.api';
import { useAuthStore } from '@/store/auth.store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const CollaboratorProjectsView: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'files'>('overview');

  // 1. Fetch user's member projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['collaborator-projects-view'],
    queryFn: fetchUserProjects,
  });

  // 2. Fetch tasks across all member projects to calculate progress rates
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['collaborator-projects-tasks', projects.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (projects.length === 0) return [];
      const promises = projects.map((p) =>
        fetchTasks(p.id).catch(() => [])
      );
      const results = await Promise.all(promises);
      return results.flat();
    },
    enabled: projects.length > 0,
  });

  // 3. Fetch project members of the selected project
  const { data: selectedProjectMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['collaborator-project-members', selectedProject?.id],
    queryFn: () => fetchProjectMembers(selectedProject!.id),
    enabled: !!selectedProject?.id,
  });

  const isDataLoading = projectsLoading || tasksLoading;

  // Selected project tasks assigned to user
  const selectedProjectMyTasks = allTasks.filter(
    (t) => t.projectId === selectedProject?.id && t.assignees?.some((a: any) => a.userId === user?.id)
  );

  // Selected project attachments (flattened from all tasks in project)
  const selectedProjectAttachments = allTasks
    .filter((t) => t.projectId === selectedProject?.id)
    .flatMap((t) => (t.attachments || []).map((att) => ({ ...att, taskTitle: t.title })));

  // Selected project manager
  const projectManager = selectedProjectMembers.find((m) => m.role === 'PROJECT_MANAGER')?.user;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-slate-100 bg-transparent">
      {selectedProject ? (
        // Project Detail Inspector Panel
        <div className="space-y-6">
          <Button
            onClick={() => {
              setSelectedProject(null);
              setActiveTab('overview');
            }}
            variant="ghost"
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-xl gap-1.5 text-xs font-semibold px-3 py-1.5 h-auto"
          >
            <ArrowLeft size={14} /> Back to Projects
          </Button>

          <div className="border-b border-slate-900 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight">{selectedProject.name}</h1>
                <Badge className="bg-blue-600/10 text-blue-400 border border-blue-500/10 uppercase tracking-widest text-[9px] font-bold">
                  {selectedProject.status}
                </Badge>
              </div>
              <p className="text-slate-400 text-xs mt-1.5 max-w-2xl leading-relaxed">
                {selectedProject.description || 'No project description provided.'}
              </p>
            </div>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
              {(['overview', 'tasks', 'files'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'tasks' ? 'My Tasks' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Contents */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800/80 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-2">Project Metadata</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">Project Manager</span>
                      <span className="text-slate-300 font-semibold block mt-1">
                        {projectManager ? `${projectManager.name || projectManager.email}` : 'Loading manager details...'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Target Delivery</span>
                      <span className="text-slate-300 font-semibold block mt-1 flex items-center gap-1">
                        <Calendar size={12} className="text-slate-500" />
                        {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-5">
                  <h3 className="text-sm font-bold text-slate-300 mb-3">Workspace Scope</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    As a Collaborator in this project workspace, you are authorized to view tasks assigned to you, post updates, comment on actions, and register file attachments. You do not have permissions to manage team members or edit project settings.
                  </p>
                </div>
              </Card>

              {/* Members List Widget */}
              <Card className="bg-slate-900/40 border-slate-800/80 rounded-2xl p-6 flex flex-col">
                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                  <Users size={16} className="text-blue-500" />
                  Team Members ({selectedProjectMembers.length})
                </h3>
                {membersLoading ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-[10px]">Retrieving team...</span>
                  </div>
                ) : (
                  <div className="space-y-3.5 overflow-y-auto max-h-64 pr-1">
                    {selectedProjectMembers.map((member) => (
                      <div key={member.userId} className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-center font-bold text-[10px] text-blue-450 shrink-0">
                          {member.user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex flex-col min-w-0 leading-none">
                          <span className="text-xs font-semibold text-slate-300 truncate">
                            {member.user.name || member.user.email}
                          </span>
                          <span className="text-[9px] text-slate-500 mt-1 uppercase font-medium">
                            {member.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === 'tasks' && (
            <Card className="bg-slate-900 border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-950/40 border-b border-slate-800/60">
                  <TableRow>
                    <TableHead className="text-slate-350 text-xs font-bold pl-6">Task Title</TableHead>
                    <TableHead className="text-slate-350 text-xs font-bold">Priority</TableHead>
                    <TableHead className="text-slate-350 text-xs font-bold">Status</TableHead>
                    <TableHead className="text-slate-350 text-xs font-bold pr-6">Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProjectMyTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-slate-550 text-xs italic">
                        No tasks assigned to you in this project.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedProjectMyTasks.map((t) => (
                      <TableRow key={t.id} className="border-b border-slate-850/60 text-left">
                        <TableCell className="font-semibold text-slate-100 pl-6 py-4">{t.title}</TableCell>
                        <TableCell>
                          <Badge className={`text-[9px] uppercase tracking-wider ${
                            t.priority === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {t.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-slate-950 border-slate-850 text-slate-300 text-[10px]">{t.status}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs pr-6">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {activeTab === 'files' && (
            <Card className="bg-slate-900 border-slate-800/80 rounded-2xl overflow-hidden p-6">
              <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                <Paperclip size={16} className="text-blue-500" />
                Project Attachments ({selectedProjectAttachments.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedProjectAttachments.map((att: any) => (
                  <div key={att.id} className="bg-slate-950 border border-slate-855/80 p-3.5 rounded-xl flex flex-col justify-between h-28">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Paperclip size={14} className="text-slate-500 shrink-0" />
                        <span className="text-xs font-semibold text-slate-300 truncate">{att.filename}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 truncate flex items-center gap-1">
                        <FileText size={10} /> Task: {att.taskTitle}
                      </p>
                    </div>
                    {att.presignedUrl && (
                      <a
                        href={att.presignedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold self-start mt-2"
                      >
                        Download File
                      </a>
                    )}
                  </div>
                ))}
                {selectedProjectAttachments.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-550 text-xs italic">
                    No attachments uploaded to any task in this project yet.
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      ) : (
        // Project Grid list
        <>
          <div className="flex items-center justify-between border-b border-slate-900 pb-5">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">My Projects</h1>
              <p className="text-slate-400 mt-1 text-sm">
                Overview of projects where you are registered as a member. Select a project to inspect files and tasks.
              </p>
            </div>
          </div>

          {isDataLoading ? (
            <div className="py-40 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <span className="text-xs font-semibold">Resolving project workspaces...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.length === 0 ? (
                <div className="col-span-full py-24 text-center border border-slate-900 rounded-2xl bg-slate-900/10">
                  <Folder className="h-10 w-10 text-slate-650 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-semibold">No assigned projects found</p>
                  <p className="text-slate-550 text-xs mt-1">You need to be added to a project by a Project Manager.</p>
                </div>
              ) : (
                projects.map((proj) => {
                  const projTasks = allTasks.filter((t) => t.projectId === proj.id);
                  const completedCount = projTasks.filter((t) => t.status === 'DONE').length;
                  const progressRate = projTasks.length > 0 ? Math.round((completedCount / projTasks.length) * 100) : 0;

                  return (
                    <Card
                      key={proj.id}
                      onClick={() => setSelectedProject(proj)}
                      className="bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/80 rounded-2xl p-5 hover:border-slate-800 transition-all cursor-pointer flex flex-col justify-between min-h-60 backdrop-blur-sm group text-left"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-base text-slate-200 group-hover:text-blue-400 transition-colors leading-tight">
                            {proj.name}
                          </h3>
                          <Badge className="bg-slate-950 border-slate-850 text-slate-400 text-[9px] uppercase tracking-wider">
                            {proj.status}
                          </Badge>
                        </div>
                        <p className="text-slate-450 text-xs line-clamp-3 leading-relaxed">
                          {proj.description || 'No project description provided.'}
                        </p>
                      </div>

                      <div className="mt-6 space-y-4 pt-4 border-t border-slate-855/50">
                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-bold tracking-wide uppercase text-slate-500">
                            <span>Project Progress</span>
                            <span>{progressRate}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${progressRate}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            Due: {proj.endDate ? new Date(proj.endDate).toLocaleDateString() : 'N/A'}
                          </span>
                          <span>{projTasks.length} tasks total</span>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
