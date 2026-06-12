import { TaskAssignee } from '@nextask/types';
import { TaskAssignment } from '@prisma/client';
import type { Request as ExRequest } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
  Middlewares,
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

export interface AssignUserInput {
  userId: string;
}

export interface BulkAssignInput {
  userIds: string[];
}

@Route('tasks/{taskId}/assignees')
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
    @Path() taskId: string,
    @Body() body: AssignUserInput,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<TaskAssignment>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const assignment = await assignUserToTask(taskId, body.userId, requestorId, requestorRole);
    this.setStatus(201);
    return successResponse('User assigned to task successfully.', assignment);
  }

  /**
   * Unassigns a user from a task.
   */
  @Delete('{userId}')
  @Middlewares(validateRequest(unassignUserSchema))
  @Security('jwt', ['project:manager'])
  public async unassignUser(
    @Path() taskId: string,
    @Path() userId: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    await unassignUserFromTask(taskId, userId, requestorId, requestorRole);
    return successResponse('User unassigned from task successfully.', null);
  }

  /**
   * Bulk assigns users to a task, overwriting existing assignments.
   */
  @Put('/')
  @Middlewares(validateRequest(bulkAssignSchema))
  @Security('jwt', ['project:manager'])
  public async bulkAssign(
    @Path() taskId: string,
    @Body() body: BulkAssignInput,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<TaskAssignment[]>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const assignments = await bulkAssignUsersToTask(
      taskId,
      body.userIds,
      requestorId,
      requestorRole,
    );
    return successResponse('Task assignments updated successfully.', assignments);
  }

  /**
   * Retrieves all assignees for a given task.
   */
  @Get('/')
  @Middlewares(validateRequest(getAssigneesSchema))
  @Security('jwt', ['project:member'])
  public async getAssignees(
    @Path() taskId: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<TaskAssignee[]>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const assignees = await getTaskAssignees(taskId, requestorId, requestorRole);
    return successResponse('Task assignees retrieved successfully.', assignees);
  }
}
