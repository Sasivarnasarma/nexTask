import { CreateTaskRequest, Task as SharedTask, UpdateTaskRequest } from '@nextask/types';
import { Task } from '@prisma/client';
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

import { validateRequest } from '../middlewares/validate.middleware';
import {
  createTaskSchema,
  deleteTaskSchema,
  getTaskSchema,
  getTasksQuerySchema,
  updateTaskSchema,
} from '../schemas/task.schema';
import { verifyProjectManagerAccess } from '../services/project-member.service';
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  updateTask,
} from '../services/task.service';
import { ApiError } from '../utils/apiError.util';
import { ApiResponse, successResponse } from '../utils/response.util';
import { broadcastToProject } from '../lib/socket';

@Route('tasks')
@Tags('Tasks')
@Security('jwt')
export class TaskController extends Controller {
  // GET /tasks with Query Filtering (Task 3.4)
  @Get('/')
  @Middlewares(validateRequest(getTasksQuerySchema))
  @Security('jwt', ['project:member'])
  public async getTasks(
    @Query() projectId: string,
    @Query() search?: string,
    @Query() status?: SharedTask['status'],
    @Query() priority?: SharedTask['priority'],
    @Query() tags?: string[],
  ): Promise<ApiResponse<SharedTask[]>> {
    const tasks = await getAllTasks(projectId, search, status, priority, tags);
    return successResponse('Tasks retrieved successfully.', tasks);
  }

  // GET /tasks/:id
  @Get('{id}')
  @Middlewares(validateRequest(getTaskSchema))
  @Security('jwt', ['project:member'])
  public async getTask(@Path() id: string): Promise<ApiResponse<SharedTask>> {
    const task = await getTaskById(id);
    if (!task) throw new ApiError(404, 'Task not found.');
    return successResponse('Task retrieved successfully.', task);
  }

  // POST /tasks
  @Post('/')
  @Middlewares(validateRequest(createTaskSchema))
  @SuccessResponse('201', 'Task Created')
  @Security('jwt', ['project:manager'])
  public async createNewTask(@Body() body: CreateTaskRequest): Promise<ApiResponse<Task>> {
    const task = await createTask(body);
    this.setStatus(201);
    broadcastToProject(task.projectId, 'task:created', task);
    return successResponse('Task created successfully.', task);
  }

  // PUT /tasks/:id
  @Put('{id}')
  @Middlewares(validateRequest(updateTaskSchema))
  @Security('jwt', ['project:member'])
  public async updateExistingTask(
    @Path() id: string,
    @Body() body: UpdateTaskRequest,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<Task>> {
    const existingTask = await getTaskById(id);
    if (!existingTask) throw new ApiError(404, 'Task not found.');

    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const projectId = existingTask.projectId;

    let isManager = true;
    try {
      await verifyProjectManagerAccess(projectId, requestorId, requestorRole);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 403) {
        isManager = false;
      } else {
        throw err;
      }
    }

    if (!isManager) {
      const keys = Object.keys(body).filter((k) => (body as any)[k] !== undefined);
      const hasOtherChanges = keys.some((k) => k !== 'status');
      if (hasOtherChanges) {
        throw new ApiError(
          403,
          'Access denied. Only Project Managers can modify details other than task status.',
        );
      }
    }

    const task = await updateTask(id, body);
    broadcastToProject(task.projectId, 'task:updated', task);
    return successResponse('Task updated successfully.', task);
  }

  // DELETE /tasks/:id
  @Delete('{id}')
  @Middlewares(validateRequest(deleteTaskSchema))
  @Security('jwt', ['project:manager'])
  public async deleteExistingTask(@Path() id: string): Promise<ApiResponse<null>> {
    const existingTask = await getTaskById(id);
    if (existingTask) {
      const projectId = existingTask.projectId;
      await deleteTask(id);
      broadcastToProject(projectId, 'task:deleted', { taskId: id });
    } else {
      await deleteTask(id);
    }
    return successResponse('Task deleted successfully.', null);
  }
}
