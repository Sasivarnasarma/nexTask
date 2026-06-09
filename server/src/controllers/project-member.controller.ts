import type { Request as ExRequest } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Path,
  Post,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import { ProjectMemberService } from '../services/project-member.service';
import { ApiResponse, successResponse } from '../utils/response.util';

export interface AddMemberInput {
  userId: string;
  role: 'PROJECT_MANAGER' | 'COLLABORATOR';
}

export interface UpdateMemberRoleInput {
  role: 'PROJECT_MANAGER' | 'COLLABORATOR';
}

@Route('projects/{id}/members')
@Tags('Project Members')
@Security('jwt')
export class ProjectMemberController extends Controller {
  private memberService: ProjectMemberService;

  constructor() {
    super();
    this.memberService = new ProjectMemberService();
  }

  /**
   * Adds a new member to the project.
   */
  @Post('/')
  @SuccessResponse('201', 'Created')
  public async addMember(
    @Path() id: string,
    @Body() body: AddMemberInput,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<any>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const member = await this.memberService.addMemberToProject(
      id,
      body.userId,
      body.role,
      requestorId,
      requestorRole,
    );
    this.setStatus(201);
    return successResponse('Project member added successfully.', member);
  }

  /**
   * Retrieves all members of the project.
   */
  @Get('/')
  public async getMembers(
    @Path() id: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<any[]>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const members = await this.memberService.getProjectMembers(id, requestorId, requestorRole);
    return successResponse('Operation completed successfully.', members);
  }

  /**
   * Retrieves details of a specific project member.
   */
  @Get('{userId}')
  public async getMemberDetails(
    @Path() id: string,
    @Path() userId: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<any>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const member = await this.memberService.getMemberDetails(
      id,
      userId,
      requestorId,
      requestorRole,
    );
    return successResponse('Operation completed successfully.', member);
  }

  /**
   * Updates the role of a project member.
   */
  @Patch('{userId}')
  public async updateMemberRole(
    @Path() id: string,
    @Path() userId: string,
    @Body() body: UpdateMemberRoleInput,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    await this.memberService.updateMemberRole(
      id,
      userId,
      body.role,
      requestorId,
      requestorRole,
      false, // adminOnly = false
    );
    return successResponse('Project member role updated successfully.', null);
  }

  /**
   * Assigns the Project Manager role to a project member (Admin only).
   */
  @Patch('{userId}/project-manager')
  public async assignProjectManager(
    @Path() id: string,
    @Path() userId: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    await this.memberService.updateMemberRole(
      id,
      userId,
      'PROJECT_MANAGER',
      requestorId,
      requestorRole,
      true, // adminOnly = true
    );
    return successResponse('User assigned as Project Manager.', null);
  }

  /**
   * Assigns the Collaborator role to a project member.
   */
  @Patch('{userId}/collaborator')
  public async assignCollaborator(
    @Path() id: string,
    @Path() userId: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    await this.memberService.updateMemberRole(
      id,
      userId,
      'COLLABORATOR',
      requestorId,
      requestorRole,
      false, // adminOnly = false
    );
    return successResponse('User assigned as Collaborator.', null);
  }

  /**
   * Removes a member from the project.
   */
  @Delete('{userId}')
  public async removeMember(
    @Path() id: string,
    @Path() userId: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    await this.memberService.removeMemberFromProject(id, userId, requestorId, requestorRole);
    return successResponse('Project member removed successfully.', null);
  }
}
