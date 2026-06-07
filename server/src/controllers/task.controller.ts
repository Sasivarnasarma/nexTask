import { Task as SharedTask } from '@nextask/types';
import { Task } from '@prisma/client';
import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import {
  CreateTaskInput,
  UpdateTaskInput,
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  updateTask,
} from '../services/task.service';
import { ApiError } from '../utils/apiError.util';
import { ApiResponse, successResponse } from '../utils/response.util';

@Route('tasks')
@Tags('Tasks')
@Security('jwt')
export class TaskController extends Controller {
  // GET /tasks
  @Get('/')
  public async getTasks(): Promise<ApiResponse<Task[]>> {
    const tasks = await getAllTasks();
    return successResponse('Tasks retrieved successfully.', tasks);
  }

  // GET /tasks/:id
  @Get('{id}')
  public async getTask(@Path() id: string): Promise<ApiResponse<SharedTask>> {
    const task = await getTaskById(id);
    if (!task) throw new ApiError(404, 'Task not found.');
    return successResponse('Task retrieved successfully.', task);
  }

  // POST /tasks
  @Post('/')
  @SuccessResponse('201', 'Task Created')
  public async createNewTask(@Body() body: CreateTaskInput): Promise<ApiResponse<Task>> {
    const task = await createTask(body);
    this.setStatus(201);
    return successResponse('Task created successfully.', task);
  }

  // PUT /tasks/:id
  @Put('{id}')
  public async updateExistingTask(
    @Path() id: string,
    @Body() body: UpdateTaskInput,
  ): Promise<ApiResponse<Task>> {
    const task = await updateTask(id, body);
    return successResponse('Task updated successfully.', task);
  }

  // DELETE /tasks/:id
  @Delete('{id}')
  public async deleteExistingTask(@Path() id: string): Promise<ApiResponse<null>> {
    await deleteTask(id);
    return successResponse('Task deleted successfully.', null);
  }
}
