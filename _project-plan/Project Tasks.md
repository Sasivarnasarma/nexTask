# **nexTask - Project Roadmap & Task Distribution**

This document outlines the development phases for the nexTask project. The work is divided into logic-based phases, with each phase consisting of exactly 5 core tasks, organized in the order they need to be completed.

## **🏗 Phase 0: System Initialization & Scaffolding**

_Handled exclusively by **Member A**. This phase establishes the environment, core architecture, and database foundation required for all other members to begin work._

| Task ID | Task Description                                                                                                                                                        | Assigned To | Status    |
| :------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------- | :-------- |
| T0.1    | **Monorepo Scaffolding** - Initialize pnpm workspaces. - Create root pnpm-workspace.yaml. - Scaffold server, client, and types directories.                             | Member A    | Completed |
| T0.2    | **Backend & API Config** - Initialize Express with TypeScript. - Configure tsoa for automated Swagger generation. - Link shared TypeScript types to the server package. | Member A    | Completed |
| T0.3    | **Database & Schema** - Initialize PostgreSQL connection. - Set up Prisma ORM. - Define base User and Task models in schema.prisma.                                     | Member A    | Completed |
| T0.4    | **Frontend Foundations** - Initialize React via Vite with TypeScript. - Install and configure Tailwind CSS. - Set up shadcn/ui and the global theme.                    | Member A    | Completed |
| T0.5    | **Containerization** - Create production and development Dockerfiles. - Configure docker-compose.yml for multi-service orchestration.                                   | Member A    | Completed |

## **🛠 Phase 1: Core Authentication & Logic**

_Focuses on user access, task management foundations, and system infrastructure._

| Task ID | Task Description                                                                                                                                                                                           | Assigned To | Status    |
| :------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------- | :-------- |
| T1.1    | **Authentication Engine** - Implement Argon2 password hashing utilities. - Build JWT generation and verification logic. - Create Login and Registration endpoints.                                         | Member A    | Completed |
| T1.2    | **Task Services** - Create Prisma-based CRUD services for tasks. - Implement TSOA controllers (must return standardized ApiResponse and throw ApiError).                                                   | Member B    | Completed |
| T1.3    | **Base Layout UI** - Design the responsive Dashboard Shell with Sidebar. - Build the top Navigation bar with user status. - Implement frontend routing and protected routes.                               | Member C    | Completed |
| T1.4    | **User Onboarding Flows** - Build "First Login" password reset logic (enforce via mustResetPassword flag). - Implement the User Profile edit interface. - Enforce password complexity frontend validation. | Member D    | Completed |
| T1.5    | **Error Infrastructure** - (Backend middleware & ApiError implemented in T1.1) - Implement frontend toast notification system mapped to standardized API response format.                                  | Member E    | Completed |

## **🚀 Phase 2: Project Architecture & Core Features**

_Focuses on multi-project infrastructure and key user collaboration capabilities._

| Task ID | Task Description                                                                                                                                                                                                                                                                              | Assigned To | Status    |
| :------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------- | :-------- |
| T2.1    | **Web Push System** - Generate VAPID keys and manage server-side subscriptions. - Build the service to store and manage multi-device push tokens. - Implement Service Worker logic for background notifications.                                                                              | Member A    | Completed |
| T2.2    | **Collaboration & S3 Upload** - Implement comment models and services. Build backend and frontend logic for direct client S3 upload (signed PUT URLs, private bucket access, and short-lived GET links). Expose comment & attachment APIs with self-cleaning cascade S3 deletion.             | Member B    | Completed |
| T2.3    | **Task Visualization** - Build the interactive Kanban Board UI using shadcn. - Implement Task Cards with priority-based color coding. - Create a filterable List/Table view for detailed tracking. - Build a Task Details modal supporting comment threads and S3 attachment upload/download. | Member C    | Completed |
| T2.4    | **Project Management APIs** - Create Prisma-based CRUD service methods and TSOA controllers for Projects. Expose endpoints to create, view, update, delete, complete, and archive projects.                                                                                                   | Member D    | Completed |
| T2.5    | **Project Membership APIs** - Build membership join endpoints to register users as project members. Implement project-specific role assignments (`PROJECT_MANAGER`, `COLLABORATOR`).                                                                                                          | Member E    | Completed |

## **🔒 Phase 3: Security, Assignments & Queries**

_Focuses on data safety, task delegation, and search structures._

| Task ID | Task Description                                                                                                                                                                                                                                                                                              | Assigned To | Status    |
| :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------- | :-------- |
| T3.1    | **Multi-Assignee Task APIs** - Implement Prisma CRUD actions for task assignments. Expose endpoints to assign, unassign, bulk assign, and list assignees for a given task.                                                                                                                                    | Member A    | Completed |
| T3.2    | **Data Integrity & Validation** - Enforce request sanitization to prevent XSS. Build Zod validation schemas for projects, memberships, tasks (with tags, position), comments, and attachments. Enforce strict type validation across Express layers.                                                          | Member B    | Completed |
| T3.3    | **RBAC Enforcement** - Implement hybrid authorization middleware checking global roles (Admin/PM) and project-level roles/memberships. Restrict project task modification, comment postings, and S3 file operations to authorized members.                                                                    | Member C    | Completed |
| T3.4    | **Backend Search & Filter APIs** - Implement backend text indexing/search and filtering queries to retrieve tasks by projectId, status, priority, and tags. Build team member autocomplete search endpoint.                                                                                                   | Member D    | Completed |
| T3.5    | **Frontend Search & Filter UI** - Build client-side Project Switcher (sidebar/navbar dropdown) and Create Project dialog. Implement Project Members management console. Build dashboard search inputs, project-scoped task filters, and multi-assignee selection dropdown controls in the Task Details modal. | Member E    | Completed |

## **🛠 Phase 4: Communication & Governance**

_Focuses on real-time messaging, email updates, and analytics reporting._

| Task ID | Task Description                                                                                                                                                                                                                                                        | Assigned To | Status  |
| :------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------- | :------ |
| T4.1    | **WebSocket Integration** - Initialize Socket.io with room isolation (clients join `project:<projectId>` rooms). Broadcast task status/position moves, comment posting, and assignment events to project room members. Integrate real-time active Kanban board updates. | Member A    | Pending |
| T4.2    | **Onboarding Mail Service** - Set up SMTP connection with Nodemailer. Create onboarding HTML templates. Trigger registration emails containing temporary passwords when administrators create user accounts.                                                            | Member B    | Pending |
| T4.3    | **Task Assignment Mail Service** - Create mail templates and event-based triggers to notify users via email when they are assigned or reassigned to a task.                                                                                                             | Member C    | Pending |
| T4.4    | **Admin Management** - Build the searchable User Management dashboard. - Implement role assignment and user deactivation logic. - Disable and remove the temporary public registration endpoint built in T1.1. - Create an audit log view for administrative changes.   | Member D    | Pending |
| T4.5    | **Analytics & Reporting** - Implement a client-side Project Status dashboard with visual completion charts. Create priority and status distribution metrics, and personal user productivity charts.                                                                     | Member E    | Pending |

## **📋 Deliverables Tracking**

- [ ] Source code published to GitHub (with feature branches and merge commits).
- [ ] Swagger API documentation accessible at /api-docs (Generated via tsoa).
- [ ] ER, Class, and Deployment diagrams updated in /docs.
- [ ] Documentation Finalization (Shared responsibility: Setup guides, API manual, and Final Report).
- [ ] Final deployment on Cloud Platform (AWS/Azure/GCP).
