import { Comment, CreateCommentRequest } from '@nextask/types';
import type { Request as ExRequest } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Middlewares,
  Path,
  Post,
  Request,
  Route,
  Security,
  Tags,
} from 'tsoa';

import { validateRequest } from '../middlewares/validate.middleware';
import { createCommentSchema } from '../schemas/comment.schema';
import { deleteComment, getCommentsByTaskId, postComment } from '../services/comment.service';
import { ApiResponse, successResponse } from '../utils/response.util';

@Route('tasks')
@Tags('Comments')
@Security('jwt')
export class CommentController extends Controller {
  /**
   * Retrieves all comments for a specific task.
   */
  @Get('{taskId}/comments')
  @Security('jwt', ['project:member'])
  public async getComments(@Path() taskId: string): Promise<ApiResponse<Comment[]>> {
    const comments = await getCommentsByTaskId(taskId);
    return successResponse('Comments retrieved successfully.', comments);
  }

  /**
   * Posts a new comment to a specific task.
   */
  @Post('{taskId}/comments')
  @Middlewares(validateRequest(createCommentSchema))
  @Security('jwt', ['project:member'])
  public async createComment(
    @Path() taskId: string,
    @Body() body: CreateCommentRequest,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<Comment>> {
    const { userId } = (request as any).user;
    const comment = await postComment(userId, taskId, body.content, body.attachments);
    return successResponse('Comment posted successfully.', comment);
  }
}

@Route('comments')
@Tags('Comments')
@Security('jwt')
export class CommentDeleteController extends Controller {
  /**
   * Deletes a comment by ID.
   */
  @Delete('{commentId}')
  @Security('jwt', ['project:member'])
  public async removeComment(
    @Path() commentId: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { userId, role } = (request as any).user;
    await deleteComment(commentId, userId, role);
    return successResponse('Comment deleted successfully.', null);
  }
}
