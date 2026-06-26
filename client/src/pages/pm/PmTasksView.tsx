import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  X,
  ChevronDown,
} from 'lucide-react';
import React, { useState } from 'react';

import {
  createTaskAttachment,
  deleteAttachment,
  getPresignedUploadUrl,
  uploadFileToS3,
} from '@/api/attachments.api';
import { deleteComment, fetchComments, postComment } from '@/api/comments.api';
import { fetchUserProjects } from '@/api/profile.api';
import {
  assignTaskUser,
  fetchProjectMembers,
  unassignTaskUser,
} from '@/api/projects.api';
import {
  createTask,
  deleteTask,
  fetchTaskById,
  fetchTasks,
  updateTask,
} from '@/api/tasks.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToastStore } from '@/store/toast.store';
import { extractApiError } from '@/lib/apiError';
import { Project, Task, ProjectMemberView, Comment } from '@nextask/types';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskTable } from '@/components/tasks/TaskTable';
import { TaskCalendar } from '@/components/tasks/TaskCalendar';

// ─── PM TASKS WORKSPACE VIEW ──────────────────────────────────────────────────
export const PmTasksView: React.FC = () => {
  const queryClient = useQueryClient();
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);

  // Layout selection
  const [viewMode, setViewMode] = useState<'table' | 'board' | 'calendar'>('board');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [statusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortField] = useState<'title' | 'dueDate' | 'priority' | 'status'>('dueDate');
  const [sortOrder] = useState<'asc' | 'desc'>('asc');

  // Selected entities for drawers
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create Task Form State
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [createPriority, setCreatePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [createDueDate, setCreateDueDate] = useState('');

  // Edit Task Form State
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [editStatus, setEditStatus] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO');
  const [editDueDate, setEditDueDate] = useState('');

  // Comments & Attachments uploading state
  const [commentText, setCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Queries
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['pm-tasks-projects-list'],
    queryFn: fetchUserProjects,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['pm-tasks-board-list', projects.map((p) => p.id).join(',')],
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

  const { data: taskDetails, refetch: refetchTaskDetails } = useQuery<Task>({
    queryKey: ['pm-task-details', selectedTask?.id],
    queryFn: () => fetchTaskById(selectedTask!.id),
    enabled: !!selectedTask?.id,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery<Comment[]>({
    queryKey: ['pm-task-comments', selectedTask?.id],
    queryFn: () => fetchComments(selectedTask!.id),
    enabled: !!selectedTask?.id,
  });

  const { data: currentProjectMembers = [] } = useQuery<ProjectMemberView[]>({
    queryKey: ['pm-task-project-members', selectedTask?.projectId],
    queryFn: () => (selectedTask ? fetchProjectMembers(selectedTask.projectId) : Promise.resolve([])),
    enabled: !!selectedTask,
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-tasks-board-list'] });
      setIsCreateOpen(false);
      showSuccess('Task created.');
      setCreateTitle('');
      setCreateDesc('');
      setCreateProjectId('');
      setCreateDueDate('');
      setCreatePriority('MEDIUM');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to create task.')),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-tasks-board-list'] });
      refetchTaskDetails();
      setIsEditingTask(false);
      showSuccess('Task updated successfully.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to update task.')),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-tasks-board-list'] });
      setSelectedTask(null);
      showSuccess('Task deleted.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to delete task.')),
  });

  const assignUserMutation = useMutation({
    mutationFn: (userId: string) => assignTaskUser(selectedTask!.id, userId),
    onSuccess: () => {
      refetchTaskDetails();
      queryClient.invalidateQueries({ queryKey: ['pm-tasks-board-list'] });
      showSuccess('Teammate assigned.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to assign teammate.')),
  });

  const unassignUserMutation = useMutation({
    mutationFn: (userId: string) => unassignTaskUser(selectedTask!.id, userId),
    onSuccess: () => {
      refetchTaskDetails();
      queryClient.invalidateQueries({ queryKey: ['pm-tasks-board-list'] });
      showSuccess('Teammate unassigned.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to unassign teammate.')),
  });

  const postCommentMutation = useMutation({
    mutationFn: (payload: { content: string }) => postComment(selectedTask!.id, payload),
    onSuccess: () => {
      refetchComments();
      setCommentText('');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to post comment.')),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => refetchComments(),
    onError: (err) => showError(extractApiError(err, 'Failed to delete comment.')),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => refetchTaskDetails(),
    onError: (err) => showError(extractApiError(err, 'Failed to delete file.')),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !createProjectId) return;
    createTaskMutation.mutate({
      title: createTitle.trim(),
      description: createDesc.trim() || undefined,
      projectId: createProjectId,
      priority: createPriority,
      dueDate: createDueDate ? new Date(createDueDate).toISOString() : undefined,
    });
  };

  const handleStartEdit = () => {
    if (!selectedTask) return;
    setEditTitle(selectedTask.title);
    setEditDesc(selectedTask.description || '');
    setEditPriority(selectedTask.priority as any);
    setEditStatus(selectedTask.status as any);
    setEditDueDate(selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : '');
    setIsEditingTask(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTitle.trim()) return;
    updateTaskMutation.mutate({
      id: selectedTask.id,
      payload: {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        priority: editPriority,
        status: editStatus,
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
      },
    });
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    postCommentMutation.mutate({ content: commentText.trim() });
  };

  // Client-side file uploading with validation checks
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;

    // File validation rules: maximum size 10MB
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
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
          <h1 className="text-3xl font-extrabold tracking-tight">Kanban Board</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Review board issues, delegate team actions, update Kanban columns, and track milestones.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab buttons */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex">
            {(['table', 'board', 'calendar'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  viewMode === mode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 py-2.5"
          >
            <Plus size={14} /> New Task
          </Button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-950 border-slate-800 text-xs rounded-xl h-9"
            />
          </div>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none w-40"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
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
        </div>
      </div>

      {/* Main views */}
      {tasksLoading || projectsLoading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <span className="text-xs font-semibold">Aligning workspace deliverables...</span>
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
            <TaskTable
              tasks={sortedTasks}
              projects={projects}
              onTaskClick={setSelectedTask}
            />
          )}

          {/* 3. Calendar View */}
          {viewMode === 'calendar' && (
            <TaskCalendar
              tasks={sortedTasks}
              onTaskClick={setSelectedTask}
            />
          )}
        </div>
      )}

      {/* Task Drawer / details modal */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-slate-100 p-0 overflow-hidden sm:rounded-2xl">
          <div className="flex flex-col md:flex-row h-[80vh] md:h-[600px]">
            {/* Left side details */}
            <div className="flex-1 p-6 border-r border-slate-800 overflow-y-auto space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge className={`text-[9px] font-bold uppercase tracking-wider ${
                    selectedTask?.priority === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/25' : 'bg-slate-800'
                  }`}>
                    {selectedTask?.priority} PRIORITY
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEdit}
                      className="text-slate-400 hover:text-slate-100 hover:bg-slate-850 h-8 rounded-lg"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTaskMutation.mutate(selectedTask!.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-955/20 h-8 rounded-lg"
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <DialogTitle className="text-xl font-extrabold text-slate-100 pt-2">{selectedTask?.title}</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs pt-1 leading-relaxed whitespace-pre-wrap">
                  {selectedTask?.description || 'No description provided.'}
                </DialogDescription>
              </DialogHeader>

              {/* Task Dates & Details */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-4">
                <div>
                  <span className="text-[10px] text-slate-550 font-bold block uppercase tracking-wider">Due Date</span>
                  <span className="text-xs font-semibold text-slate-300 block mt-1">
                    {selectedTask?.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'No Target Date'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-550 font-bold block uppercase tracking-wider">Status</span>
                  <span className="text-xs font-semibold text-slate-350 block mt-1">{selectedTask?.status}</span>
                </div>
              </div>

              {/* Assignees listing */}
              <div className="space-y-2 border-t border-slate-800/80 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Assignees</span>
                  <DropdownMenuPm
                    triggerText="Assign User"
                    items={currentProjectMembers.map((m) => ({
                      id: m.userId,
                      label: m.user.name || m.user.email,
                      isSelected: taskDetails?.assignees?.some((a: any) => a.userId === m.userId) || false,
                    }))}
                    onItemClick={(userId, isSelected) => {
                      if (isSelected) {
                        unassignUserMutation.mutate(userId);
                      } else {
                        assignUserMutation.mutate(userId);
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {taskDetails?.assignees?.map((a: any) => (
                    <div key={a.userId} className="bg-slate-950 border border-slate-855 px-2.5 py-1 rounded-xl text-[10px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <span>{a.user?.name || a.user?.email}</span>
                      <button
                        onClick={() => unassignUserMutation.mutate(a.userId)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {(!taskDetails?.assignees || taskDetails.assignees.length === 0) && (
                    <span className="text-xs text-slate-550 italic">No teammate assigned to this task.</span>
                  )}
                </div>
              </div>

              {/* File upload attachments */}
              <div className="space-y-2.5 border-t border-slate-800/80 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Attachments</span>
                  <label className="bg-slate-950 hover:bg-slate-850 border border-slate-800/80 h-7 px-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-slate-300 transition-colors">
                    <Paperclip size={10} />
                    <span>Upload File</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                {isUploading && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-450">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    <span>Uploading attachment (max 10MB)...</span>
                  </div>
                )}
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {taskDetails?.attachments?.map((att: any) => (
                    <div key={att.id} className="bg-slate-950 border border-slate-855 p-2 rounded-xl flex items-center justify-between gap-3 group relative">
                      <div className="min-w-0 flex items-center gap-2">
                        <Paperclip size={12} className="text-slate-500 shrink-0" />
                        <span className="text-[11px] text-slate-300 truncate max-w-[200px]">{att.filename}</span>
                      </div>
                      <button
                        onClick={() => deleteAttachmentMutation.mutate(att.id)}
                        className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/20"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {(!taskDetails?.attachments || taskDetails.attachments.length === 0) && (
                    <p className="text-[10px] text-slate-550 italic">No files uploaded.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right side Comments feed */}
            <div className="w-full md:w-80 bg-slate-950/20 flex flex-col h-full border-t md:border-t-0 md:border-l border-slate-800">
              <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-950/40">
                <MessageSquare size={16} className="text-blue-500" />
                <h4 className="font-bold text-xs tracking-wider uppercase text-slate-400">Activity & Comments</h4>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[300px] md:max-h-none">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-slate-900 border border-slate-855 p-3 rounded-xl relative group text-left">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-blue-450 block truncate max-w-[120px]">
                        {comment.author?.name || comment.author?.email}
                      </span>
                      <span className="text-[8px] text-slate-550">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed word-break-all">{comment.content}</p>
                    <button
                      onClick={() => deleteCommentMutation.mutate(comment.id)}
                      className="absolute bottom-2.5 right-2.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center py-10 text-[10px] text-slate-600 italic">No comments. Add your feedback below.</div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-955/40 flex flex-col gap-2">
                <textarea
                  placeholder="Type a task comment..."
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

      {/* Dialog for Edit Task */}
      <Dialog open={isEditingTask} onOpenChange={setIsEditingTask}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle>Edit Task Details</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-slate-200">
              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Task Title</label>
                <Input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full min-h-20 p-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 flex flex-col text-left">
                  <label className="text-xs font-semibold text-slate-400">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div className="space-y-2 flex flex-col text-left">
                  <label className="text-xs font-semibold text-slate-400">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Due Date</label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditingTask(false)}
                className="hover:bg-slate-800 text-slate-455 text-xs border-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs"
              >
                Save Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Create Task */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription className="text-slate-400">
                Setup a new task on one of your boards.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-slate-200">
              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Select Project</label>
                <select
                  required
                  value={createProjectId}
                  onChange={(e) => setCreateProjectId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
                >
                  <option value="">Choose...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Title</label>
                <Input
                  required
                  placeholder="Task title..."
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              <div className="space-y-2 flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  placeholder="Requirements detail..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full min-h-20 p-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 flex flex-col text-left">
                  <label className="text-xs font-semibold text-slate-400">Priority</label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
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
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="hover:bg-slate-800 text-slate-455 text-xs border-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs"
              >
                Save Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Simple Dropdown helper component for selecting project members to assign
interface DropdownMenuPmProps {
  triggerText: string;
  items: Array<{ id: string; label: string; isSelected: boolean }>;
  onItemClick: (id: string, isSelected: boolean) => void;
}

const DropdownMenuPm: React.FC<DropdownMenuPmProps> = ({ triggerText, items, onItemClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 border border-slate-800 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white flex items-center gap-1 text-[10px]"
      >
        <UserPlus size={10} />
        <span>{triggerText}</span>
        <ChevronDown size={10} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 max-h-48 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onItemClick(item.id, item.isSelected);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors text-left ${
                  item.isSelected ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <span>{item.label}</span>
                {item.isSelected && <span className="text-blue-500">✓</span>}
              </div>
            ))}
            {items.length === 0 && (
              <div className="px-3 py-2 text-center text-[10px] text-slate-600 italic">No board members.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
