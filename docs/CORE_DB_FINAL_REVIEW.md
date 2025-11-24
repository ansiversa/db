# Ansiversa – Core + DB Final Review Checklist

This document ensures that **Core API** and **@ansiversa/db** are fully correct and complete before moving to Web/Admin integration.

Use this checklist in Codex to verify everything.

---

# ✅ 1. DATABASE LAYER (NPM PACKAGE: @ansiversa/db)

## 1.1 Parent DB: ansiversadb
Ensure the following tables exist with correct SQL:

### Users table:
- id (TEXT PRIMARY KEY)
- email (TEXT UNIQUE NOT NULL)
- name (TEXT)
- created_at (timestamp default current)
- updated_at (timestamp default current)

### Subscriptions table:
- id (INTEGER AUTOINCREMENT)
- user_id (TEXT FOREIGN KEY -> users)
- plan (TEXT)
- status (TEXT CHECK: active, cancelled, expired)
- period_start (timestamp)
- period_end (timestamp)
- created_at
- updated_at

### Checklist:
- [ ] `ensureCoreSchema()` creates both tables + indexes.
- [ ] `CoreUsers` helpers:
  - `getUserById`
  - `getUserByEmail`
  - `createUser`
  - `getOrCreateUserByEmail`
- [ ] `CoreSubscriptions` helpers:
  - `getSubscriptionsForUser`
  - `getActiveSubscriptionForUser`
  - `createSubscription`
  - `updateSubscriptionStatus`
- [ ] All helpers return strongly-typed objects.

---

## 1.2 Child DB: quizdb
Tables required:
- platforms
- subjects
- topics
- roadmaps
- questions
- results

Checklist:
- [ ] `ensureQuizSchema()` creates all 6 tables + indexes.
- [ ] CRUD SQL for: platforms, subjects, topics, roadmaps.
- [ ] Insert/update/delete operations exist in table definitions.
- [ ] Question helpers:
  - Fetch random active questions
  - Fetch by roadmap/topic/platform
- [ ] Results helpers:
  - Insert quiz result
  - Get results by user
  - Fetch single result

---

## 1.3 DB Configuration
Checklist:
- [ ] `loadEnvConfig()` loads env vars:
  - `ANSIVERSA_CORE_DB_URL`
  - `ANSIVERSA_QUIZ_DB_URL`
  - `TURSO_AUTH_TOKEN`
- [ ] `initAnsiversaDb()` stores global config.
- [ ] `getCoreClient()` and `getQuizClient()` create cached clients.
- [ ] No direct DB logic inside Web/Admin.
- [ ] Only **Core API** uses this package.

---

# ✅ 2. CORE API (core.ansiversa.com)

## 2.1 JWT Authentication Layer

Checklist:
- [ ] `ANSIVERSA_JWT_SECRET` env var exists.
- [ ] `createJwtForUser()` implemented using HS256.
- [ ] `verifyJwt()` validates + returns typed payload.
- [ ] `requireAuthenticatedUser()`:
  - Extracts Bearer token
  - Verifies token
  - Returns `AuthContext` with:
    - userId
    - email
    - name
    - plan
    - role
- [ ] Protected routes all use `requireAuthenticatedUser()`.

---

## 2.2 Core Identity Endpoints

### Implemented:
- [ ] `GET /api/core/health`
- [ ] `POST /api/core/auth/token`
- [ ] `GET /api/core/me`
- [ ] `GET /api/core/users` (admin)
- [ ] `POST /api/core/users` (admin)
- [ ] `GET /api/core/users/:id` (self or admin)
- [ ] `GET /api/core/users/by-email`

All endpoints must:
- [ ] Use shared response helpers:
  - `successEnvelope`
  - `errorEnvelope`
  - `jsonResponse`
- [ ] Validate inputs using Zod or manual checks.
- [ ] Reject unauthorized admin endpoints with 403.

---

## 2.3 Subscription Endpoints

Checklist:
- [ ] `POST /api/core/subscriptions` (admin)
- [ ] `PATCH /api/core/subscriptions/:id` (admin)
- [ ] `GET /api/core/subscriptions/user/:userId` (self or admin)
- [ ] `GET /api/core/subscriptions/user/:userId/active` (self or admin)

Rules:
- [ ] Must derive the authenticated user from JWT.
- [ ] Never trust userId from query/body unless admin.
- [ ] All responses wrapped in `{ ok, data, error }`.

---

# ✅ 3. QUIZ ENDPOINTS (through Core API)

Checklist:
- [ ] `/api/quiz/platforms` (GET + POST)
- [ ] `/api/quiz/subjects` (GET)
- [ ] `/api/quiz/topics` (GET)
- [ ] `/api/quiz/roadmaps` (GET)
- [ ] `/api/quiz/questions` (GET)
- [ ] `/api/quiz/results`:
  - `POST /api/quiz/results` (save user result)
  - `GET /api/quiz/results/my-history` (requires JWT)
  - `GET /api/quiz/results/:id` (verify access)

Rules:
- [ ] User-specific routes must use `auth.userId` from JWT.
- [ ] Input validation for all POST/PATCH routes.
- [ ] Use DB helpers from `Apps.Quiz.*`.

---

# ✅ 4. INFRASTRUCTURE CHECKS

Checklist:
- [ ] CORS middleware allows:
  - `https://www.ansiversa.com`
  - `https://admin.ansiversa.com`
- [ ] Preflight requests handled correctly.
- [ ] DB connections initialized once per request cycle.
- [ ] All endpoints return JSON with correct headers.
- [ ] Error logs are not leaking secrets.

---

# FINAL APPROVAL CHECK

Before moving to Web/Admin:

Partner must verify:

- [ ] Parent DB = fully stable
- [ ] Quiz DB = fully stable
- [ ] Core endpoints = fully implemented
- [ ] JWT = fully implemented
- [ ] CORS = correct
- [ ] All tests pass for:
  - Core identity
  - Subscription logic
  - Quiz catalog
  - Quiz results
  - JWT protected routes

When all boxes are checked, Ansiversa Core is **officially production-ready**, and we can proceed to **Web/Auth UI -> Admin -> Mini apps**.
