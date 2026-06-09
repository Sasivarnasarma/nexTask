import { Project } from '@nextask/types';
import type { Request as ExRequest } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Path,
  Post,
  Put,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import {
  verifyProjectManagerAccess,
  verifyProjectMemberAccess,
} from '../services/project-member.service';
import { ProjectService } from '../services/project.service';
import { ApiError } from '../utils/apiError.util';
import { ApiResponse, successResponse } from '../utils/response.util';

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name: string;
  description?: string;
}

@Route('projects')
@Tags('Projects')
@Security('jwt')
export class ProjectController extends Controller {
  private projectService: ProjectService;

  constructor() {
    super();
    this.projectService = new ProjectService();
  }

  // 1. POST /projects (Create a project)
  @Post('/')
  @SuccessResponse('201', 'Created')
  public async create(
    @Body() requestBody: CreateProjectInput,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<Project>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;

    // Only Admin and Project Manager can create projects
    if (requestorRole === 'COLLABORATOR') {
      throw new ApiError(
        403,
        'Access denied. Only Admins and Project Managers can create projects.',
      );
    }

    const newProject = await this.projectService.createProject(
      requestBody.name,
      requestBody.description,
      requestorId,
    );
    this.setStatus(201);
    return successResponse('Project created successfully.', newProject);
  }

  // 2. GET /projects (View all projects visible to requestor)
  @Get('/')
  public async getAll(@Request() request: ExRequest): Promise<ApiResponse<Project[]>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const projects = await this.projectService.getAllProjects(requestorId, requestorRole);
    return successResponse('Projects retrieved successfully.', projects);
  }

  // 3. GET /projects/{id} (View single project by ID)
  @Get('{id}')
  public async getById(
    @Path() id: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<Project>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    const project = await verifyProjectMemberAccess(id, requestorId, requestorRole);

    return successResponse('Project retrieved successfully.', project);
  }

  // 4. PUT /projects/{id} (Update details)
  @Put('{id}')
  public async update(
    @Path() id: string,
    @Body() requestBody: UpdateProjectInput,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<Project>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    await verifyProjectManagerAccess(id, requestorId, requestorRole);

    const updatedProject = await this.projectService.updateProject(
      id,
      requestBody.name,
      requestBody.description,
    );
    return successResponse('Project updated successfully.', updatedProject);
  }

  // 5. PATCH /projects/{id}/complete (Complete project)
  @Patch('{id}/complete')
  public async complete(
    @Path() id: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<Project>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    await verifyProjectManagerAccess(id, requestorId, requestorRole);

    const completedProject = await this.projectService.completeProject(id);
    return successResponse('Project marked as completed.', completedProject);
  }

  // 6. PATCH /projects/{id}/archive (Archive project)
  @Patch('{id}/archive')
  public async archive(
    @Path() id: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<Project>> {
    const { userId: requestorId, role: requestorRole } = (request as any).user;
    await verifyProjectManagerAccess(id, requestorId, requestorRole);

    const archivedProject = await this.projectService.archiveProject(id);
    return successResponse('Project archived successfully.', archivedProject);
  }

  // 7. DELETE /projects/{id} (Delete project - Admin Only)
  @Delete('{id}')
  public async delete(
    @Path() id: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { role: requestorRole } = (request as any).user;

    // Project deletion is restricted to system Administrators only
    if (requestorRole !== 'ADMIN') {
      throw new ApiError(403, 'Access denied. Only system Administrators can delete projects.');
    }

    const project = await this.projectService.getProjectById(id);
    if (!project) throw new ApiError(404, 'Project not found.');

    await this.projectService.deleteProject(id);
    return successResponse('Project deleted successfully.', null);
  }
}
