import {
  AddMemberInput,
  ProjectMemberResponse,
  ProjectMemberViewListResponse,
  ProjectMemberViewResponse,
  UpdateMemberRoleInput,
  VoidResponse,
} from '@nextask/types';
import type { Request as ExRequest } from 'express';
import { Middlewares } from 'tsoa';
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

import { validateRequest } from '../middlewares/validate.middleware';
import {
  addProjectMemberSchema,
  assignCollaboratorSchema,
  assignProjectManagerSchema,
  getProjectMemberDetailsSchema,
  getProjectMembersSchema,
  removeProjectMemberSchema,
  updateProjectMemberSchema,
} from '../schemas/membership.schema';
import { ProjectMemberService } from '../services/project-member.service';
import { successResponse } from '../utils/response.util';

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
  @Middlewares(validateRequest(addProjectMemberSchema))
  @SuccessResponse('201', 'Created')
  @Security('jwt', ['project:manager'])
  public async addMember(
    @Path() id: string,
    @Body() body: AddMemberInput,
    @Request() request: ExRequest,
  ): Promise<ProjectMemberResponse> {
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
  @Middlewares(validateRequest(getProjectMembersSchema))
  @Security('jwt', ['project:member'])
  public async getMembers(
    @Path() id: string,
    @Request() request: ExRequest,
  ): Promise<ProjectMemberViewListResponse> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const members = await this.memberService.getProjectMembers(id, requestorId, requestorRole);
    return successResponse('Operation completed successfully.', members);
  }

  /**
   * Retrieves details of a specific project member.
   */
  @Get('{userId}')
  @Middlewares(validateRequest(getProjectMemberDetailsSchema))
  @Security('jwt', ['project:member'])
  public async getMemberDetails(
    @Path() id: string,
    @Path() userId: string,
    @Request() request: ExRequest,
  ): Promise<ProjectMemberViewResponse> {
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
  @Middlewares(validateRequest(updateProjectMemberSchema))
  @Security('jwt', ['project:manager'])
  public async updateMemberRole(
    @Path() id: string,
    @Path() userId: string,
    @Body() body: UpdateMemberRoleInput,
    @Request() request: ExRequest,
  ): Promise<VoidResponse> {
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
  @Middlewares(validateRequest(assignProjectManagerSchema))
  @Security('jwt', ['global:admin'])
  public async assignProjectManager(
    @Path() id: string,
    @Path() userId: string,
    @Request() request: ExRequest,
  ): Promise<VoidResponse> {
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
  @Middlewares(validateRequest(assignCollaboratorSchema))
  @Security('jwt', ['project:manager'])
  public async assignCollaborator(
    @Path() id: string,
    @Path() userId: string,
    @Request() request: ExRequest,
  ): Promise<VoidResponse> {
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
  @Middlewares(validateRequest(removeProjectMemberSchema))
  @Security('jwt', ['project:manager'])
  public async removeMember(
    @Path() id: string,
    @Path() userId: string,
    @Request() request: ExRequest,
  ): Promise<VoidResponse> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    await this.memberService.removeMemberFromProject(id, userId, requestorId, requestorRole);
    return successResponse('Project member removed successfully.', null);
  }
}
