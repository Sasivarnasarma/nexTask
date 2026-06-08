# **Database, API, and Frontend Codebase Migration Guide**

This guide outlines the immediate code refactoring and database schema updates required to align the existing codebase (which was developed under the old single-project, single-assignee specifications) with the new consolidated plan.

---

## **1. Database Schema & Migration (Prisma)**

Update the Postgres schema file at [schema.prisma](file:///d:/GitHub/NexTask/server/prisma/schema.prisma) to add multiple projects, membership mapping, task assignments, task tags, and position rankings.

### **Required Prisma Code Updates:**

1. **Create the `Project` model:**

   ```prisma
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
   ```

2. **Create the `ProjectMember` join model:**

   ```prisma
   model ProjectMember {
     projectId String
     project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
     userId    String
     user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
     role      ProjectRole @default(COLLABORATOR)
     joinedAt  DateTime    @default(now())

     @@id([projectId, userId])
   }
   ```

3. **Refactor the `Task` model:**
   - **Add** `projectId String` linking tasks to a parent project.
   - **Add** `tags String[]` to store categorization.
   - **Add** `position Float @default(0)` to track the Kanban card reordering order.
   - **Remove** the single-assignee fields `assignedUserId` and the relation `assignedUser`.
   - **Updated model:**

     ```prisma
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
     ```

4. **Create the `TaskAssignment` join model:**

   ```prisma
   model TaskAssignment {
     taskId    String
     task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
     userId    String
     user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     assignedAt DateTime @default(now())

     @@id([taskId, userId])
   }
   ```

5. **Create the `Notification` & `TaskActivity` models:**

   ```prisma
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
   ```

6. **Define the new enums:**

   ```prisma
   enum ProjectRole {
     PROJECT_MANAGER
     COLLABORATOR
   }

   enum ProjectStatus {
     ACTIVE
     ARCHIVED
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

### **Execution Command:**

Run this in the terminal:

```bash
cd server
pnpm prisma migrate dev --name init_multi_project_schema
```

---

## **2. Standard API Response Refactoring**

The codebase must be shifted to the standardized format: `{ success: boolean, message: string, data: T | null, errors: Record<string, string> | null }`.

### **A. Refactor Shared Types Interface**

Update the response signature in [types/index.ts](file:///d:/GitHub/NexTask/types/index.ts#L114-L119):

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  errors: Record<string, string> | null;
}
```

### **B. Refactor Server Response Utility**

Rewrite [response.util.ts](file:///d:/GitHub/NexTask/server/src/utils/response.util.ts) to construct the new format:

```typescript
import { ApiResponse } from '@nextask/types';

export type { ApiResponse };

export function successResponse<T>(message: string, data: T): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    errors: null,
  };
}

export function errorResponse(
  message: string,
  errors: Record<string, string> | null = null,
): ApiResponse<null> {
  return {
    success: false,
    message,
    data: null,
    errors: errors || { error: message },
  };
}
```

### **C. Refactor Express Error Handling Middleware**

Update the default global error-catcher in [index.ts](file:///d:/GitHub/NexTask/server/src/index.ts#L30-L63) to map validation failures to the `errors` dictionary instead of returning JSend formatting:

```typescript
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(errorResponse(err.message));
  }

  // TSOA Request Validation Errors mapping
  if (
    err &&
    typeof err === 'object' &&
    'name' in err &&
    err.name === 'ValidateError' &&
    'fields' in err
  ) {
    const fields = (err as { fields: Record<string, any> }).fields;
    const errors: Record<string, string> = {};
    for (const key of Object.keys(fields)) {
      errors[key] = fields[key].message || 'Invalid validation format';
    }
    return res.status(422).json({
      success: false,
      message: 'Request validation failed.',
      data: null,
      errors,
    });
  }

  const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
  return res.status(500).json(errorResponse(message));
});
```

### **D. Update Client Axios Interceptors**

Verify and rewrite frontend response checking in the client codebase (such as components and API integrations) to evaluate the boolean state `response.data.success === true` rather than `response.data.status === 'success'`.

---

## **3. JWT Authentication Payload Verification**

Ensure that server-side auth scripts do not inject `email` into generated JWTs, preserving payload isolation:

- **JWT payload layout:** `{ userId: string, role: string, mustResetPassword: boolean }`
- Verify [jwt.util.ts](file:///d:/GitHub/NexTask/server/src/utils/jwt.util.ts) and [authentication.ts](file:///d:/GitHub/NexTask/server/src/middlewares/authentication.ts) parse `userId` and `role` correctly, populating the Express `req.user` context structure.

---

## **4. Refactoring Existing Tasks Services & UI**

### **A. Refactor Task Database Queries**

Update the Prisma calls inside [task.service.ts](file:///d:/GitHub/NexTask/server/src/services/task.service.ts) to support the new database attributes:

- Tasks must now require a `projectId` relation when creating (`createTask`).
- Replace single assignee queries (`assignedUserId`) with the `TaskAssignment` join table queries (`task.assignments`).
- Include `tags` and `position` in standard queries.
- Ensure task creations assign a default incremental `position` within the column status.

### **B. Kanban UI Scoping**

Update the frontend Kanban Board:

- Update page queries to call the task API scoped by the chosen project: `GET /api/v1/tasks?projectId=<id>` instead of querying all tasks globally.
- Bind the vertical sorting logic of card columns to evaluate the `position` Float attribute (sort ascending).
- Render task tags on the cards using a badge wrapper.
