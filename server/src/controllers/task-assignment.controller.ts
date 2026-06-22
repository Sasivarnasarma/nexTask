import { TaskAssignee } from '@nextask/types';
import { TaskAssignment } from '@prisma/client';
import type { Request as ExRequest } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Middlewares,
  Path,
  Post,
  Put,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import { validateRequest } from '../middlewares/validate.middleware';
import {
  assignUserSchema,
  bulkAssignSchema,
  getAssigneesSchema,
  unassignUserSchema,
} from '../schemas/task-assignment.schema';
import {
  assignUserToTask,
  bulkAssignUsersToTask,
  getTaskAssignees,
  unassignUserFromTask,
} from '../services/task-assignment.service';
import { ApiResponse, successResponse } from '../utils/response.util';
import { getTaskById } from '../services/task.service';
import { broadcastToProject } from '../lib/socket';

export interface AssignUserInput {
  userId: string;
}

export interface BulkAssignInput {
  userIds: string[];
}

@Route('tasks/{id}/assignments')
@Tags('Task Assignments')
@Security('jwt')
export class TaskAssignmentController extends Controller {
  /**
   * Assigns a user to a task.
   */
  @Post('/')
  @Middlewares(validateRequest(assignUserSchema))
  @SuccessResponse('201', 'Created')
  @Security('jwt', ['project:manager'])
  public async assignUser(
    @Path() id: string,
    @Body() body: AssignUserInput,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<TaskAssignment>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const assignment = await assignUserToTask(id, body.userId, requestorId, requestorRole);
    this.setStatus(201);
    const task = await getTaskById(id);
    if (task) {
      broadcastToProject(task.projectId, 'task:assigned', { taskId: id, assignment, assignees: task.assignees });
      broadcastToProject(task.projectId, 'task:updated', task);
    }
    return successResponse('User assigned to task successfully.', assignment);
  }

  /**
   * Unassigns a user from a task.
   */
  @Delete('{userId}')
  @Middlewares(validateRequest(unassignUserSchema))
  @Security('jwt', ['project:manager'])
  public async unassignUser(
    @Path() id: string,
    @Path() userId: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const taskBefore = await getTaskById(id);
    await unassignUserFromTask(id, userId, requestorId, requestorRole);
    const task = await getTaskById(id);
    if (task) {
      broadcastToProject(task.projectId, 'task:unassigned', { taskId: id, userId });
      broadcastToProject(task.projectId, 'task:updated', task);
    } else if (taskBefore) {
      broadcastToProject(taskBefore.projectId, 'task:unassigned', { taskId: id, userId });
    }
    return successResponse('User unassigned from task successfully.', null);
  }

  /**
   * Bulk assigns users to a task, overwriting existing assignments.
   */
  @Put('/')
  @Middlewares(validateRequest(bulkAssignSchema))
  @Security('jwt', ['project:manager'])
  public async bulkAssign(
    @Path() id: string,
    @Body() body: BulkAssignInput,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<TaskAssignment[]>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const assignments = await bulkAssignUsersToTask(id, body.userIds, requestorId, requestorRole);
    const task = await getTaskById(id);
    if (task) {
      broadcastToProject(task.projectId, 'task:assignments-updated', { taskId: id, assignments, assignees: task.assignees });
      broadcastToProject(task.projectId, 'task:updated', task);
    }
    return successResponse('Task assignments updated successfully.', assignments);
  }

  /**
   * Retrieves all assignees for a given task.
   */
  @Get('/')
  @Middlewares(validateRequest(getAssigneesSchema))
  @Security('jwt', ['project:member'])
  public async getAssignees(
    @Path() id: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<TaskAssignee[]>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const assignees = await getTaskAssignees(id, requestorId, requestorRole);
    return successResponse('Task assignees retrieved successfully.', assignees);
  }
}
