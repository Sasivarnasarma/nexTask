import { Comment, Project, ProjectMemberView, Task } from '@nextask/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Search,
  Send,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { createTaskAttachment, getPresignedUploadUrl, uploadFileToS3 } from '@/api/attachments.api';
import { fetchComments, postComment } from '@/api/comments.api';
import { fetchUserProjects } from '@/api/profile.api';
import { fetchProjectMembers } from '@/api/projects.api';
import { fetchTaskById, updateTask } from '@/api/tasks.api';
import { fetchMyTasks } from '@/api/tasks.api';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskCalendar } from '@/components/tasks/TaskCalendar';
import { TaskTable } from '@/components/tasks/TaskTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { extractApiError } from '@/lib/apiError';
import { useToastStore } from '@/store/toast.store';

// ─── COLLABORATOR TASKS VIEW ──────────────────────────────────────────────────
export const CollaboratorTasksView: React.FC = () => {
  const queryClient = useQueryClient();
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);
  const [searchParams] = useSearchParams();

  // View selection layout (defaults to board or query param)
  const initialLayout = searchParams.get('layout') === 'board' ? 'board' : 'board';
  const [viewMode, setViewMode] = useState<'table' | 'board' | 'calendar'>(initialLayout);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortField, setSortField] = useState<
    'title' | 'dueDate' | 'priority' | 'status' | 'updatedAt'
  >('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Selected entities for details drawer
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Comments & Attachments uploading state
  const [commentText, setCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Queries
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['collaborator-tasks-projects'],
    queryFn: fetchUserProjects,
  });

  const { data: myAssignedTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['collaborator-tasks-list'],
    queryFn: fetchMyTasks,
  });

  // Sync search query param
  useEffect(() => {
    const searchVal = searchParams.get('search');
    if (searchVal !== null) {
      setSearchQuery(searchVal);
    }
  }, [searchParams]);

  // Sync taskId search param to auto-open task details
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && myAssignedTasks.length > 0) {
      const task = myAssignedTasks.find((t) => t.id === taskId);
      if (task) {
        setSelectedTask(task);
      }
    }
  }, [searchParams, myAssignedTasks]);

  const { data: taskDetails, refetch: refetchTaskDetails } = useQuery<Task>({
    queryKey: ['collaborator-task-details', selectedTask?.id],
    queryFn: () => fetchTaskById(selectedTask!.id),
    enabled: !!selectedTask?.id,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery<Comment[]>({
    queryKey: ['collaborator-task-comments', selectedTask?.id],
    queryFn: () => fetchComments(selectedTask!.id),
    enabled: !!selectedTask?.id,
  });

  const { data: projectMembers = [] } = useQuery<ProjectMemberView[]>({
    queryKey: ['collaborator-task-project-members', selectedTask?.projectId],
    queryFn: () =>
      selectedTask ? fetchProjectMembers(selectedTask.projectId) : Promise.resolve([]),
    enabled: !!selectedTask,
  });

  // Find the manager/owner of the project
  const currentProject = projects.find((p) => p.id === selectedTask?.projectId);
  const projectManager = projectMembers.find((m) => m.role === 'PROJECT_MANAGER')?.user;

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-tasks-list'] });
      refetchTaskDetails();
      showSuccess('Task status updated successfully.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to update status.')),
  });

  const postCommentMutation = useMutation({
    mutationFn: (payload: { content: string }) => postComment(selectedTask!.id, payload),
    onSuccess: () => {
      refetchComments();
      setCommentText('');
      showSuccess('Comment added.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to post comment.')),
  });

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    postCommentMutation.mutate({ content: commentText.trim() });
  };

  // Client-side file uploading with validation checks
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;

    // File validation: maximum size 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showError('File size exceeds the limit of 10MB.');
      return;
    }

    setIsUploading(true);
    try {
      const { uploadUrl, fileKey } = await getPresignedUploadUrl({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        projectId: selectedTask.projectId,
      });

      await uploadFileToS3(uploadUrl, file);
      await createTaskAttachment(selectedTask.id, {
        filename: file.name,
        fileKey,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });

      refetchTaskDetails();
      showSuccess('Attachment uploaded successfully.');
    } catch (err) {
      showError(extractApiError(err, 'Failed to upload attachment.'));
    } finally {
      setIsUploading(false);
    }
  };

  // Filter application
  const filteredTasks = myAssignedTasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesProject = projectFilter === 'ALL' || t.projectId === projectFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    return matchesSearch && matchesProject && matchesStatus && matchesPriority;
  });

  // Sorting
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aVal: any = a[sortField] || '';
    let bVal: any = b[sortField] || '';
    if (sortField === 'dueDate') {
      aVal = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      bVal = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    } else if (sortField === 'updatedAt') {
      aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    }
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-slate-100 bg-transparent flex flex-col h-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Tasks</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Workspace for executing your assigned tasks. Transition states, post comments, or check
            targets.
          </p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
          {(['table', 'board', 'calendar'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                viewMode === mode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Assigned',
            count: myAssignedTasks.length,
            bg: 'bg-indigo-650/10 text-indigo-400',
          },
          {
            label: 'Todo Tasks',
            count: myAssignedTasks.filter((t) => t.status === 'TODO').length,
            bg: 'bg-slate-800 text-slate-300',
          },
          {
            label: 'In Progress',
            count: myAssignedTasks.filter((t) => t.status === 'IN_PROGRESS').length,
            bg: 'bg-amber-500/10 text-amber-400',
          },
          {
            label: 'Completed',
            count: myAssignedTasks.filter((t) => t.status === 'DONE').length,
            bg: 'bg-emerald-500/10 text-emerald-400',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between"
          >
            <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
            <span className={`text-sm font-black px-2.5 py-0.5 rounded-full ${stat.bg}`}>
              {stat.count}
            </span>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none w-44"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none w-36"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none w-36"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>

          {/* Sorting Field */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none w-40"
          >
            <option value="dueDate">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="status">Sort by Status</option>
            <option value="updatedAt">Sort by Last Updated</option>
          </select>

          {/* Sorting Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-slate-100 transition-colors"
          >
            {sortOrder.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Main views */}
      {tasksLoading || projectsLoading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <span className="text-xs font-semibold">Loading assigned deliverables...</span>
        </div>
      ) : (
        <div className="flex-1">
          {/* 1. Kanban Board View */}
          {viewMode === 'board' && (
            <TaskBoard
              tasks={sortedTasks}
              onTaskClick={setSelectedTask}
              onStatusChange={(taskId, newStatus) => {
                updateTaskMutation.mutate({
                  id: taskId,
                  payload: { status: newStatus },
                });
              }}
            />
          )}

          {/* 2. Table View */}
          {viewMode === 'table' && (
            <TaskTable tasks={sortedTasks} projects={projects} onTaskClick={setSelectedTask} />
          )}

          {/* 3. Calendar View */}
          {viewMode === 'calendar' && (
            <TaskCalendar tasks={sortedTasks} onTaskClick={setSelectedTask} />
          )}
        </div>
      )}

      {/* Task Details Drawer Modal */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-slate-100 p-0 overflow-hidden sm:rounded-2xl">
          <div className="flex flex-col md:flex-row h-[80vh] md:h-[600px]">
            {/* Left side: details (read-only except for status) */}
            <div className="flex-1 p-6 border-r border-slate-800 overflow-y-auto space-y-5 text-left">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      selectedTask?.priority === 'HIGH'
                        ? 'bg-red-500/10 text-red-400 border-red-500/25'
                        : 'bg-slate-800'
                    }`}
                  >
                    {selectedTask?.priority} PRIORITY
                  </Badge>
                  <span className="text-[10px] font-medium text-slate-450 italic">
                    Collaborator Workspace
                  </span>
                </div>

                <DialogTitle className="text-xl font-extrabold text-slate-100 pt-2">
                  {selectedTask?.title}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs pt-1 leading-relaxed whitespace-pre-wrap">
                  {selectedTask?.description || 'No description provided.'}
                </DialogDescription>
              </DialogHeader>

              {/* Task Dates & Project info */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                    Project
                  </span>
                  <span className="text-xs font-semibold text-slate-300 block mt-1">
                    {currentProject?.name || 'Unknown Project'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                    Assigned By
                  </span>
                  <span className="text-xs font-semibold text-slate-300 block mt-1">
                    {projectManager
                      ? `${projectManager.name || projectManager.email}`
                      : 'Project Manager'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-4">
                <div>
                  <span className="text-[10px] text-slate-550 font-bold block uppercase tracking-wider">
                    Due Date
                  </span>
                  <span className="text-xs font-semibold text-slate-300 block mt-1 flex items-center gap-1">
                    <CalendarIcon size={12} className="text-slate-500" />
                    {selectedTask?.dueDate
                      ? new Date(selectedTask.dueDate).toLocaleDateString()
                      : 'No Target Date'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-550 font-bold block uppercase tracking-wider">
                    Update Status
                  </span>
                  {selectedTask && (
                    <select
                      value={selectedTask.status}
                      onChange={(e) =>
                        updateTaskMutation.mutate({
                          id: selectedTask.id,
                          payload: { status: e.target.value as any },
                        })
                      }
                      className="mt-1 h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none w-full"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DONE">Completed</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-2.5 border-t border-slate-800/80 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Attachments
                  </span>
                  <label className="bg-slate-950 hover:bg-slate-850 border border-slate-800/80 h-7 px-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-slate-300 transition-colors">
                    <Paperclip size={10} />
                    <span>Upload Attachment</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                {isUploading && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-550">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    <span>Uploading file (max 10MB)...</span>
                  </div>
                )}
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {taskDetails?.attachments?.map((att: any) => (
                    <div
                      key={att.id}
                      className="bg-slate-950 border border-slate-855 p-2 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <Paperclip size={12} className="text-slate-500 shrink-0" />
                        <span className="text-[11px] text-slate-300 truncate max-w-[200px]">
                          {att.filename}
                        </span>
                      </div>
                      {att.presignedUrl && (
                        <a
                          href={att.presignedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                  {(!taskDetails?.attachments || taskDetails.attachments.length === 0) && (
                    <p className="text-[10px] text-slate-550 italic">No attachments uploaded.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Comments Stream */}
            <div className="w-full md:w-80 bg-slate-950/20 flex flex-col h-full border-t md:border-t-0 md:border-l border-slate-800">
              <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-955/40">
                <MessageSquare size={16} className="text-blue-500" />
                <h4 className="font-bold text-xs tracking-wider uppercase text-slate-400">
                  Task Comments
                </h4>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[300px] md:max-h-none text-left">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-slate-900 border border-slate-855 p-3 rounded-xl"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-blue-400 block truncate max-w-[120px]">
                        {comment.author?.name || comment.author?.email}
                      </span>
                      <span className="text-[8px] text-slate-500 font-medium">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed word-break-all">
                      {comment.content}
                    </p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center py-10 text-[10px] text-slate-600 italic">
                    No comments posted yet.
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-955/40 flex flex-col gap-2">
                <textarea
                  placeholder="Add a comment... (required)"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full h-16 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none resize-none focus:ring-1 focus:ring-blue-500"
                />
                <Button
                  size="sm"
                  onClick={handleSendComment}
                  disabled={postCommentMutation.isPending || !commentText.trim()}
                  className="self-end bg-blue-600 hover:bg-blue-700 text-white text-[10px] rounded-lg h-7 font-bold flex items-center gap-1"
                >
                  <Send size={10} /> Send
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
