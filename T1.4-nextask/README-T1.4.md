# T1.4 – User Onboarding Flows

This package implements three interconnected features for nexTask:

1. **First-Login Password Reset** – `mustResetPassword` flag enforcement
2. **User Profile Edit Interface** – full PATCH API + React form
3. **Password Complexity Validation** – frontend + backend (single source of truth)

---

## 📁 Files Changed / Added

```
T1.4-nextask/
├── types/
│   └── src/index.ts               ← NEW  Shared types (UserPublic, payloads, PASSWORD_RULES)
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma          ← MODIFIED  Added mustResetPassword field
│   │   └── migrations/
│   │       └── add_must_reset_password.sql
│   │
│   ├── src/
│   │   ├── lib/
│   │   │   ├── prisma.ts          ← NEW  Singleton Prisma client
│   │   │   ├── password.ts        ← NEW  argon2 hash/verify + complexity rules
│   │   │   └── jwt.ts             ← NEW  Sign/verify JWT (carries mustReset flag)
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.ts            ← NEW  TSOA auth handler + blockIfMustReset guard
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts    ← NEW  login(), forceResetPassword()
│   │   │   └── profile.service.ts ← NEW  getUserProfile(), updateUserProfile()
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts    ← NEW  POST /auth/login, POST /auth/password-reset
│   │   │   └── profile.controller.ts ← NEW  GET /profile, PATCH /profile
│   │   │
│   │   ├── scripts/
│   │   │   └── seed.ts            ← NEW  Seeds developer + must-reset test accounts
│   │   │
│   │   └── index.ts               ← NEW  Express app entry with TSOA + Swagger
│   │
│   ├── tsoa.json
│   └── .env.sample
│
└── client/
    └── src/
        ├── api/
        │   ├── client.ts          ← NEW  Axios instance (auto-attaches JWT)
        │   ├── auth.api.ts        ← NEW  login(), resetPassword()
        │   └── profile.api.ts     ← NEW  getProfile(), updateProfile()
        │
        ├── store/
        │   └── auth.store.ts      ← NEW  Zustand persisted auth store
        │
        ├── hooks/
        │   └── usePasswordStrength.ts  ← NEW  Live complexity checking hook
        │
        ├── components/
        │   ├── ui/
        │   │   ├── PasswordStrengthMeter.tsx  ← NEW  Visual rule checklist
        │   │   └── PasswordInput.tsx          ← NEW  Input with show/hide toggle
        │   └── auth/
        │       └── RouteGuard.tsx             ← NEW  mustResetPassword redirect gate
        │
        ├── pages/
        │   ├── auth/
        │   │   ├── LoginPage.tsx       ← NEW  Login with mustResetPassword redirect
        │   │   └── ForceResetPage.tsx  ← NEW  Enforced first-login password change
        │   └── profile/
        │       └── ProfilePage.tsx     ← NEW  Profile edit + password change
        │
        └── App.tsx                ← NEW  Router with all routes wired
```

---

## 🔐 How the mustResetPassword Flow Works

```
User logs in (POST /auth/login)
        │
        ▼
  mustResetPassword?
   ┌─── true ──────────────────────────────────────────────────────┐
   │                                                               │
   │  JWT token is issued WITH mustReset=true inside payload       │
   │  Client stores token + user in Zustand                        │
   │  Client redirects → /force-reset                              │
   │                                                               │
   │  RouteGuard: any route OTHER than /force-reset redirects      │
   │              back to /force-reset (user is trapped)           │
   │                                                               │
   │  User submits ForceResetPage form                             │
   │  POST /auth/password-reset                                    │
   │    - verifies current password                                │
   │    - enforces complexity (5 server-side rules)                │
   │    - updates passwordHash in DB                               │
   │    - sets mustResetPassword = FALSE in DB  ←── KEY            │
   │    - issues a NEW JWT with mustReset=false                    │
   │  Client stores new token → navigates to /dashboard            │
   └───────────────────────────────────────────────────────────────┘
   │
   false ─► Navigate to intended destination (/dashboard)
```

---

## 🔑 Password Complexity Rules

The same 5 rules are enforced in **both** frontend and backend:

| Rule        | Requirement                     |
|:------------|:--------------------------------|
| `length`    | ≥ 8 characters                  |
| `uppercase` | ≥ 1 uppercase letter (A–Z)      |
| `lowercase` | ≥ 1 lowercase letter (a–z)      |
| `number`    | ≥ 1 digit (0–9)                 |
| `special`   | ≥ 1 special char (!@#$%^&*…)   |

The frontend shows a live strength bar + animated rule checklist. The backend validates independently and returns structured error messages.

---

## 🚀 Setup & Run

### 1. Set environment variables

```bash
# server/.env
DATABASE_URL="postgresql://postgres.nlzjbabgljiqmnobhknq:Varna%402006.db@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?schema=nextask"
PORT=3000
JWT_SECRET="your_secret_here"
JWT_EXPIRES_IN="7d"

# client/.env
VITE_API_URL="http://localhost:3000"
```

### 2. Install & generate Prisma client

```bash
pnpm install
cd server
pnpm prisma db push        # or: pnpm prisma migrate dev
```

### 3. Seed the database

```bash
cd server
npx ts-node src/scripts/seed.ts
```

This creates:
- `developer@nextask.com` / `SecurePassword123!` → **no reset required** (admin)
- `newuser@nextask.com` / `TempPass@1` → **must reset on first login** (member)

### 4. Generate TSOA routes

```bash
cd server
pnpm tsoa   # generates src/generated/routes.ts + swagger.json
```

### 5. Start

```bash
# From root
pnpm dev
# Backend: http://localhost:3000
# Swagger: http://localhost:3000/api-docs
# Frontend: http://localhost:5173
```

---

## 🧪 Test Accounts

| Email | Password | mustResetPassword |
|:------|:---------|:-----------------|
| `developer@nextask.com` | `SecurePassword123!` | `false` – goes straight to dashboard |
| `newuser@nextask.com` | `TempPass@1` | `true` – trapped on /force-reset |
