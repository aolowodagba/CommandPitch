---
trigger: always_on
---

# architecture.md — CommandPitch System Architecture Rules

## Project Type
Full-stack multi-tenant Progressive Web App. Built entirely within Next.js 15 (App Router). No standalone backend server. All backend logic lives inside the Next.js application.

Every piece of data is scoped to a Group. Never query across group boundaries.

---

## Backend Architecture

```
Server Action first.
Route Handler if needed.
Middleware for cross-cutting concerns.
Never Express. Never NestJS. Never Fastify.
```

### Server Actions — Primary Backend
All data mutations. Live in `/app/actions/[domain].ts`.

```
/app/actions/
  group.ts       → createGroup(), updateGroup(), deleteGroup()
  membership.ts  → joinGroup(), updateMemberRole(), removeMember()
  schedule.ts    → createSchedule(), updateSchedule(), createOverride()
  session.ts     → createSession(), completeSession(), issueWaiver()
  payment.ts     → submitPayment(), approvePayment(), rejectPayment()
  team.ts        → generateTeams(), addPlaceholder(), addReservedSlot()
  scoreboard.ts  → updateGoal()
```

### Route Handlers — Exceptions Only
```
/app/api/upload-receipt/route.ts              → file uploads to S3/R2
/app/api/invite/[code]/route.ts               → public invite resolution
/app/api/groups/[groupId]/leaderboard/route.ts → public leaderboard
/app/api/paystack/webhook/route.ts            → webhooks (post-MVP)
```

### Middleware
Root `middleware.ts` handles auth session verification and redirects.

```typescript
export { auth as middleware } from '@/lib/auth'
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Folder Structure

```
/app
  /actions                     → Server Actions (primary backend)
  /api                         → Route Handlers (uploads, webhooks, public)
  /(auth)                      → Sign-in, sign-up pages
  /(app)                       → Authenticated app shell
    /groups/[groupId]
      /page.tsx                → Group dashboard
      /sessions/[sessionId]
      /payments
      /teams/[sessionId]
      /scoreboard/[sessionId]
      /leaderboard
      /members
      /settings
  /join/[code]/page.tsx        → Public invite landing
  /layout.tsx                  → Root layout — imports tokens.css here only
  /manifest.ts                 → PWA manifest

/components
  /group        /membership    /schedule     /session
  /payment      /team          /scoreboard   /leaderboard
  /ui           → shadcn/ui primitives + shared components

/lib
  /auth.ts          → Auth.js config
  /prisma.ts        → Single Prisma client instance
  /config.ts        → Environment variables (only access point)
  /auth-helpers.ts  → requireGroupRole()
  /validators/      → Zod schemas per domain

/styles/tokens/tokens.css      → Design token source of truth
/prisma/schema.prisma          → Canonical data model
/middleware.ts                 → Root middleware
/types/index.ts                → Global TypeScript types
```

---

## Core Architecture Principles

### 1. Nine-Layer System

| Layer | Responsibility |
|---|---|
| Group System | Group creation, isolation, visibility, invite codes |
| Membership System | Group-scoped roles, member management |
| Invite System | Invite links, join flow, onboarding |
| Scheduling System | Recurring templates, overrides, auto-generation |
| Payment Verification | Receipt upload, approval, eligibility, retention |
| Session System | Eligibility-gated, lifecycle management |
| Team Generator | Random shuffle, placeholders, reserved slots |
| Scoreboard | Per-player goal tracking |
| Leaderboard | Group-scoped cross-session aggregation |

### 2. Groups Are Fully Isolated
Every group-owned model carries `groupId`. Every query must filter by `groupId`. Never expose data across group boundaries.

### 3. Roles Are Group-Scoped
`User` carries no role. Role lives on `GroupMember`. Always resolve via `requireGroupRole(groupId, allowedRoles)`.

### 4. Database Writes Use Transactions
Multi-model writes are always atomic. Critical examples:
- `completeSession()` → session status + PlayerStats
- `approvePayment()` → Payment + PaymentEligibility
- `createGroup()` → Group + GroupMember as owner

### 5. Past Sessions Are Immutable
Never mutate `LOCKED` or `COMPLETED` sessions. Enforce via explicit status check at the top of any mutating Server Action.

### 6. Schedule Overrides Are Isolated
`ScheduleOverride` records never write back to the parent `Schedule`.

### 7. Goals Belong to Players
`SessionPlayerStats.goals` is source of truth. `teamLabel` is display-only only.

### 8. Receipt Files Are Temporary
Files deleted from S3/R2 after 24 hours. `Payment` audit record kept permanently.

### 9. Eligibility Gates Sessions
Always check `PaymentEligibility` status (`APPROVED_WEEKLY` or `APPROVED_MONTHLY`) before including any player in session logic.

---

## Next.js 15 Rules

```typescript
// Always await params
const { groupId, sessionId } = await params

// Always await cookies/headers
const cookieStore = await cookies()

// Always declare fetch cache explicitly
fetch(url, { cache: 'no-store' })
fetch(url, { cache: 'force-cache' })
fetch(url, { next: { revalidate: 60 } })

// Turbopack in package.json
"dev": "next dev --turbopack"
```

---

## Server Action Pattern

```typescript
'use server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupRole } from '@/lib/auth-helpers'
import { createSessionSchema } from '@/lib/validators/session'

export async function createSession(groupId: string, input: unknown) {
  // 1. Auth
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Unauthorised' }

  // 2. Role check
  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  // 3. Validate
  const parsed = createSessionSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  // 4. Persist
  try {
    const result = await prisma.session.create({
      data: { groupId, ...parsed.data },
      select: { id: true, date: true, status: true, teamSize: true },
    })
    return { success: true, data: result }
  } catch (err) {
    console.error('[createSession]', err)
    return { success: false, error: 'Something went wrong' }
  }
}
```

---

## Auth Helper Pattern

```typescript
// /lib/auth-helpers.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { GroupRole } from '@/types'

export async function requireGroupRole(
  groupId: string,
  allowedRoles: GroupRole[]
): Promise<{ userId: string; role: GroupRole } | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, role: { in: allowedRoles } },
    select: { role: true },
  })

  if (!member) return null
  return { userId: session.user.id, role: member.role }
}
```

---

## Session Lifecycle

```
DRAFT → OPEN → LOCKED → COMPLETED
```
One-directional. Scoreboard writes blocked once `LOCKED`. Leaderboard updates once on `COMPLETED`. Eligibility checked on `DRAFT → OPEN`.

---

## Server vs Client Components

| Server Component | Client Component |
|---|---|
| Data fetching and display | useState / useEffect |
| Auth and role checks | Goal logging buttons |
| Leaderboard, session cards | Receipt upload, group switcher |

Default to server. Add `"use client"` only when interactivity requires it.

---

## Environment Variables
Access only through `/lib/config.ts`. Never call `process.env` directly elsewhere.

```
DATABASE_URL          AUTH_SECRET           AUTH_URL
AUTH_GOOGLE_ID        AUTH_GOOGLE_SECRET    STORAGE_BUCKET
STORAGE_REGION        STORAGE_ACCESS_KEY    STORAGE_SECRET_KEY
RESEND_API_KEY        RECEIPT_EXPIRY_HOURS
```