import {
  CreateTaskRequest,
  Task,
  TaskListResponse,
  TaskResponse,
  UpdateTaskRequest,
  VoidResponse,
} from '@nextask/types';
import type { Request as ExRequest } from 'express';
import { Middlewares } from 'tsoa';
import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Query,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import { broadcastToProject } from '../lib/socket';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createTaskSchema,
  deleteTaskSchema,
  getTaskSchema,
  updateTaskSchema,
} from '../schemas/task.schema';
import { PermissionService } from '../services/permission.service';
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  updateTask,
  getMyTasks,
  getAdminAllTasks,
} from '../services/task.service';
import { ApiError } from '../utils/apiError.util';
import { successResponse } from '../utils/response.util';

@Route('tasks')
@Tags('Tasks')
@Security('jwt')
export class TaskController extends Controller {
  // GET /tasks/me (Collaborator assigned tasks only)
  @Get('me')
  public async getTasksMe(@Request() request: ExRequest): Promise<TaskListResponse> {
    const { userId } = (request as any).user;
    const tasks = await getMyTasks(userId);
    return successResponse('Personal tasks retrieved successfully.', tasks);
  }

  // GET /tasks/admin/all (Admin system-wide tasks)
  @Get('admin/all')
  @Security('jwt', ['global:admin'])
  public async getTasksAdmin(@Request() request: ExRequest): Promise<TaskListResponse> {
    const { userId } = (request as any).user;
    const tasks = await getAdminAllTasks(userId);
    return successResponse('System tasks retrieved successfully.', tasks);
  }

  // GET /tasks/project/:projectId (Scoped tasks view)
  @Get('project/{projectId}')
  @Security('jwt', ['project:member'])
  public async getTasksByProject(
    @Path() projectId: string,
    @Request() request: ExRequest,
    @Query() search?: string,
    @Query() status?: Task['status'],
    @Query() priority?: Task['priority'],
    @Query() tags?: string[],
  ): Promise<TaskListResponse> {
    const { userId, role } = (request as any).user;
    const tasks = await getAllTasks(projectId, userId, role, search, status, priority, tags);
    return successResponse('Project tasks retrieved successfully.', tasks);
  }

  // GET /tasks/:id
  @Get('{id}')
  @Middlewares(validateRequest(getTaskSchema))
  @Security('jwt', ['project:member'])
  public async getTask(@Path() id: string, @Request() request: ExRequest): Promise<TaskResponse> {
    const { userId, role } = (request as any).user;
    const task = await getTaskById(id, userId, role);
    if (!task) throw new ApiError(404, 'Task not found or access denied.');
    return successResponse('Task retrieved successfully.', task);
  }

  // POST /tasks
  @Post('/')
  @Middlewares(validateRequest(createTaskSchema))
  @SuccessResponse('201', 'Task Created')
  @Security('jwt', ['project:member'])
  public async createNewTask(
    @Body() body: CreateTaskRequest,
    @Request() request: ExRequest,
  ): Promise<TaskResponse> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    
    // Check permission to create task inside the target project
    const canCreate = await PermissionService.canPerformAction(
      requestorId,
      requestorRole,
      body.projectId,
      'TASK_CREATED'
    );

    if (!canCreate) {
      throw new ApiError(403, 'Access denied. You do not have permission to create tasks in this project.');
    }

    const task = await createTask({ ...body, createdBy: requestorId });
    const taskWithPermissions = await getTaskById(task.id, requestorId, requestorRole);
    if (!taskWithPermissions) {
      throw new ApiError(500, 'Failed to retrieve task after creation.');
    }
    this.setStatus(201);
    broadcastToProject(task.projectId, 'task:created', taskWithPermissions);
    return successResponse('Task created successfully.', taskWithPermissions);
  }

  // PUT /tasks/:id
  @Put('{id}')
  @Middlewares(validateRequest(updateTaskSchema))
  @Security('jwt', ['project:member'])
  public async updateExistingTask(
    @Path() id: string,
    @Body() body: UpdateTaskRequest,
    @Request() request: ExRequest,
  ): Promise<TaskResponse> {
    const existingTask = await getTaskById(id);
    if (!existingTask) throw new ApiError(404, 'Task not found.');

    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const projectId = existingTask.projectId;

    // Detect if they are changing status or other metadata
    const keys = Object.keys(body).filter((k) => (body as any)[k] !== undefined);
    const isStatusOnly = keys.length === 1 && keys[0] === 'status';
    const action = isStatusOnly ? 'TASK_STATUS_CHANGED' : 'TASK_UPDATED';

    const canPerform = await PermissionService.canPerformAction(
      requestorId,
      requestorRole,
      projectId,
      action,
      existingTask as any
    );

    if (!canPerform) {
      throw new ApiError(
        403,
        'Access denied. You do not have permission to modify this task with the specified changes.',
      );
    }

    const task = await updateTask(id, body, requestorId);
    const taskWithPermissions = await getTaskById(task.id, requestorId, requestorRole);
    if (!taskWithPermissions) {
      throw new ApiError(500, 'Failed to retrieve task after update.');
    }
    broadcastToProject(task.projectId, 'task:updated', taskWithPermissions);
    return successResponse('Task updated successfully.', taskWithPermissions);
  }

  // DELETE /tasks/:id
  @Delete('{id}')
  @Middlewares(validateRequest(deleteTaskSchema))
  @Security('jwt', ['project:member'])
  public async deleteExistingTask(
    @Path() id: string,
    @Request() request: ExRequest,
  ): Promise<VoidResponse> {
    const existingTask = await getTaskById(id);
    if (!existingTask) throw new ApiError(404, 'Task not found.');

    const { userId: requestorId, role: requestorRole } = (request as any).user;
    
    const canDelete = await PermissionService.canPerformAction(
      requestorId,
      requestorRole,
      existingTask.projectId,
      'TASK_DELETED',
      existingTask as any
    );

    if (!canDelete) {
      throw new ApiError(403, 'Access denied. You do not have permission to delete this task.');
    }

    const projectId = existingTask.projectId;
    await deleteTask(id, requestorId);
    broadcastToProject(projectId, 'task:deleted', { taskId: id });
    return successResponse('Task deleted successfully.', null);
  }
}
