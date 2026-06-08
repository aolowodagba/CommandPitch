# AGENTS.md — CommandPitch

## What Is This Project?

CommandPitch is a multi-tenant football group operating system. It enables independent football communities to manage recurring schedules, verify player payments, generate random teams, track player goals via a live session scoreboard, and maintain group-specific leaderboards that reflect long-term player performance.

The platform supports multiple independent football groups. Each group operates in complete isolation — its own players, admins, schedules, sessions, payments, and leaderboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Server Actions + Route Handlers |
| Runtime | Node.js |
| Auth | Auth.js |
| Database ORM | Prisma |
| Database | PostgreSQL |
| Validation | Zod |
| Storage | S3 or Cloudflare R2 |
| Email | Resend |
| Payments | Receipt Verification MVP / Paystack (post-MVP) |
| Deployment | Vercel |
| App Type | Progressive Web App (PWA) |

**Do not introduce new dependencies without explicit instruction.** If a dependency is technically unavoidable, flag it and explain why before installing it.

---

## Backend Architecture

CommandPitch uses a single Next.js 15 App Router architecture. There is no standalone backend server.

**Do not create or use:**
- Express
- NestJS
- Fastify
- Koa
- Any standalone backend server

**All backend logic lives inside the Next.js application:**

```
Next.js
├── UI (React components)
├── Server Actions (primary backend pattern)
├── Route Handlers (webhooks, uploads, public APIs)
├── Middleware (auth, group membership)
└── Auth (Auth.js)
```

### When to Use What

| Pattern | Use When |
|---|---|
| **Server Action** | Form submissions, data mutations, creating records, completing sessions, generating teams, approving payments |
| **Route Handler** | Webhooks, file uploads, public API endpoints, external integrations |
| **Middleware** | Auth checks, group membership verification, redirects |

### Preferred Order
1. Server Action first
2. Route Handler if needed
3. Middleware for cross-cutting concerns
4. Never Express

### Server Actions Live In
```
/app/actions/[domain].ts
```

Examples:
- `app/actions/group.ts` → `createGroup()`, `updateGroup()`
- `app/actions/session.ts` → `createSession()`, `completeSession()`
- `app/actions/payment.ts` → `approvePayment()`, `rejectPayment()`
- `app/actions/team.ts` → `generateTeams()`
- `app/actions/schedule.ts` → `createSchedule()`, `createOverride()`
- `app/actions/membership.ts` → `joinGroup()`, `updateMemberRole()`

### Route Handlers Are For
```
/app/api/upload-receipt/route.ts       → file uploads
/app/api/invite/[code]/route.ts        → public invite join flow
/app/api/paystack/webhook/route.ts     → payment webhooks (post-MVP)
/app/api/groups/[groupId]/leaderboard/route.ts → public leaderboard
```

---

## Next.js 15 — Critical Behavioural Changes

Apply these in every relevant file without exception.

1. **`params` and `searchParams` are Promises** — always `await` them.
```typescript
const { groupId } = await params
```

2. **`fetch` is not cached by default** — declare cache behaviour explicitly on every call.

3. **`cookies()` and `headers()` are async** — always `await` them.
```typescript
const cookieStore = await cookies()
```

4. **Turbopack is the default dev server.**
```json
"dev": "next dev --turbopack"
```

---

## Core Architecture — 9 Layers

Every feature maps to one of these nine layers.

### Layer 1: Group System
- Unlimited independent football groups
- Each group fully isolated — own players, admins, schedules, sessions, payments, leaderboard
- Group visibility: `PUBLIC` or `PRIVATE`
- Unique `slug` and `inviteCode` per group

### Layer 2: Membership System
- Users belong to groups via `GroupMember`
- Roles are group-scoped: `owner`, `admin`, `player`
- `User` model carries no role — role lives on `GroupMember`
- A user can have different roles in different groups

### Layer 3: Invite System
- Every group has a unique invite link
- Join flow: Open link → Create account → Join group → Become Player
- Joining always assigns `player` role — elevation requires owner/admin action

### Layer 4: Scheduling System
- Recurring schedules (living templates, not fixed objects)
- Editable parameters, active/inactive toggle
- One-off overrides — never mutates parent schedule
- Changes affect future sessions only — past sessions immutable

### Layer 5: Payment Verification System
- Payment types: `WEEKLY` and `MONTHLY`
- Players upload receipts (jpg, jpeg, png, webp, pdf) — stored in S3/R2
- Admins preview, approve, or reject receipts inline
- Receipt files deleted after 24 hours — audit record kept permanently
- Monthly membership: valid for 30 days from approval
- Session Waiver: admin can carry forward or waive cancelled sessions

### Layer 6: Session System
- Scoped to a group
- Only `APPROVED_WEEKLY` or `APPROVED_MONTHLY` players are eligible
- Lifecycle: `DRAFT` → `OPEN` → `LOCKED` → `COMPLETED`
- Past sessions immutable

### Layer 7: Team Generator
- Pure random — no balancing, no rankings
- Team size: `5`, `6`, `7`, or `11`
- Placeholder slots: `X1`, `X2`, `X3` for late arrivals
- Reserved slots for goalkeepers and reserved players

### Layer 8: Session Scoreboard
- Created after teams are generated
- Contains every eligible player
- Goals tracked per player — never per team
- One-tap `+` / `-` goal logging
- Frozen on lock or completion

### Layer 9: Leaderboard System
- Group-scoped — never mixed across groups
- Updated only when session transitions to `COMPLETED`
- Public for `PUBLIC` groups, membership-gated for `PRIVATE` groups

---

## Data Model

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Group {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  inviteCode  String     @unique
  description String?
  visibility  Visibility @default(PRIVATE)
  createdBy   String
  createdAt   DateTime   @default(now())
}

enum Visibility {
  PUBLIC
  PRIVATE
}

model GroupMember {
  id       String    @id @default(cuid())
  groupId  String
  userId   String
  role     GroupRole
  joinedAt DateTime  @default(now())

  @@unique([groupId, userId])
}

enum GroupRole {
  owner
  admin
  player
}

model Schedule {
  id             String   @id @default(cuid())
  groupId        String
  name           String
  recurrenceRule String
  teamSize       Int
  venue          String
  defaultTime    DateTime
  defaultFee     Float?
  isActive       Boolean  @default(true)
  createdBy      String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model ScheduleOverride {
  id         String    @id @default(cuid())
  scheduleId String
  groupId    String
  date       DateTime
  venue      String?
  teamSize   Int?
  time       DateTime?
  note       String?
  createdAt  DateTime  @default(now())
}

model Session {
  id           String        @id @default(cuid())
  groupId      String
  scheduleId   String?
  date         DateTime
  status       SessionStatus @default(DRAFT)
  teamSize     Int
  waiverReason String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

enum SessionStatus {
  DRAFT
  OPEN
  LOCKED
  COMPLETED
}

model Payment {
  id         String        @id @default(cuid())
  groupId    String
  userId     String
  type       PaymentType
  status     PaymentStatus @default(PENDING)
  validFrom  DateTime?
  validUntil DateTime?
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
}

enum PaymentType {
  WEEKLY
  MONTHLY
}

enum PaymentStatus {
  PENDING
  APPROVED
  REJECTED
}

model PaymentReceipt {
  id        String   @id @default(cuid())
  paymentId String
  groupId   String
  fileUrl   String
  fileType  String
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model PaymentEligibility {
  id         String            @id @default(cuid())
  groupId    String
  userId     String
  type       PaymentType
  status     EligibilityStatus @default(PENDING)
  validFrom  DateTime?
  validUntil DateTime?
  createdAt  DateTime          @default(now())

  @@unique([groupId, userId, type])
}

enum EligibilityStatus {
  APPROVED_WEEKLY
  APPROVED_MONTHLY
  PENDING
  REJECTED
}

model Team {
  id        String   @id @default(cuid())
  sessionId String
  groupId   String
  name      String
  createdAt DateTime @default(now())
}

model TeamMember {
  id          String   @id @default(cuid())
  teamId      String
  groupId     String
  playerId    String?
  placeholder String?
  isReserved  Boolean  @default(false)
  purpose     String?
}

model SessionPlayerStats {
  id        String @id @default(cuid())
  sessionId String
  groupId   String
  playerId  String
  goals     Int    @default(0)
  teamLabel String

  @@unique([sessionId, playerId])
}

model PlayerStats {
  id                  String   @id @default(cuid())
  groupId             String
  playerId            String
  totalGoals          Int      @default(0)
  totalSessionsPlayed Int      @default(0)
  updatedAt           DateTime @updatedAt

  @@unique([groupId, playerId])
}
```

---

## System Flow

```
Group Created
      ↓
Invite Link Shared
      ↓
Players Join Group
      ↓
Schedule Created (recurring + editable)
      ↓
Session Auto-Generated
      ↓
Players Submit Payment Receipts
      ↓
Admin Verifies Payments (approve / reject)
      ↓
Eligible Players Confirmed
      ↓
Random Teams Generated (with placeholders)
      ↓
Teams Displayed (structure only)
      ↓
Session Scoreboard Activated
      ↓
Goals Recorded via Scoreboard Taps
      ↓
Session Completed and Locked
      ↓
Group Leaderboard Updated
```

---

## MVP Feature Scope

- [x] Authentication — email login, Google login (Auth.js)
- [x] Group System — create group, slug, invite code, visibility
- [x] Membership System — group-scoped roles, join via invite link
- [x] Invite System — unique invite links, join flow
- [x] Schedule System — recurring schedules, editable params, one-off overrides
- [x] Payment Verification — receipt upload to S3/R2, admin approve/reject, weekly and monthly types
- [x] Receipt Retention — 24hr file deletion, permanent audit record
- [x] Monthly Membership — 30-day validity, eligibility until expiry
- [x] Session Waiver — carry forward or waive cancelled sessions
- [x] Session Management — eligibility-gated attendance, session lifecycle
- [x] Team Generator — random shuffle, size 5/6/7/11, placeholders, reserved slots
- [x] Session Scoreboard — flat player list, goal tracking (+/-), frozen on completion
- [x] Session Completion — lock session, freeze scoreboard, session summary
- [x] Group Leaderboard — group-scoped, cross-session aggregation, updates on completion
- [x] PWA — installable, mobile-optimised

---

## Key Rules the Agent Must Always Respect

1. **Goals are always tied to the player, never the team.**
2. **Teams are structural only.**
3. **Past sessions are immutable.** Never mutate `LOCKED` or `COMPLETED` sessions.
4. **One-off overrides never modify the schedule baseline.**
5. **Leaderboard updates on session completion only.**
6. **Groups are fully isolated.** Always scope queries to `groupId`.
7. **Roles are group-scoped.** Read from `GroupMember` — never from `User`.
8. **Only eligible players join sessions.** Check `APPROVED_WEEKLY` or `APPROVED_MONTHLY`.
9. **Receipt files are temporary.** Delete after 24hrs. Keep payment audit record permanently.
10. **Server Actions first.** Route Handlers only when required. Never Express.
11. **Mobile-first.** Goal logging < 1s response target.
12. **Apply all Next.js 15 async conventions** — always await params, cookies(), headers().

---

## Post-MVP Features (Do Not Build Yet)

- Assists tracking, Man of the match, Player ratings
- Seasonal leagues, Fines, Paystack integration
- Multi-group user dashboard, Automated MVP system

---

## Agent Behaviour Guidelines

- Server Actions for all mutations — Route Handlers only for uploads, webhooks, public APIs
- Always scope every database query to `groupId`
- Read role exclusively from `GroupMember`
- Use Prisma transactions for all multi-model writes
- Keep scoreboard logic decoupled from team logic
- Prefer server components — `"use client"` only where interactivity requires it
- Always await `params`, `searchParams`, `cookies()`, `headers()`
- Never cache fetch calls implicitly — set cache behaviour explicitly
- Use shadcn/ui primitives for all base UI components
- When scope is unclear, default to MVP Feature Scope list