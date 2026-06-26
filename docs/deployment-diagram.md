# nexTask — Deployment Diagram

This document describes the deployment architecture for the nexTask application, showing how components are deployed, containerized, and how they communicate.

---

## Production Deployment Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["🌐 Web Browser<br/>(React SPA)"]
        SW["Service Worker<br/>(Push Notifications)"]
    end

    subgraph "Reverse Proxy / CDN"
        Nginx["Nginx<br/>(Static File Serving<br/>+ Reverse Proxy)<br/>Port: 8080"]
    end

    subgraph "Application Server"
        Express["Node.js / Express<br/>(REST API Server)<br/>Port: 3000"]
        SocketIO["Socket.IO<br/>(WebSocket Server)<br/>Same Port: 3000"]
        TSOA["TSOA Router<br/>(Auto-generated Routes)"]
        Swagger["Swagger UI<br/>(/api-docs)"]
    end

    subgraph "Database Layer"
        PostgreSQL[("PostgreSQL<br/>Database<br/>Port: 5432")]
    end

    subgraph "External Services"
        S3["☁ S3-Compatible Storage<br/>(AWS S3 / Cloudflare R2 / MinIO)<br/>File Uploads & Downloads"]
        SMTP["✉ SMTP Server<br/>(Gmail / SendGrid)<br/>Email Notifications"]
        WebPush["🔔 Web Push Service<br/>(VAPID Protocol)<br/>Browser Notifications"]
    end

    Browser -->|"HTTPS Requests"| Nginx
    Browser <-->|"WebSocket (wss://)"| SocketIO
    SW <-->|"Push Events"| WebPush

    Nginx -->|"Proxy /api/*"| Express
    Nginx -->|"Serve static assets"| Nginx

    Express --> TSOA
    Express --> Swagger
    Express <--> SocketIO

    TSOA -->|"Prisma ORM Queries"| PostgreSQL
    TSOA -->|"Presigned URLs"| S3
    TSOA -->|"SMTP Emails"| SMTP
    TSOA -->|"Push Payloads"| WebPush
```

---

## Docker Deployment Architecture

```mermaid
graph TB
    subgraph "Docker Host"
        subgraph "nextask_client Container"
            ClientBuild["Vite Production Build<br/>(Static HTML/JS/CSS)"]
            ClientNginx["Nginx Web Server<br/>Port: 80 → Host: 8080"]
        end

        subgraph "nextask_server Container"
            ServerNode["Node.js Runtime<br/>Express + Socket.IO<br/>Port: 3000 → Host: 3000"]
            Prisma["Prisma Client<br/>(Generated)"]
        end

        ClientBuild --> ClientNginx
        ServerNode --> Prisma
    end

    subgraph "External"
        DB[("PostgreSQL<br/>(Cloud / Docker)<br/>Port: 5432")]
        ExtS3["S3 Storage"]
        ExtSMTP["SMTP Server"]
    end

    ClientNginx -->|"env: VITE_API_URL"| ServerNode
    Prisma -->|"env: DATABASE_URL"| DB
    ServerNode -->|"env: S3_*"| ExtS3
    ServerNode -->|"env: SMTP_*"| ExtSMTP
```

### Docker Services Configuration

| Container | Image Base | Exposed Port | Environment |
|-----------|------------|-------------|-------------|
| `nextask_server` | Node.js Alpine | `3000:3000` | `server/.env` |
| `nextask_client` | Nginx Alpine | `8080:80` | `client/.env` |

---

## Network Communication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Nginx
    participant Express
    participant SocketIO
    participant PostgreSQL
    participant S3
    participant SMTP

    Note over Browser, SMTP: Authentication Flow
    Browser->>Nginx: POST /auth/login {email, password}
    Nginx->>Express: Forward request
    Express->>PostgreSQL: Query user by email
    PostgreSQL-->>Express: User record
    Express->>Express: Verify password (Argon2)
    Express->>Express: Generate JWT
    Express-->>Nginx: {token, mustResetPassword}
    Nginx-->>Browser: 200 OK + JWT token

    Note over Browser, SMTP: Real-Time WebSocket Connection
    Browser->>SocketIO: Connect (auth: JWT token)
    SocketIO->>SocketIO: Verify JWT
    SocketIO->>PostgreSQL: Fetch user's project memberships
    SocketIO->>SocketIO: Join project rooms

    Note over Browser, SMTP: Task Creation with Notifications
    Browser->>Nginx: POST /tasks {title, projectId, ...}
    Nginx->>Express: Forward (Authorization: Bearer JWT)
    Express->>Express: JWT verification + RBAC check
    Express->>PostgreSQL: INSERT task
    PostgreSQL-->>Express: Created task
    Express->>SocketIO: broadcastToProject("task:created")
    SocketIO-->>Browser: Real-time task event
    Express-->>Nginx: 201 Created + task data
    Nginx-->>Browser: Response

    Note over Browser, SMTP: File Upload via S3 Presigned URL
    Browser->>Nginx: POST /attachments/presigned-url {filename, mimeType}
    Nginx->>Express: Forward
    Express->>S3: Generate presigned PUT URL
    S3-->>Express: Signed URL + fileKey
    Express-->>Browser: {uploadUrl, fileKey}
    Browser->>S3: PUT file directly to S3
    Browser->>Nginx: POST /tasks/:id/attachments {fileKey, ...}
    Nginx->>Express: Save attachment metadata
    Express->>PostgreSQL: INSERT attachment record

    Note over Browser, SMTP: Email Notification
    Express->>SMTP: Send task assignment email
    SMTP-->>Express: Delivery confirmation
```

---

## Component Deployment Mapping

| Component | Technology | Deployment Target | Notes |
|-----------|-----------|-------------------|-------|
| Frontend SPA | React + Vite | Nginx container / CDN | Static assets served via Nginx |
| REST API | Express + TSOA | Node.js container | Auto-generated routes & Swagger |
| WebSocket Server | Socket.IO | Same Node.js container | Shares port with Express |
| Database | PostgreSQL | Managed DB / Docker | Prisma ORM handles migrations |
| File Storage | AWS SDK | AWS S3 / Cloudflare R2 / MinIO | Presigned URL pattern |
| Email Service | Nodemailer | External SMTP | Gmail App Passwords / SendGrid |
| Push Notifications | web-push | Web Push Protocol (VAPID) | Browser Service Worker |
| API Documentation | Swagger UI | Served by Express at `/api-docs` | Auto-generated from TSOA |

---

## Security Architecture

```mermaid
graph LR
    subgraph "Client Security"
        A["Route Guards<br/>(RequireAuth,<br/>RedirectIfAuthenticated)"]
        B["JWT Token Storage<br/>(Zustand + localStorage)"]
        C["Axios Interceptors<br/>(Auto-attach Bearer token,<br/>401 auto-logout)"]
    end

    subgraph "Transport Security"
        D["HTTPS / WSS<br/>(TLS Encryption)"]
        E["Helmet.js<br/>(Security Headers)"]
        F["CORS Configuration"]
    end

    subgraph "Server Security"
        G["JWT Verification<br/>(expressAuthentication)"]
        H["RBAC Scope Checks<br/>(global:admin, global:pm,<br/>project:member, project:manager)"]
        I["Zod Validation<br/>(Input sanitization)"]
        J["Argon2 Hashing<br/>(Password storage)"]
        K["mustResetPassword Gate<br/>(Force password reset)"]
        L["Account Status Check<br/>(isActive verification)"]
    end

    subgraph "Data Security"
        M["Presigned S3 URLs<br/>(Time-limited access)"]
        N["Dynamic JWT Secrets<br/>(Password-hash-bound reset tokens)"]
        O["Cascade Deletes<br/>(Data cleanup)"]
    end

    A --> D
    B --> C
    C --> D
    D --> E
    E --> G
    G --> H
    H --> I
    I --> J
    G --> K
    G --> L
    H --> M
    K --> N
```

---

## Environment Configuration

| Environment | Frontend URL | Backend URL | Database |
|-------------|-------------|-------------|----------|
| Development | `http://localhost:5173` | `http://localhost:3000` | Local PostgreSQL |
| Docker | `http://localhost:8080` | `http://localhost:3000` | Container / Cloud |
| Production | Custom domain | Custom domain | Managed PostgreSQL (Supabase, AWS RDS, etc.) |
