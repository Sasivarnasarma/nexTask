# **nexTask - Collaborative Task Management System**

nexTask is a professional, full-stack, real-time Task Management System (TMS) designed for teams to plan, organize, track, and complete tasks efficiently across multiple projects. This application leverages a type-safe TypeScript architecture, real-time communication via WebSockets, background web push notifications, direct-to-S3 asset storage, and a robust hybrid System/Project Role-Based Access Control (RBAC) system.

## **🚀 Project Overview**

The nexTask system provides a structured, multi-project environment for managing the project and task lifecycle. By centralizing projects, tasks, user assignments, updates, and communication, it enhances collaboration, improves accountability, and reduces confusion within the team.

### **Key Capabilities:**

- **Multiple Projects & Memberships:** Support for creating and managing multiple isolated projects. Projects can have unique members and project-level roles.
- **Multi-Assignee Task Tracking:** Tasks are organized within projects and can have multiple collaborators assigned concurrently.
- **Task Labels & Tags:** Categorize and filter tasks using custom text tags (e.g. `Bug`, `Feature`, `UI-Refactor`).
- **Markdown-Enabled Content:** Render markdown syntax in task descriptions and comment sections on the frontend for rich text formatting.
- **Task Calendar Visualizer:** Interactive calendar plotting tasks on their corresponding `dueDate` values.
- **Dashboard Productivity Charts:** Graphical progress bars, priority charts, and status distributions aggregated client-side.
- **Real-Time Collaboration:** Instant updates for task status, assignments, comment threads, and activity logs via WebSockets (Socket.io).
- **Web Push Notifications:** Cross-device background browser notifications using the VAPID protocol, ensuring notifications reach users even when they are offline or the application is closed.
- **System & Project Role-Based Access Control (RBAC):** Differentiated access control using global System Roles (`ADMIN`, `PROJECT_MANAGER`, `COLLABORATOR`) combined with Project-specific Roles (`PROJECT_MANAGER`, `COLLABORATOR`).
- **Onboarding & Security Flows:** Admin-created accounts with SMTP-delivered temporary passwords, requiring a mandatory password reset on first login. Secure JWT-based sessions and Argon2 password hashing.
- **Direct-to-S3 File Attachments:** Cryptographically signed upload URLs (PUT) bypassing the server to optimize throughput, coupled with private storage and short-lived GET presigned URLs.
- **Standardized API Communication:** Consistent JSON response envelopes for all endpoints, making API integrations predictable and highly structured.

## **🛠 Tech Stack**

### **Frontend**

- **Framework:** React with Vite (TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:**
  - **React Query (TanStack Query):** Server-state synchronization, caching, and optimistic updates.
  - **Zustand:** Lightweight global state for UI configurations and user authentication.
- **Notifications:** Service Workers & Push API (VAPID protocol)
- **Communication:** Axios interceptors & Socket.io-client

### **Backend**

- **Architecture:** MVC (Model-View-Controller) Pattern using clean layers
- **Runtime:** Node.js (TypeScript)
- **Framework:** Express.js (configured with `tsoa` for automated OpenAPI/Swagger generation)
- **ORM:** Prisma
- **Database:** PostgreSQL (storing user accounts, projects, memberships, tasks, comments, notification queues, and device subscriptions)
- **Real-Time Systems:** Socket.io (WebSocket connections)
- **Background Push Service:** `web-push` library executing VAPID protocols
- **Storage Services:** S3-Compatible Object Storage (AWS S3, Cloudflare R2, MinIO)
- **Mailing:** SMTP (Nodemailer) utilizing HTML transaction templates
- **Security:** `argon2` for hashing, `jsonwebtoken` for auth tokens, CORS, Helmet

### **DevOps & Tooling**

- **Package Manager:** pnpm (Monorepo Workspaces)
- **Containerization:** Docker & Docker Compose
- **CI/CD:** Automated pipelines for cloud deployment (AWS/Azure/GCP)

## **📂 Project Structure**

The monorepo structure is organized into packages using `pnpm` workspaces:

```
/nexTask
├── /server # Express API + Prisma + WebSockets
│ ├── /src
│ │ ├── /controllers # tsoa-decorated controllers (Handling requests)
│ │ ├── /services # Business logic (Project, Task, User, & Push services)
│ │ ├── /middlewares # JWT Auth, RBAC, & Validation
│ │ ├── /sockets # WebSocket event handlers
│ │ ├── /mail # SMTP/Nodemailer templates
│ │ ├── /utils # Hashing (Argon2), Validators, & VAPID keys
│ │ └── index.ts # Server entry point
│ ├── prisma/ # Schema including Project, Member, Task, PushSubscription models
│ ├── Dockerfile # Backend containerization
│ └── tsoa.json # Swagger generation configuration
│
├── /client # Vite + React + shadcn/ui
│ ├── /public
│ │ └── sw.js # Service Worker for Push Notifications
│ ├── /src
│ │ ├── /api # React Query & Axios configuration
│ │ ├── /components # shadcn/ui & reusable UI components
│ │ ├── /hooks # Socket.io & Web Push subscription hooks
│ │ ├── /store # Zustand state management
│ │ └── /pages # Application views (Dashboard, Tasks, Auth)
│ ├── Dockerfile # Frontend containerization
│ └── tailwind.config.js
│
├── /types # Shared TypeScript Interfaces
│ ├── index.ts # Source of truth for Client & Server API structures
│ └── package.json
│
├── /docs # Project Documentation Artifacts
│ ├── diagrams/ # ER, Class, DB Design & Deployment diagrams
│ └── specifications/ # SRS references
├── docker-compose.yml # Orchestrates Server, Client, & PostgreSQL
├── pnpm-workspace.yaml # Monorepo configuration
└── README.md
```

## **⚙️ Functional Requirements**

### **1. User Authentication & Session Management**

- **Credential Hashing:** Implements high-security **Argon2** hashing. Plaintext credentials are never persisted.
- **JWT Session Tokens:** Stateless tokens containing `userId`, `role`, and `mustResetPassword`. Communicated securely in the client request header: `Authorization: Bearer <jwt_token>`.
- **Session Refresh:** Endpoint `/api/auth/refresh` to refresh credentials before expiry.
- **Mandatory Password Reset Workflow:**
  1. System administrators create accounts and send temporary passwords.
  2. First login triggers validation, checking `mustResetPassword: true`.
  3. Client restricts access and displays the password reset view.
  4. Password update removes the flag (`mustResetPassword: false`) and authorizes full access.
- **Password Complexity Rules:** Enforced on creation and update:
  - Minimum 8 characters.
  - At least one uppercase letter.
  - At least one lowercase letter.
  - At least one numeric character.
  - At least one special symbol (e.g. `@`, `$`, `!`, `%`, `*`, `?`, `&`).

### **2. System-Level vs. Project-Level Access Control (RBAC)**

Access control is implemented in two independent layers:

- **System Roles (Global):**
  - **ADMIN:** Complete system authority. Manages users, views full audits, activates/deactivates accounts. Can create, edit, or delete any project.
  - **PROJECT_MANAGER:** Authorized to create projects, which assigns them project ownership.
  - **COLLABORATOR:** Default role. Can view projects they are members of and manage their task workflow.
- **Project Roles (Local to a Project):**
  - **Owner (Creator):** Full rights over the project definition, archiving, completion, and membership lists.
  - **Project-level PM:** Managed via `ProjectMember` membership with role `PROJECT_MANAGER`. Can manage project tasks, assignments, and members.
  - **Project-level Collaborator:** Managed via `ProjectMember` membership with role `COLLABORATOR`. Can view project, update task statuses, and post comments/attachments.

#### **Access Validation Rules:**

- To query, read, or perform actions inside a project, a user must be:
  - An Admin, OR
  - The Project Owner, OR
  - A Project Member (`ProjectMember` association).
- Unauthorized attempts return `403 Forbidden`.

### **3. Project Management**

- **Attributes:** Project ID (UUID), Name, Description (optional), Status (`ACTIVE`, `ARCHIVED`, `COMPLETED`), End Date (optional future date), Owner ID, and Member lists.
- **State Flow:**
  - **Active:** Default state. Standard workflow enabled.
  - **Completed:** Tasks and projects locked for changes, indicating success.
  - **Archived:** Read-only for reference, hidden from standard dashboard lists unless requested.
- **Project Members:** Managed by owners or project managers, associating users to projects with designated roles.

### **4. Task Management & Assignments**

- **Attributes:** Title (Mandatory, min 3 chars), Description, Due Date (optional future date in ISO 8601 format), Priority (`LOW`, `MEDIUM`, `HIGH`), Status (`TODO`, `IN_PROGRESS`, `COMPLETED`), Project ID, **Tags** (optional array of text labels for classification), and **Position** (Float representing the task's vertical priority ranking in the Kanban column).
- **Assignments:** Supported multi-assignee framework using a task assignment relationship (`TaskAssignment`).
- **Views:** Interactive Kanban Board supporting drag-and-drop status changes and custom card reordering (utilizing the `position` Float key), alongside dynamic tabular lists supporting search, ordering, tags, and state filters.

### **5. Real-Time Interactions & Background Push Notifications**

The system deploys a hybrid notification structure:

- **WebSockets (Socket.io) with Room Isolation:** Instantly alerts online users of task creations, updates, or comment additions. To ensure isolation and privacy, clients join project-specific rooms (e.g. `project:<projectId>`) upon validating their project memberships on socket handshake. Events are broadcasted exclusively to the relevant project room rather than globally.
- **Web Push Notifications (VAPID):** Uses background service workers to send system push notifications directly to the user's browser, working even if the tab or browser is closed.
- **Multi-Device Support:** Users can register multiple device subscriptions. Subscriptions are validated and saved in the database via the VAPID protocol.
- **Notification Persistence:** System updates trigger physical records in the `Notification` table. If users are offline, pending notifications are stored and marked as unread. Upon reconnecting, the client pulls these historical alerts.

### **6. S3-Compatible Storage & File Attachments**

- **Direct Client Upload:** The server generates cryptographically signed PUT URLs, letting the client upload files directly to S3/R2/MinIO, preventing server network bottlenecks.
- **Private Access:** Assets remain private. The server issues short-lived GET presigned URLs (15-minute expiration) in-memory for download requests.
- **Orphan Prevention (Self-Cleaning):** Physical deletion of assets in S3 is executed prior to deleting database metadata. When tasks, comments, or attachments are deleted, their linked S3 objects are physically removed.

### **7. Task Activity Audit Trails**

- **TaskActivity Log:** Every task change generates an immutable action trace: `CREATED`, `UPDATED`, `ASSIGNED`, `COMMENTED`, `COMPLETED`, `DELETED`.
- Contains references to the Task ID, Actor (User ID), Action Type, Description, and a Timestamp.

### **8. Frontend-Only Capabilities (Zero Database Changes)**

- **Markdown Rendering:** Task descriptions and user comment bodies render rich formatting (headers, bold text, lists, and inline code blocks) on the client side.
- **Calendar Scheduler:** A weekly/monthly calendar view plotting tasks dynamically based on their `dueDate`.
- **Client-Side Analytics:** Aggregates and charts project progress metrics using client-side chart libraries (e.g. completion ratios, task breakdown by priority/status).

## **🛠 Standardized API Response Specifications**

All endpoints follow a unified response layout to ensure robust client integration:

#### **Success Format:**

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "errors": null
}
```

#### **Failure/Validation Error Format:**

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": {
    "field_name": "Validation rule description"
  }
}
```

---

## **🗄 Database Schema Model**

The database is built on the following relational structure using Prisma:

```prisma
model User {
  id                String             @id @default(uuid())
  email             String             @unique
  password          String
  name              String?
  role              Role               @default(COLLABORATOR)
  mustResetPassword Boolean            @default(true)
  isActive          Boolean            @default(true)
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  // Relations
  projectMemberships ProjectMember[]
  ownedProjects      Project[]         @relation("ProjectOwner")
  tasksAssigned      TaskAssignment[]
  pushSubscriptions  PushSubscription[]
  notifications      Notification[]
  comments           Comment[]
  attachments        Attachment[]
  taskActivities     TaskActivity[]
}

model Project {
  id          String         @id @default(uuid())
  name        String
  description String?
  status      ProjectStatus  @default(ACTIVE)
  endDate     DateTime?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  // Relations
  ownerId     String
  owner       User           @relation("ProjectOwner", fields: [ownerId], references: [id])
  members     ProjectMember[]
  tasks       Task[]
}

model ProjectMember {
  projectId String
  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      ProjectRole @default(COLLABORATOR)
  joinedAt  DateTime    @default(now())

  @@id([projectId, userId])
}

model Task {
  id          String           @id @default(uuid())
  title       String
  description String?
  dueDate     DateTime?
  priority    Priority         @default(MEDIUM)
  status      Status           @default(TODO)
  tags        String[]
  position    Float            @default(0)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  // Relations
  projectId   String
  project     Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignments TaskAssignment[]
  comments    Comment[]
  attachments Attachment[]
  activities  TaskActivity[]
}

model TaskAssignment {
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignedAt DateTime @default(now())

  @@id([taskId, userId])
}

model Comment {
  id          String       @id @default(uuid())
  content     String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  // Relations
  taskId      String
  task        Task         @relation(fields: [taskId], references: [id], onDelete: Cascade)
  authorId    String
  author      User         @relation(fields: [authorId], references: [id], onDelete: Cascade)
  attachments Attachment[]
}

model Attachment {
  id           String   @id @default(uuid())
  filename     String
  fileKey      String
  mimeType     String
  fileSize     Int
  createdAt    DateTime @default(now())

  // Relations
  taskId       String
  task         Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  commentId    String?
  comment      Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)
  uploadedById String
  uploadedBy   User     @relation(fields: [uploadedById], references: [id], onDelete: Cascade)
}

model Notification {
  id        String           @id @default(uuid())
  message   String
  type      NotificationType
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  // Relations
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskId    String?
}

model PushSubscription {
  id        String   @id @default(uuid())
  endpoint  String
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  // Relations
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model TaskActivity {
  id          String       @id @default(uuid())
  action      ActivityType
  description String?
  createdAt   DateTime     @default(now())

  // Relations
  taskId      String
  task        Task         @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum Role {
  ADMIN
  PROJECT_MANAGER
  COLLABORATOR
}

enum ProjectRole {
  PROJECT_MANAGER
  COLLABORATOR
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
  COMPLETED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum Status {
  TODO
  IN_PROGRESS
  COMPLETED
}

enum NotificationType {
  TASK_ASSIGNED
  STATUS_CHANGED
  DEADLINE_ALERT
  COMMENT_ADDED
  ADMIN_UPDATE
}

enum ActivityType {
  CREATED
  UPDATED
  ASSIGNED
  COMMENTED
  COMPLETED
  DELETED
}
```

---

## **🛠 Developer Setup & Configuration**

The application requires the following environment configurations to run:

### **Backend Config (`server/.env`)**

```env
# Server Config
PORT=3000
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextask?schema=public"

# Auth
JWT_SECRET="your-super-secure-long-jwt-secret-key"
JWT_EXPIRES_IN="7d"

# Mail (SMTP)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="smtp-username"
SMTP_PASS="smtp-password"
SMTP_FROM="noreply@nextask.com"

# S3 Storage (R2/MinIO/S3)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minio-access-key"
S3_SECRET_KEY="minio-secret-key"
S3_BUCKET="nextask-attachments"
S3_REGION="us-east-1"

# Push Notifications (VAPID)
VAPID_SUBJECT="mailto:admin@nextask.com"
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
```

### **Frontend Config (`client/.env`)**

```env
VITE_API_URL="http://localhost:3000/api/v1"
VITE_WS_URL="http://localhost:3000"
VITE_VAPID_PUBLIC_KEY="your-vapid-public-key"
```

---

## **🌳 Version Control & Coding Guidelines**

- **Feature Isolation:** Development must proceed on distinct feature branches (`feature/`).
- **Commits:** Standard Conventional Commits rules apply.
- **Git Merge Strategy:** Use **merge commits** (`--no-ff`) to ensure readable mainline documentation.
- **API generation:** Changes to controllers require running `tsoa spec-and-routes` to auto-update Swagger files.
