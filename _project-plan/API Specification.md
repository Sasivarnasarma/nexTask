# **nexTask - API Specification**

This document serves as the single source of truth for the nexTask Collaborative Task Management System (TMS) API. It consolidates all details, incorporating the direct-to-S3 upload process, VAPID push notification subscriptions alongside database-stored notifications, Argon2 password hashing, and support for multiple projects and multiple task assignees.

---

## **1. System Architecture & API Overview**

The nexTask API is a secure RESTful API built on Node.js/Express (TypeScript), with PostgreSQL as the relational database, Prisma as the ORM, and Socket.io for real-time WebSockets.

### **Base URL**

- **Development:** `http://localhost:3000`
- **Production:** `https://api.nextask.com` _(or configured production domain)_

### **Technology Stack**

| Component               | Technology                                                    |
| :---------------------- | :------------------------------------------------------------ |
| Backend Framework       | Node.js                                                       |
| Server Framework        | Express.js                                                    |
| Database                | PostgreSQL                                                    |
| ORM                     | Prisma                                                        |
| Authentication          | JWT (JSON Web Tokens)                                         |
| Password Hashing        | Argon2                                                        |
| Storage                 | S3-Compatible Object Storage (AWS S3 / Cloudflare R2 / MinIO) |
| Real-Time Communication | WebSockets (Socket.io) & Web Push (VAPID)                     |
| API Documentation       | Swagger / OpenAPI (via `tsoa`)                                |
| Containerization        | Docker & Docker Compose                                       |

### **Developer Environment Configuration (.env Templates)**

#### **Backend Config (`server/.env`)**

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextask?schema=public"

# Authentication & Security
JWT_SECRET="your-super-secure-long-jwt-secret-key"
JWT_EXPIRES_IN="7d"

# Mail Settings (SMTP/Nodemailer)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="smtp-username"
SMTP_PASS="smtp-password"
SMTP_FROM="noreply@nextask.com"

# S3-Compatible Object Storage (R2/MinIO/S3)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minio-access-key"
S3_SECRET_KEY="minio-secret-key"
S3_BUCKET="nextask-attachments"
S3_REGION="us-east-1"

# Web Push VAPID Keys
VAPID_SUBJECT="mailto:admin@nextask.com"
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
```

#### **Frontend Config (`client/.env`)**

```env
VITE_API_URL="http://localhost:3000"
VITE_WS_URL="http://localhost:3000"
VITE_VAPID_PUBLIC_KEY="your-vapid-public-key"
```

---

## **2. Global Specifications**

### **Common Response Structures**

The nexTask API uses a consistent response format for all endpoints, simplifying client-side data parsing and handling. Responses include a `success` boolean to easily distinguish between success and failure, a descriptive `message`, the payload `data` (null on error), and a structured `errors` object or array containing detailed validation or exception details (null on success).

#### **Success Response Format**

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "errors": null
}
```

_Example (Create User Success):_

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid-1234",
    "name": "John Doe"
  },
  "errors": null
}
```

#### **Error Response Format**

```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "errors": {
    "field_name": "Field validation error message"
  }
}
```

_Example (Form Validation Error):_

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": {
    "email": "Must be a valid email format",
    "password": "Password must be at least 8 characters long"
  }
}
```

```

### **Standard HTTP Status Codes**

| Status Code | Description                   |
| :---------- | :---------------------------- |
| **200**     | Request successful            |
| **201**     | Resource created successfully |
| **400**     | Bad Request                   |
| **401**     | Unauthorized                  |
| **403**     | Forbidden                     |
| **404**     | Resource Not Found            |
| **409**     | Conflict                      |
| **413**     | Payload Too Large             |
| **500**     | Internal Server Error         |

### **Authentication and Authorization Flow**

```

User Login
↓
Submit Email and Password
↓
Backend Validates Credentials (Argon2 Verify)
↓
JWT Token Generated (contains userId, role, mustResetPassword)
↓
Token Returned to Client (stored in local storage / memory)
↓
Client Sends Token in Authorization Header (Authorization: Bearer <jwt_token>)
↓
Backend Validates JWT Middleware
↓
Access Granted

````

#### **Authorization Header Format**

```http
Authorization: Bearer <jwt_token>
````

_Example:_

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1dWlkLTEyMzQiLCJyb2xlIjoiUHJvamVjdCBNYW5hZ2VyIiwibXVzdFJlc2V0UGFzc3dvcmQiOmZhbHNlfQ.sig
```

#### **JWT Payload Structure**

```json
{
  "userId": "uuid-string",
  "role": "PROJECT_MANAGER",
  "mustResetPassword": false,
  "exp": 1717600000
}
```

### **Role-Based Access Control (RBAC)**

The system enforces Role-Based Access Control at both the system level and the project level.

#### **Administrator**

Permissions:

- Manage Users (Create, View, Update, Deactivate/Activate, Delete)
- Manage Projects
- Manage Roles
- View System-wide Audit Logs
- Full System Access

#### **Project Manager**

Permissions:

- Create Projects
- Manage Project Members
- Create, Update, Delete Tasks in Managed Projects
- Assign / Reassign / Unassign Tasks
- Manage Comments and Attachments
- Manage Project Activities

#### **Collaborator**

Permissions:

- View Assigned Tasks and Project memberships
- Update Task Status
- Add Comments on tasks
- Upload Attachments (using direct-to-S3 flow)
- Receive Notifications

### **Global Validation Standards**

#### **Email Validation**

- Required
- Must be a valid email format (`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
- Must be unique across the user database

#### **Password Policy**

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

#### **Project Validation**

- Name is required (minimum 3 characters)
- `endDate` is optional; if provided, must be a valid future date following ISO DateTime format

#### **Task Validation**

- Title is required (minimum 3 characters)
- Project must exist
- `dueDate` is optional; if provided, must be a valid future date in ISO 8601 format
- `tags` is optional; if provided, must be an array of strings (minimum 1 character per tag)

### **Frontend-Only System Capabilities**

#### **1. Markdown Rendering**

- **Descriptions:** Task descriptions render using a React Markdown processor component.
- **Comments:** User comments render with basic markdown (bold, italic, list formatting, inline code).

#### **2. Task Calendar View**

- A weekly and monthly calendar layout plotting task items based on their `dueDate` values.
- Supported interactions include clicking a calendar task card to open the standard task detail modal.

#### **3. Basic Dashboard Analytics**

- Graphical visualizations summarizing task completion percentage rates, task priorities, and status distributions utilizing client-side chart libraries.

---

## **3. Detailed Module Specifications**

---

### **3.1. Authentication Module**

- **Purpose:** Manage user authentication, authorization, session handling, password management, and secure access to protected resources.
- **Access Control:** Public (Login, Forgot Password, Reset Password), Authenticated (Logout, Profile info, Change Password, Token refresh).

#### **1. Login User**

- **Endpoint:** `POST /auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
- **Validation Rules:**
  | Field | Validation |
  | :--- | :--- |
  | `email` | Required, valid email format |
  | `password` | Required |
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "jwt_access_token",
      "mustResetPassword": false
    },
    "errors": null
  }
  ```
- **Error Responses:**
  - **400 Bad Request:**
    ```json
    {
      "success": false,
      "message": "Invalid input data",
      "data": null,
      "errors": {
        "field": "Field validation error message"
      }
    }
    ```
  - **401 Unauthorized:**
    ```json
    {
      "success": false,
      "message": "Invalid email or password",
      "data": null,
      "errors": {
        "field": "Field validation error message"
      }
    }
    ```

#### **2. Logout User**

- **Endpoint:** `POST /auth/logout`
- **Access:** Authenticated Users (JWT Required)
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logout successful",
    "data": null,
    "errors": null
  }
  ```
- **Error Responses:**
  - **401 Unauthorized:**
    ```json
    {
      "success": false,
      "message": "Invalid or expired token",
      "data": null,
      "errors": {
        "field": "Field validation error message"
      }
    }
    ```

#### **3. Get Current User**

- **Endpoint:** `GET /users/me`
- **Access:** Authenticated Users (JWT Required)
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "id": "uuid-john-doe",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "PROJECT_MANAGER",
      "mustResetPassword": false,
      "isActive": true
    },
    "errors": null
  }
  ```

#### **4. Change Password**

- **Endpoint:** `POST /users/me/change-password`
- **Access:** Authenticated Users (JWT Required)
- **Request Body:**
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword123!"
  }
  ```
- **Validation Rules:**
  | Field | Validation |
  | :--- | :--- |
  | `currentPassword` | Required |
  | `newPassword` | Required, Minimum 8 characters, must contain uppercase, lowercase, number, and special character |
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password updated successfully",
    "data": null,
    "errors": null
  }
  ```
- **Error Responses:**
  - **400 Bad Request:**
    ```json
    {
      "success": false,
      "message": "Password does not meet security requirements",
      "data": null,
      "errors": null
    }
    ```
  - **401 Unauthorized:**
    ```json
    {
      "success": false,
      "message": "Current password is incorrect",
      "data": null,
      "errors": null
    }
    ```

#### **5. Forgot Password**

- **Endpoint:** `POST /auth/forgot-password`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "john@example.com"
  }
  ```
- **Validation Rules:**
  | Field | Validation |
  | :--- | :--- |
  | `email` | Required, valid email format |
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password reset instructions sent successfully",
    "data": null,
    "errors": null
  }
  ```
- **Error Responses:**
  - **404 Not Found:**
    ```json
    {
      "success": false,
      "message": "User not found",
      "data": null,
      "errors": null
    }
    ```

#### **6. Reset Password**

- **Endpoint:** `POST /auth/reset-password`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "token": "reset_token",
    "newPassword": "NewPassword123!"
  }
  ```
- **Validation Rules:**
  | Field | Validation |
  | :--- | :--- |
  | `token` | Required |
  | `newPassword` | Required, Minimum 8 characters, must satisfy password policy |
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password reset successfully",
    "data": null,
    "errors": null
  }
  ```
- **Error Responses:**
  - **400 Bad Request:**
    ```json
    {
      "success": false,
      "message": "Invalid or expired reset token",
      "data": null,
      "errors": {
        "field": "Field validation error message"
      }
    }
    ```

#### **7. First Login Password Setup**

- **Endpoint:** `POST /auth/first-login-reset`
- **Access:** Authenticated Users (JWT Required)
- **Request Body:**
  ```json
  {
    "temporaryPassword": "TempPassword123",
    "newPassword": "SecurePassword123!"
  }
  ```
- **Validation Rules:**
  | Field | Validation |
  | :--- | :--- |
  | `temporaryPassword` | Required |
  | `newPassword` | Required, must satisfy password policy |
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password setup completed successfully",
    "data": null,
    "errors": null
  }
  ```
- **Error Responses:**
  - **401 Unauthorized:**
    ```json
    {
      "success": false,
      "message": "Invalid temporary password",
      "data": null,
      "errors": {
        "field": "Field validation error message"
      }
    }
    ```

#### **8. Refresh Session**

- **Endpoint:** `POST /auth/refresh-token`
- **Access:** Authenticated Users (Refresh Token Required)
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
      "token": "new_jwt_access_token"
    },
    "errors": null
  }
  ```
- **Error Responses:**
  - **401 Unauthorized:**
    ```json
    {
      "success": false,
      "message": "Invalid refresh token",
      "data": null,
      "errors": {
        "field": "Field validation error message"
      }
    }
    ```

---

### **3.2. User Management Module**

- **Purpose:** Manage system users, accounts, statuses, and role assignments.
- **Access Control:** Administrator Only.

#### **1. Create User**

- **Endpoint:** `POST /users`
- **Access:** Administrator
- **Request Body:**
  ```json
  {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "roleId": 2
  }
  ```
- **Validation Rules:**
  | Field | Rule |
  | :--- | :--- |
  | `name` | Required, Minimum 3 characters |
  | `email` | Required, valid email format, unique |
  | `roleId` | Required, must exist in roles table |
- **System Behavior:**
  - Generates temporary password.
  - Hashes password using Argon2.
  - Sets `mustResetPassword = true`.
  - Sends onboarding email with temporary password.
  - Stores user in the database.
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "User created successfully",
    "data": {
      "id": "uuid-jane-smith",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "Project Manager"
    },
    "errors": null
  }
  ```
- **Error Responses:**
  - **400 Bad Request:**
    ```json
    {
      "success": false,
      "message": "Validation failed",
      "data": null,
      "errors": {
        "field": "Field validation error message"
      }
    }
    ```
  - **409 Conflict:**
    ```json
    {
      "success": false,
      "message": "Email already exists",
      "data": null,
      "errors": null
    }
    ```
  - **403 Forbidden:**
    ```json
    {
      "success": false,
      "message": "Access denied",
      "data": null,
      "errors": null
    }
    ```

#### **2. View All Users**

- **Endpoint:** `GET /users`
- **Access:** Administrator
- **Query Parameters:**
  - `page`: Integer (default 1)
  - `limit`: Integer (default 10)
  - `search`: String
  - _Example:_ `?page=1&limit=10&search=john`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "uuid-john-doe",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "Project Manager",
        "isActive": true
      }
    ],
    "errors": null
  }
  ```
- **Error Responses:**
  - **401 Unauthorized:**
    ```json
    {
      "success": false,
      "message": "Authentication required",
      "data": null,
      "errors": null
    }
    ```
  - **403 Forbidden:**
    ```json
    {
      "success": false,
      "message": "Access denied",
      "data": null,
      "errors": null
    }
    ```

#### **3. View User**

- **Endpoint:** `GET /users/:id`
- **Access:** Administrator
- **Path Parameters:**
  - `id`: User ID (UUID string)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "id": "uuid-john-doe",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Project Manager",
      "isActive": true,
      "createdAt": "2026-06-05T10:00:00Z"
    },
    "errors": null
  }
  ```
- **Error Responses:**
  - **404 Not Found:**
    ```json
    {
      "success": false,
      "message": "User not found",
      "data": null,
      "errors": null
    }
    ```

#### **4. Update User**

- **Endpoint:** `PUT /users/:id`
- **Access:** Administrator
- **Path Parameters:**
  - `id`: User ID
- **Request Body:**
  ```json
  {
    "name": "John Updated",
    "email": "johnupdated@example.com",
    "roleId": 3
  }
  ```
- **Validation Rules:**
  | Field | Rule |
  | :--- | :--- |
  | `name` | Required |
  | `email` | Valid email format, must remain unique |
  | `roleId` | Must exist |
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User updated successfully",
    "data": null,
    "errors": null
  }
  ```

#### **5. Deactivate User**

- **Endpoint:** `PATCH /users/:id/deactivate`
- **Access:** Administrator
- **System Behavior:** Sets user `isActive = false`, preventing active logins.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User deactivated successfully",
    "data": null,
    "errors": null
  }
  ```

#### **6. Activate User**

- **Endpoint:** `PATCH /users/:id/activate`
- **Access:** Administrator
- **System Behavior:** Sets user `isActive = true`, restoring login rights.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User activated successfully",
    "data": null,
    "errors": null
  }
  ```

#### **7. Delete User**

- **Endpoint:** `DELETE /users/:id`
- **Access:** Administrator
- **Validation Rules:**
  - User must exist.
  - User ownership dependencies (e.g. project ownership) must be verified and clean.
  - User audit logs must be maintained where required.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User deleted successfully",
    "data": null,
    "errors": null
  }
  ```

#### **8. Search Users**

- **Endpoint:** `GET /users/search`
- **Access:** Administrator
- **Query Parameters:** `?q=john`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "uuid-john-doe",
        "name": "John Doe",
        "email": "john@example.com"
      }
    ],
    "errors": null
  }
  ```

#### **9. Filter Users**

- **Endpoint:** `GET /users/filter`
- **Access:** Administrator
- **Query Parameters:** `?role=Project Manager&status=active`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [],
    "errors": null
  }
  ```

---

### **3.3. Project Management Module**

- **Purpose:** Manage projects within the system, including project creation, updates, ownership, archiving, completion, and deletion.
- **Access Control:** `ADMIN` and `PROJECT_MANAGER` have full access. `COLLABORATOR` users have read-only access to their assigned projects.

#### **1. Create Project**

- **Endpoint:** `POST /projects`
- **Access:** Administrator, Project Manager
- **Request Body:**
  ```json
  {
    "name": "Task Management System",
    "description": "Final Year Group Project",
    "endDate": "2026-12-31T23:59:59.999Z"
  }
  ```
- **Validation Rules:**
  | Field | Rule |
  | :--- | :--- |
  | `name` | Required, Minimum 3 characters |
  | `description` | Optional |
  | `endDate` | Optional, must be valid future ISO 8601 date string |
  | `ownerId` | Derived from authenticated user |
- **System Behavior:**
  - Create project record.
  - Set owner as authenticated user.
  - Set status = ACTIVE.
  - Log project creation activity.
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Project created successfully",
    "data": {
      "id": "uuid-project-1",
      "name": "Task Management System",
      "status": "ACTIVE",
      "endDate": "2026-12-31T23:59:59.999Z"
    },
    "errors": null
  }
  ```
- **Error Responses:**
  - **400 Bad Request:**
    ```json
    {
      "success": false,
      "message": "Validation failed",
      "data": null,
      "errors": {
        "field": "Field validation error message"
      }
    }
    ```
  - **403 Forbidden:**
    ```json
    {
      "success": false,
      "message": "Access denied",
      "data": null,
      "errors": null
    }
    ```

#### **2. View All Projects**

- **Endpoint:** `GET /projects`
- **Access:** Administrator, Project Manager, Collaborator (Filtered to memberships)
- **Query Parameters:** `?page=1&limit=10&status=ACTIVE`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "uuid-project-1",
        "name": "Task Management System",
        "status": "ACTIVE",
        "endDate": "2026-12-31T23:59:59.999Z",
        "createdAt": "2026-06-05T10:00:00Z"
      }
    ],
    "errors": null
  }
  ```

#### **3. View Project**

- **Endpoint:** `GET /projects/:id`
- **Access:** Administrator, Project Manager, Project Member
- **Path Parameters:**
  - `id`: Project ID
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "id": "uuid-project-1",
      "name": "Task Management System",
      "description": "Final Year Group Project",
      "status": "ACTIVE",
      "endDate": "2026-12-31T23:59:59.999Z",
      "createdAt": "2026-06-05T10:00:00Z"
    },
    "errors": null
  }
  ```
- **Error Responses:**
  - **404 Not Found:**
    ```json
    {
      "success": false,
      "message": "Project not found",
      "data": null,
      "errors": null
    }
    ```

#### **4. Update Project**

- **Endpoint:** `PUT /projects/:id`
- **Access:** Administrator, Project Manager
- **Path Parameters:**
  - `id`: Project ID
- **Request Body:**
  ```json
  {
    "name": "Updated Project Name",
    "description": "Updated Description",
    "endDate": "2026-12-31T23:59:59.999Z"
  }
  ```
- **Validation Rules:**
  | Field | Rule |
  | :--- | :--- |
  | `name` | Required, Minimum 3 characters |
  | `endDate` | Optional, must be valid future ISO 8601 date string |
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Project updated successfully",
    "data": null,
    "errors": null
  }
  ```

#### **5. Change Project Status**

- **Endpoint:** `PATCH /projects/:id/status`
- **Access:** Administrator, Project Manager
- **Request Body:**
  ```json
  {
    "status": "COMPLETED"
  }
  ```
- **Allowed Values:** `ACTIVE`, `ARCHIVED`, `COMPLETED`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Project status updated successfully",
    "data": null,
    "errors": null
  }
  ```

#### **6. Archive Project**

- **Endpoint:** `PATCH /projects/:id/archive`
- **Access:** Administrator, Project Manager
- **System Behavior:** Sets project status to `ARCHIVED`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Project archived successfully",
    "data": null,
    "errors": null
  }
  ```

#### **7. Complete Project**

- **Endpoint:** `PATCH /projects/:id/complete`
- **Access:** Administrator, Project Manager
- **System Behavior:** Sets project status to `COMPLETED`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Project completed successfully",
    "data": null,
    "errors": null
  }
  ```

#### **8. Delete Project**

- **Endpoint:** `DELETE /projects/:id`
- **Access:** Administrator Only
- **Validation Rules:**
  - Project must exist.
  - Check related tasks, comments, and attachments.
  - Maintain system logs before deleting.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Project deleted successfully",
    "data": null,
    "errors": null
  }
  ```

#### **9. Search Projects**

- **Endpoint:** `GET /projects/search`
- **Access:** Administrator, Project Manager
- **Query Parameters:** `?q=task`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [],
    "errors": null
  }
  ```

#### **10. Filter Projects**

- **Endpoint:** `GET /projects/filter`
- **Access:** Administrator, Project Manager
- **Query Parameters:** `?status=ACTIVE`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [],
    "errors": null
  }
  ```

---

### **3.4. Project Member Module**

- **Purpose:** Manage project membership by mapping users to projects and defining project-level roles.
- **Access Control:** `ADMIN` has full access. `PROJECT_MANAGER` has full access to projects they manage. `COLLABORATOR` can only query their own project memberships.

#### **1. Add Member to Project**

- **Endpoint:** `POST /projects/:id/members`
- **Access:** Administrator, Project Manager
- **Path Parameters:**
  - `id`: Project ID
- **Request Body:**
  ```json
  {
    "userId": "uuid-user-5",
    "role": "COLLABORATOR"
  }
  ```
- **Validation Rules:**
  | Field | Rule |
  | :--- | :--- |
  | `userId` | Required, must exist in database |
  | `role` | Required, must be `PROJECT_MANAGER` or `COLLABORATOR` |
  | `userId` | Must not already belong to project |
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Project member added successfully",
    "data": {
      "projectId": "uuid-project-1",
      "userId": "uuid-user-5",
      "role": "COLLABORATOR"
    },
    "errors": null
  }
  ```
- **Error Responses:**
  - **404 Not Found:**
    ```json
    {
      "success": false,
      "message": "User or project not found",
      "data": null,
      "errors": null
    }
    ```
  - **409 Conflict:**
    ```json
    {
      "success": false,
      "message": "User already belongs to this project",
      "data": null,
      "errors": null
    }
    ```

#### **2. View Project Members**

- **Endpoint:** `GET /projects/:id/members`
- **Access:** Administrator, Project Manager, Project Member
- **Path Parameters:**
  - `id`: Project ID
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "userId": "uuid-user-5",
        "name": "Jane Smith",
        "role": "COLLABORATOR",
        "joinedAt": "2026-06-05T10:00:00Z"
      }
    ],
    "errors": null
  }
  ```

#### **3. View Member Details**

- **Endpoint:** `GET /projects/:id/members/:userId`
- **Access:** Administrator, Project Manager
- **Path Parameters:**
  - `id`: Project ID
  - `userId`: User ID
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "userId": "uuid-user-5",
      "name": "Jane Smith",
      "role": "COLLABORATOR",
      "joinedAt": "2026-06-05T10:00:00Z"
    },
    "errors": null
  }
  ```

#### **4. Update Member Role**

- **Endpoint:** `PATCH /projects/:id/members/:userId`
- **Access:** Administrator, Project Manager
- **Path Parameters:**
  - `id`: Project ID
  - `userId`: User ID
- **Request Body:**
  ```json
  {
    "role": "PROJECT_MANAGER"
  }
  ```
- **Allowed Values:** `PROJECT_MANAGER`, `COLLABORATOR`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Project member role updated successfully",
    "data": null,
    "errors": null
  }
  ```

#### **5. Assign Project Manager**

- **Endpoint:** `PATCH /projects/:id/members/:userId/project-manager`
- **Access:** Administrator Only
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User assigned as Project Manager",
    "data": null,
    "errors": null
  }
  ```

#### **6. Assign Collaborator**

- **Endpoint:** `PATCH /projects/:id/members/:userId/collaborator`
- **Access:** Administrator, Project Manager
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User assigned as Collaborator",
    "data": null,
    "errors": null
  }
  ```

#### **7. Remove Member from Project**

- **Endpoint:** `DELETE /projects/:id/members/:userId`
- **Access:** Administrator, Project Manager
- **Path Parameters:**
  - `id`: Project ID
  - `userId`: User ID
- **Validation Rules:**
  - Project must exist.
  - User must belong to project.
  - Project owner cannot be removed without ownership transfer.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Project member removed successfully",
    "data": null,
    "errors": null
  }
  ```
- **Error Responses:**
  - **404 Not Found:**
    ```json
    {
      "success": false,
      "message": "Project member not found",
      "data": null,
      "errors": null
    }
    ```

---

### **3.5. Task Management Module**

- **Purpose:** Core module for managing task objects throughout their lifecycle.
- **Access Control:** `PROJECT_MANAGER` has full access. `COLLABORATOR` has limited access (view assigned, status updates, detail retrieval).

#### **1. Create Task**

- **Endpoint:** `POST /tasks`
- **Access:** Project Manager
- **Request Body:**
  ```json
  {
    "title": "Implement Authentication Module",
    "description": "Develop login and JWT authentication",
    "projectId": "uuid-project-1",
    "priority": "HIGH",
    "dueDate": "2026-06-15T23:59:59Z",
    "tags": ["Feature", "Backend"],
    "position": 1000
  }
  ```
- **Validation Rules:**
  | Field | Rule |
  | :--- | :--- |
  | `title` | Required, Minimum 3 characters |
  | `projectId` | Required, must exist |
  | `priority` | `LOW`, `MEDIUM`, `HIGH` |
  | `dueDate` | Must be a future date |
  | `tags` | Optional, array of strings |
  | `position` | Optional, Float (default: 0) |
- **System Behavior:**
  - Create task record.
  - Set status = TODO.
  - Record activity log.
  - Trigger push notification if assignees are mapped.
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Task created successfully",
    "data": {
      "id": "uuid-task-1",
      "title": "Implement Authentication Module",
      "status": "TODO",
      "tags": ["Feature", "Backend"],
      "position": 1000
    },
    "errors": null
  }
  ```
- **Error Responses:**
  - **400 Bad Request:**
    ```json
    {
      "success": false,
      "message": "Validation failed",
      "data": null,
      "errors": {
        "field": "Field validation error message"
      }
    }
    ```
  - **404 Not Found:**
    ```json
    {
      "success": false,
      "message": "Project not found",
      "data": null,
      "errors": null
    }
    ```

#### **2. View All Tasks**

- **Endpoint:** `GET /tasks`
- **Access:** Project Manager, Collaborator
- **Query Parameters:** `?page=1&limit=10&status=TODO&priority=HIGH&tags=Backend`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "uuid-task-1",
        "title": "Implement Authentication Module",
        "status": "TODO",
        "priority": "HIGH",
        "tags": ["Feature", "Backend"],
        "position": 1000
      }
    ],
    "errors": null
  }
  ```

#### **3. View Task**

- **Endpoint:** `GET /tasks/:id`
- **Access:** Project Manager, Collaborator
- **Path Parameters:**
  - `id`: Task ID
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "id": "uuid-task-1",
      "title": "Implement Authentication Module",
      "description": "Develop login and JWT authentication",
      "status": "TODO",
      "priority": "HIGH",
      "dueDate": "2026-06-15T23:59:59Z",
      "tags": ["Feature", "Backend"],
      "position": 1000
    },
    "errors": null
  }
  ```

#### **4. Update Task**

- **Endpoint:** `PUT /tasks/:id`
- **Access:** Project Manager
- **Path Parameters:**
  - `id`: Task ID
- **Request Body:**
  ```json
  {
    "title": "Updated Task Title",
    "description": "Updated description",
    "priority": "MEDIUM",
    "dueDate": "2026-06-20T23:59:59Z",
    "tags": ["Feature", "Backend", "UI-Refactor"],
    "position": 1500
  }
  ```
- **Validation Rules:**
  - Task must exist.
  - Title required.
  - Due date must be valid.
  - Priority must match enum values.
  - Tags must be an array of strings.
  - Position must be a float (optional).
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Task updated successfully",
    "data": null,
    "errors": null
  }
  ```

#### **5. Delete Task**

- **Endpoint:** `DELETE /tasks/:id`
- **Access:** Project Manager
- **Validation Rules:**
  - Task must exist.
  - Related records (comments, S3 objects) are deleted cleanly.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Task deleted successfully",
    "data": null,
    "errors": null
  }
  ```

#### **6. Change Task Status**

- **Endpoint:** `PATCH /tasks/:id/status`
- **Access:** Project Manager, Collaborator
- **Request Body:**
  ```json
  {
    "status": "IN_PROGRESS",
    "position": 1250.5
  }
  ```
- **Allowed Values:**
  - `status`: `TODO`, `IN_PROGRESS`, `COMPLETED`
  - `position`: Float (Optional, used to rank the task's vertical position in the Kanban column)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Task status updated successfully",
    "data": null,
    "errors": null
  }
  ```

#### **7. Change Task Priority**

- **Endpoint:** `PATCH /tasks/:id/priority`
- **Access:** Project Manager
- **Request Body:**
  ```json
  {
    "priority": "HIGH"
  }
  ```
- **Allowed Values:** `LOW`, `MEDIUM`, `HIGH`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Task priority updated successfully",
    "data": null,
    "errors": null
  }
  ```

#### **8. Set Due Date**

- **Endpoint:** `PATCH /tasks/:id/due-date`
- **Access:** Project Manager
- **Request Body:**
  ```json
  {
    "dueDate": "2026-06-30T23:59:59Z"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Due date updated successfully",
    "data": null,
    "errors": null
  }
  ```

#### **9. Search Tasks**

- **Endpoint:** `GET /tasks/search`
- **Access:** Project Manager, Collaborator
- **Query Parameters:** `?q=authentication`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [],
    "errors": null
  }
  ```

#### **10. Filter Tasks**

- **Endpoint:** `GET /tasks/filter`
- **Access:** Project Manager, Collaborator
- **Query Parameters:** `?status=TODO&priority=HIGH&projectId=uuid-project-1&tags=Backend`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [],
    "errors": null
  }
  ```

#### **11. Track Task Progress**

- **Endpoint:** `GET /tasks/:id/progress`
- **Access:** Project Manager, Collaborator
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "taskId": "uuid-task-1",
      "status": "IN_PROGRESS",
      "completionPercentage": 50
    },
    "errors": null
  }
  ```

---

### **3.6. Task Assignment Module**

- **Purpose:** Manage task ownership and user responsibility by mapping tasks to users.
- **Access Control:** `PROJECT_MANAGER` has full access.

#### **1. Assign Task**

- **Endpoint:** `POST /tasks/:id/assignments`
- **Access:** Project Manager
- **Path Parameters:**
  - `id`: Task ID
- **Request Body:**
  ```json
  {
    "userId": "uuid-user-5"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "User assigned to task successfully",
    "data": {
      "taskId": "uuid-task-1",
      "userId": "uuid-user-5"
    },
    "errors": null
  }
  ```

#### **2. Reassign Task**

- **Endpoint:** `PUT /tasks/:id/assignments/:userId`
- **Access:** Project Manager
- **Path Parameters:**
  - `id`: Task ID
  - `userId`: Assigned User ID to replace
- **Request Body:**
  ```json
  {
    "newUserId": "uuid-user-6"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Task assignment updated successfully",
    "data": null,
    "errors": null
  }
  ```

#### **3. Remove Assignment**

- **Endpoint:** `DELETE /tasks/:id/assignments/:userId`
- **Access:** Project Manager
- **Path Parameters:**
  - `id`: Task ID
  - `userId`: User ID to unassign
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User unassigned from task successfully",
    "data": null,
    "errors": null
  }
  ```

#### **4. View Task Assignees**

- **Endpoint:** `GET /tasks/:id/assignments`
- **Access:** Project Manager
- **Path Parameters:**
  - `id`: Task ID
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "uuid-user-5",
        "name": "Jane Smith",
        "email": "jane@example.com"
      }
    ],
    "errors": null
  }
  ```

#### **5. View Assigned Tasks**

- **Endpoint:** `GET /users/:id/tasks`
- **Access:** Project Manager, Collaborator
- **Path Parameters:**
  - `id`: User ID
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "uuid-task-1",
        "title": "Implement Authentication Module",
        "status": "TODO"
      }
    ],
    "errors": null
  }
  ```

#### **6. Track Assignment History**

- **Endpoint:** `GET /tasks/:id/assignment-history`
- **Access:** Project Manager
- **Path Parameters:**
  - `id`: Task ID
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "userId": "uuid-user-5",
        "action": "ASSIGNED",
        "timestamp": "2026-06-05T09:15:00Z"
      }
    ],
    "errors": null
  }
  ```

---

### **3.7. Comment Module**

- **Purpose:** Enable collaboration and task discussion logs.
- **Access Control:** `PROJECT_MANAGER`, `COLLABORATOR` (must be project member).

#### **1. Add Comment**

- **Endpoint:** `POST /tasks/:id/comments`
- **Access:** Project Manager, Collaborator
- **Path Parameters:**
  - `id`: Task ID
- **Request Body:**
  ```json
  {
    "content": "Authentication API has been completed."
  }
  ```
- **Validation Rules:**
  | Field | Rule |
  | :--- | :--- |
  | `content` | Required, 1 to 1000 characters |
  | `taskId` | Must exist |
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Comment added successfully",
    "data": {
      "id": "uuid-comment-1",
      "content": "Authentication API has been completed."
    },
    "errors": null
  }
  ```
- **Error Responses:**
  - **400 Bad Request:**
    ```json
    {
      "success": false,
      "message": "Comment content is required",
      "data": null,
      "errors": null
    }
    ```
  - **404 Not Found:**
    ```json
    {
      "success": false,
      "message": "Task not found",
      "data": null,
      "errors": null
    }
    ```

#### **2. View Comments**

- **Endpoint:** `GET /tasks/:id/comments`
- **Access:** Project Manager, Collaborator
- **Path Parameters:**
  - `id`: Task ID
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "uuid-comment-1",
        "content": "Authentication API has been completed.",
        "userId": "uuid-user-5",
        "userName": "Jane Smith",
        "createdAt": "2026-06-05T10:00:00Z"
      }
    ],
    "errors": null
  }
  ```

#### **3. Update Comment**

- **Endpoint:** `PUT /comments/:id`
- **Access:** Comment Owner, Administrator
- **Path Parameters:**
  - `id`: Comment ID
- **Request Body:**
  ```json
  {
    "content": "Authentication API and Swagger documentation completed."
  }
  ```
- **Validation Rules:**
  | Field | Rule |
  | :--- | :--- |
  | `content` | Required, maximum 1000 characters |
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Comment updated successfully",
    "data": null,
    "errors": null
  }
  ```
- **Error Responses:**
  - **403 Forbidden:**
    ```json
    {
      "success": false,
      "message": "You can only edit your own comments",
      "data": null,
      "errors": null
    }
    ```
  - **404 Not Found:**
    ```json
    {
      "success": false,
      "message": "Comment not found",
      "data": null,
      "errors": null
    }
    ```

#### **4. Delete Comment**

- **Endpoint:** `DELETE /comments/:id`
- **Access:** Comment Owner, Administrator
- **Path Parameters:**
  - `id`: Comment ID
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Comment deleted successfully",
    "data": null,
    "errors": null
  }
  ```
- **Error Responses:**
  - **403 Forbidden:**
    ```json
    {
      "success": false,
      "message": "You can only delete your own comments",
      "data": null,
      "errors": null
    }
    ```

#### **5. View Comment History**

- **Endpoint:** `GET /comments/:id/history`
- **Access:** Administrator, Project Manager
- **Path Parameters:**
  - `id`: Comment ID
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "action": "UPDATED",
        "timestamp": "2026-06-05T11:00:00Z",
        "updatedBy": "Jane Smith"
      }
    ],
    "errors": null
  }
  ```

#### **6. View Task Discussions**

- **Endpoint:** `GET /tasks/:id/discussions`
- **Access:** Project Manager, Collaborator
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "taskId": "uuid-task-1",
      "comments": []
    },
    "errors": null
  }
  ```

---

### **3.8. Attachment Module**

- **Purpose:** Handles files and documents attached to tasks. It utilizes direct S3 upload routing (bypassing backend) via presigned URLs and registers file metadata in the database.
- **Access Control:** `PROJECT_MANAGER` and `COLLABORATOR` (must be project member). Attachment owner, PM, or Administrator can delete.

#### **Direct-to-S3 Upload Protocol**

To prevent server throughput bottlenecking:

1. Client requests presigned upload URL: `POST /attachments/presigned-url`
2. Server generates presigned PUT URL and `fileKey`.
3. Client PUTs file object binary directly to the S3 bucket URL.
4. Client logs metadata on task: `POST /tasks/:id/attachments`
5. Viewing and downloads are served using short-lived (15 minutes) GET URLs returned in task payload queries.

#### **1. Request Presigned Upload URL**

- **Endpoint:** `POST /attachments/presigned-url`
- **Access:** Project Manager, Collaborator
- **Request Body:**
  ```json
  {
    "filename": "project-design.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1024500
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Presigned upload URL generated successfully.",
    "data": {
      "uploadUrl": "https://r2.cloudflare.com/bucket/1717588321_project-design.pdf?signature=...",
      "fileKey": "1717588321_project-design.pdf"
    },
    "errors": null
  }
  ```

#### **2. Register Uploaded Attachment Metadata**

- **Endpoint:** `POST /tasks/:id/attachments`
- **Access:** Project Manager, Collaborator
- **Path Parameters:**
  - `id`: Task ID
- **Request Body:**
  ```json
  {
    "filename": "project-design.pdf",
    "fileKey": "1717588321_project-design.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1024500
  }
  ```
- **Validation Rules:**
  | Field | Rule |
  | :--- | :--- |
  | `filename` | Required |
  | `fileKey` | Required |
  | `mimeType` | Required, must be supported type (PDF, ZIP, DOC, JPG, etc.) |
  | `fileSize` | Required, Maximum size 10MB |
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Attachment uploaded successfully",
    "data": {
      "id": "uuid-attach-1",
      "filename": "project-design.pdf",
      "fileUrl": "/uploads/project-design.pdf"
    },
    "errors": null
  }
  ```

#### **3. View Attachment Metadata**

- **Endpoint:** `GET /attachments/:id`
- **Access:** Project Manager, Collaborator
- **Path Parameters:**
  - `id`: Attachment ID
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "id": "uuid-attach-1",
      "filename": "project-design.pdf",
      "uploadedBy": "Jane Smith",
      "createdAt": "2026-06-05T10:00:00Z"
    },
    "errors": null
  }
  ```

#### **4. Download Attachment**

- **Endpoint:** `GET /attachments/:id/download`
- **Access:** Project Manager, Collaborator
- **Success Response (200 OK):**
  Returns redirect stream or presigned download URL endpoint structure.
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "downloadUrl": "https://r2.cloudflare.com/bucket/1717588321_project-design.pdf?Expires=1717589221&Signature=..."
    },
    "errors": null
  }
  ```

#### **5. Delete Attachment**

- **Endpoint:** `DELETE /attachments/:id`
- **Access:** Attachment Owner, PM, Admin
- **System Behavior:**
  - Delete object from physical S3 storage.
  - Delete database record.
  - Log deletion activity.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Attachment deleted successfully",
    "data": null,
    "errors": null
  }
  ```

#### **6. View All Attachments on Task**

- **Endpoint:** `GET /tasks/:id/attachments`
- **Access:** Project Manager, Collaborator
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "uuid-attach-1",
        "filename": "project-design.pdf",
        "fileUrl": "https://s3.url/presigned-get-endpoint"
      }
    ],
    "errors": null
  }
  ```

#### **7. Manage Task Files**

- **Endpoint:** `GET /tasks/:id/files`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "taskId": "uuid-task-1",
      "totalFiles": 5,
      "attachments": []
    },
    "errors": null
  }
  ```

---

### **3.9. Notification Module**

- **Purpose:** Manage persistent database notifications and VAPID push notification subscriptions.
- **Access Control:** All authenticated users (resource scoped to user).

#### **Notification Types**

`TASK_ASSIGNED`, `STATUS_CHANGED`, `DEADLINE_ALERT`, `COMMENT_ADDED`, `ADMIN_UPDATE`

#### **1. View Notifications**

- **Endpoint:** `GET /notifications`
- **Query Parameters:** `?page=1&limit=10&isRead=false`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "uuid-notif-1",
        "message": "You have been assigned a new task",
        "type": "TASK_ASSIGNED",
        "isRead": false,
        "createdAt": "2026-06-05T10:00:00Z"
      }
    ],
    "errors": null
  }
  ```

#### **2. View Notification History**

- **Endpoint:** `GET /notifications/history`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [],
    "errors": null
  }
  ```

#### **3. Mark Notification as Read**

- **Endpoint:** `PATCH /notifications/:id/read`
- **System Behavior:** Sets notification `isRead = true`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Notification marked as read",
    "data": null,
    "errors": null
  }
  ```

#### **4. Mark All Notifications as Read**

- **Endpoint:** `PATCH /notifications/read-all`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "All notifications marked as read",
    "data": null,
    "errors": null
  }
  ```

#### **5. Get Unread Notification Count**

- **Endpoint:** `GET /notifications/unread-count`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "unreadCount": 5
    },
    "errors": null
  }
  ```

#### **6. Delete Notification**

- **Endpoint:** `DELETE /notifications/:id`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Notification deleted successfully",
    "data": null,
    "errors": null
  }
  ```

#### **7. Get VAPID Public Key**

- **Endpoint:** `GET /push/key`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "publicKey": "VAPID_PUBLIC_KEY_STRING"
    },
    "errors": null
  }
  ```

#### **8. Subscribe to Push Notifications**

- **Endpoint:** `POST /push/subscribe`
- **Request Body:**
  ```json
  {
    "endpoint": "https://updates.push.services.mozilla.com/push/v1/...",
    "keys": {
      "p256dh": "BFC...",
      "auth": "Xz..."
    }
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Subscribed to push notifications successfully.",
    "data": null,
    "errors": null
  }
  ```

#### **9. Unsubscribe from Push Notifications**

- **Endpoint:** `POST /push/unsubscribe`
- **Request Body:**
  ```json
  {
    "endpoint": "https://updates.push.services.mozilla.com/push/v1/..."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Unsubscribed from push notifications successfully.",
    "data": null,
    "errors": null
  }
  ```

#### **WebSocket Room Architecture**

For scalability, efficiency, and security, clients do not receive a global feed of events. Instead, the Socket.io server implements **Project-Specific Rooms**:

1. **Authentication Handshake:**
   - When a client initiates a WebSocket connection, they must send their JWT in the handshake query or headers (`auth: { token: "jwt_token" }`).
   - The server validates the JWT and decodes the `userId`. If invalid, the connection is closed.

2. **Joining Rooms:**
   - Once connected, the client requests to subscribe/join rooms corresponding to projects they belong to.
   - For each project membership, the client emits a `join_project` event:
     ```json
     { "projectId": "uuid-project-1" }
     ```
   - The server verifies that the authenticated user is either an **Admin**, the **Project Owner**, or is present in the **ProjectMember** association table for the requested `projectId`.
   - If authorized, the server calls `socket.join("project:uuid-project-1")`.

3. **Event Broadcasting:**
   - When a task action occurs (e.g., status changed on the Kanban board, new comment posted), the update is broadcasted only to the relevant project room:
     ```typescript
     io.to(`project:${projectId}`).emit('STATUS_CHANGED', payload);
     ```
   - This ensures data isolation and that only project members receive notifications.

- **Connection Endpoint:** `ws://domain/ws/notifications` (WSS in Production)
- **Events Supported:**
  - **`TASK_ASSIGNED`**
    ```json
    {
      "type": "TASK_ASSIGNED",
      "message": "You have been assigned a task",
      "taskId": "uuid-task-1",
      "timestamp": "2026-06-05T10:00:00Z"
    }
    ```
  - **`STATUS_CHANGED`**
    ```json
    {
      "type": "STATUS_CHANGED",
      "message": "Task status updated",
      "taskId": "uuid-task-1",
      "newStatus": "COMPLETED"
    }
    ```
  - **`DEADLINE_ALERT`**
    ```json
    {
      "type": "DEADLINE_ALERT",
      "message": "Task deadline approaching",
      "taskId": "uuid-task-1"
    }
    ```
  - **`COMMENT_ADDED`**
    ```json
    {
      "type": "COMMENT_ADDED",
      "message": "New comment added",
      "taskId": "uuid-task-1",
      "commentId": "uuid-comment-1"
    }
    ```
  - **`ADMIN_UPDATE`**
    ```json
    {
      "type": "ADMIN_UPDATE",
      "message": "System maintenance scheduled"
    }
    ```

---

### **3.10. Task Activity Module**

- **Purpose:** Track activity history audit logs for task management metrics.
- **Access Control:** `ADMIN` (system wide), `PROJECT_MANAGER` (project tasks), `COLLABORATOR` (assigned tasks).

#### **1. View Task Activity Log**

- **Endpoint:** `GET /tasks/:id/activity`
- **Query Parameters:** `?page=1&limit=10&action=UPDATED`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": 101,
        "taskId": "uuid-task-1",
        "userId": "uuid-user-5",
        "userName": "Jane Smith",
        "action": "UPDATED",
        "description": "Task description updated",
        "createdAt": "2026-06-05T10:00:00Z"
      }
    ],
    "errors": null
  }
  ```

#### **2. View Task Status Changes**

- **Endpoint:** `GET /tasks/:id/activity/status-changes`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": 102,
        "taskId": "uuid-task-1",
        "userId": "uuid-user-5",
        "userName": "Jane Smith",
        "action": "COMPLETED",
        "description": "Task status changed to COMPLETED",
        "createdAt": "2026-06-05T11:30:00Z"
      }
    ],
    "errors": null
  }
  ```

#### **3. View Task Assignment History**

- **Endpoint:** `GET /tasks/:id/activity/assignments`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": 103,
        "taskId": "uuid-task-1",
        "userId": "uuid-user-3",
        "userName": "Sarah Manager",
        "action": "ASSIGNED",
        "description": "Assigned task to Jane Smith",
        "createdAt": "2026-06-05T09:15:00Z"
      }
    ],
    "errors": null
  }
  ```

#### **4. View Task Comment Activities**

- **Endpoint:** `GET /tasks/:id/activity/comments`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": 104,
        "taskId": "uuid-task-1",
        "userId": "uuid-user-5",
        "userName": "Jane Smith",
        "action": "COMMENTED",
        "description": "Added comment: 'Authentication API has been completed.'",
        "createdAt": "2026-06-05T10:05:00Z"
      }
    ],
    "errors": null
  }
  ```

#### **5. View Task Attachment Activities**

- **Endpoint:** `GET /tasks/:id/activity/attachments`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": 105,
        "taskId": "uuid-task-1",
        "userId": "uuid-user-5",
        "userName": "Jane Smith",
        "action": "UPDATED",
        "description": "Uploaded attachment: project-design.pdf",
        "createdAt": "2026-06-05T10:10:00Z"
      }
    ],
    "errors": null
  }
  ```

#### **6. Audit User Actions**

- **Endpoint:** `GET /users/:id/activity`
- **Access:** Administrator Only
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": 101,
        "taskId": "uuid-task-1",
        "userId": "uuid-user-5",
        "action": "UPDATED",
        "description": "Task description updated",
        "createdAt": "2026-06-05T10:00:00Z"
      }
    ],
    "errors": null
  }
  ```

---

## **4. OpenAPI/Swagger Integration & Maintenance**

The system automatically generates OpenAPI spec documentation via the `tsoa` package parsing TypeScript controller decorations.

- **Documentation UI Endpoint:** `/api-docs` (accessible at `http://localhost:5000/api-docs` in development).
- **Documented Modules:** Authentication, User Management, Project Management, Project Member, Task Management, Task Assignment, Comment, Attachment, Notification, Task Activity.
- **Maintenance Requirement:** All new routes must define their route params, method, body interface inputs, success/error models, and authentication parameters in `tsoa` declarations to keep the interactive API exploration valid.

---

## **5. Conceptual Database Model Reference**

These Prisma models represent the structural dependencies required to support the consolidated API specifications.

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
