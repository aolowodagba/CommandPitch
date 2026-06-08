# SKILL.md — API Route Scaffolder

## Purpose
This skill guides the agent through scaffolding backend logic for CommandPitch. This covers both Server Actions (primary) and Route Handlers (exceptions only). Follow every step in order.

---

## When to Use This Skill
- A new Server Action needs to be created in `/app/actions/`
- A new Route Handler needs to be created in `/app/api/`
- An existing action or route needs to be refactored

---

## Decision — Server Action or Route Handler?

Answer these questions first:

| Question | If Yes |
|---|---|
| Is this a data mutation? | Server Action |
| Is this triggered by a form or button? | Server Action |
| Is this a file upload (multipart)? | Route Handler |
| Is this a webhook from an external service? | Route Handler |
| Is this a public API endpoint? | Route Handler |
| Is this an invite link resolution? | Route Handler |

**Default is always Server Action. Route Handler only when the above forces it.**

Never create an Express route, NestJS module, or standalone server file under any circumstance.

---

## Pre-Build Checklist

**1. Which domain?**
group / membership / schedule / session / payment / team / scoreboard / leaderboard

**2. Is it group-scoped?**
Almost all actions are. `groupId` must be the first parameter.

**3. Who is allowed?**
Define allowed roles before writing any logic.
- `owner` only: group settings, admin management, ownership transfer
- `owner` + `admin`: session management, payment verification, team generation, scoreboard
- All members: view sessions, view leaderboard, view own stats
- Public: leaderboard for PUBLIC groups, invite resolution

**4. Does it write to more than one model?**
Yes → Prisma transaction is mandatory.

---

## Server Action Folder Structure

```
/app/actions/
  group.ts          → createGroup(), updateGroup(), deleteGroup(), transferOwnership()
  membership.ts     → updateMemberRole(), removeMember()
  schedule.ts       → createSchedule(), updateSchedule(), deleteSchedule(), createOverride()
  session.ts        → createSession(), updateSession(), openSession(), lockSession(),
                       completeSession(), issueWaiver()
  payment.ts        → submitPayment(), approvePayment(), rejectPayment()
  team.ts           → generateTeams(), addPlaceholder(), addReservedSlot()
  scoreboard.ts     → updateGoal()
  leaderboard.ts    → getGroupLeaderboard()
```

---

## Route Handler Folder Structure

```
/app/api/
  upload-receipt/route.ts                       → POST — multipart file upload
  invite/[code]/route.ts                        → GET — public invite resolution
  groups/[groupId]/leaderboard/route.ts         → GET — public leaderboard
  paystack/webhook/route.ts                     → POST — webhook (post-MVP)
```

---

## Zod Validator Templates

Define in `/lib/validators/[domain].ts` before writing any action or route.

```typescript
// /lib/validators/session.ts
import { z } from 'zod'

export const createSessionSchema = z.object({
  scheduleId: z.string().cuid().optional(),
  date: z.string().datetime(),
  teamSize: z.union([
    z.literal(5), z.literal(6),
    z.literal(7), z.literal(11),
  ]),
})

export const updateSessionSchema = z.object({
  date: z.string().datetime().optional(),
  venue: z.string().min(1).optional(),
})

export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
```

```typescript
// /lib/validators/payment.ts
import { z } from 'zod'

export const submitPaymentSchema = z.object({
  type: z.enum(['WEEKLY', 'MONTHLY']),
  receiptUrl: z.string().url(),
  receiptFileType: z.enum(['jpg', 'jpeg', 'png', 'webp', 'pdf']),
})

export const rejectPaymentSchema = z.object({
  reason: z.string().min(1).max(500),
})
```

```typescript
// /lib/validators/team.ts
import { z } from 'zod'

export const generateTeamsSchema = z.object({
  teamSize: z.union([
    z.literal(5), z.literal(6),
    z.literal(7), z.literal(11),
  ]),
})

export const addPlaceholderSchema = z.object({
  label: z.string().min(1).max(10),
  purpose: z.enum(['late_arrival', 'goalkeeper', 'reserved']),
})
```

---

## Server Action Template — Standard

```typescript
// /app/actions/session.ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupRole } from '@/lib/auth-helpers'
import { createSessionSchema } from '@/lib/validators/session'
import type { ActionResult } from '@/types'

export async function createSession(
  groupId: string,
  input: unknown
): Promise<ActionResult<{ id: string; date: Date; status: string; teamSize: number }>> {

  // 1. Auth — always first
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Unauthorised' }

  // 2. Role check — always second
  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  // 3. Validate input — always third
  const parsed = createSessionSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  // 4. Execute
  try {
    const result = await prisma.session.create({
      data: {
        groupId,
        date: new Date(parsed.data.date),
        teamSize: parsed.data.teamSize,
        scheduleId: parsed.data.scheduleId ?? null,
      },
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

## Server Action Template — Session Completion (Multi-Model Transaction)

```typescript
// /app/actions/session.ts
export async function completeSession(
  groupId: string,
  sessionId: string
): Promise<ActionResult<null>> {

  const session = await auth()
  if (!session?.user) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  try {
    await prisma.$transaction(async (tx) => {

      // Guard immutability
      const existing = await tx.session.findUniqueOrThrow({
        where: { id: sessionId, groupId },
        select: { status: true },
      })

      if (existing.status === 'LOCKED' || existing.status === 'COMPLETED') {
        throw new Error('SESSION_IMMUTABLE')
      }

      // Complete the session
      await tx.session.update({
        where: { id: sessionId, groupId },
        data: { status: 'COMPLETED' },
      })

      // Fetch scoreboard
      const stats = await tx.sessionPlayerStats.findMany({
        where: { sessionId, groupId },
        select: { playerId: true, goals: true },
      })

      // Update group leaderboard
      for (const stat of stats) {
        await tx.playerStats.upsert({
          where: {
            groupId_playerId: { groupId, playerId: stat.playerId },
          },
          update: {
            totalGoals: { increment: stat.goals },
            totalSessionsPlayed: { increment: 1 },
          },
          create: {
            groupId,
            playerId: stat.playerId,
            totalGoals: stat.goals,
            totalSessionsPlayed: 1,
          },
        })
      }
    })

    return { success: true, data: null }
  } catch (err) {
    if (err instanceof Error && err.message === 'SESSION_IMMUTABLE') {
      return { success: false, error: 'This record cannot be modified' }
    }
    console.error('[completeSession]', err)
    return { success: false, error: 'Something went wrong' }
  }
}
```

---

## Server Action Template — Payment Approval (Transaction)

```typescript
// /app/actions/payment.ts
export async function approvePayment(
  groupId: string,
  paymentId: string
): Promise<ActionResult<null>> {

  const session = await auth()
  if (!session?.user) return { success: false, error: 'Unauthorised' }

  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId, groupId },
        select: { userId: true, type: true, status: true },
      })

      if (payment.status === 'APPROVED') throw new Error('ALREADY_APPROVED')

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED' },
      })

      const isMonthly = payment.type === 'MONTHLY'

      await tx.paymentEligibility.upsert({
        where: {
          groupId_userId_type: {
            groupId,
            userId: payment.userId,
            type: payment.type,
          },
        },
        update: {
          status: isMonthly ? 'APPROVED_MONTHLY' : 'APPROVED_WEEKLY',
          validUntil: isMonthly
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : null,
        },
        create: {
          groupId,
          userId: payment.userId,
          type: payment.type,
          status: isMonthly ? 'APPROVED_MONTHLY' : 'APPROVED_WEEKLY',
          validUntil: isMonthly
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : null,
        },
      })
    })

    return { success: true, data: null }
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_APPROVED') {
      return { success: false, error: 'Payment is already approved' }
    }
    console.error('[approvePayment]', err)
    return { success: false, error: 'Something went wrong' }
  }
}
```

---

## Route Handler Template — File Upload

```typescript
// /app/api/upload-receipt/route.ts
import { auth } from '@/lib/auth'
import { uploadToStorage } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_MB = 5

export async function POST(req: Request) {
  // 1. Auth
  const session = await auth()
  if (!session?.user) return Response.json(
    { success: false, error: 'Unauthorised' }, { status: 401 }
  )

  // 2. Parse multipart
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const paymentId = formData.get('paymentId') as string | null
  const groupId = formData.get('groupId') as string | null

  if (!file || !paymentId || !groupId) return Response.json(
    { success: false, error: 'Invalid input' }, { status: 400 }
  )

  // 3. Validate file
  if (!ALLOWED_TYPES.includes(file.type)) return Response.json(
    { success: false, error: 'Invalid file type' }, { status: 400 }
  )

  if (file.size > MAX_SIZE_MB * 1024 * 1024) return Response.json(
    { success: false, error: 'File too large' }, { status: 400 }
  )

  // 4. Upload to S3/R2
  try {
    const fileUrl = await uploadToStorage(file)
    const expiresAt = new Date(
      Date.now() + config.receiptExpiryHours * 60 * 60 * 1000
    )

    await prisma.paymentReceipt.create({
      data: {
        paymentId,
        groupId,
        fileUrl,
        fileType: file.type,
        expiresAt,
      },
    })

    return Response.json({ success: true, data: { expiresAt } })
  } catch (err) {
    console.error('[POST /api/upload-receipt]', err)
    return Response.json(
      { success: false, error: 'Something went wrong' }, { status: 500 }
    )
  }
}
```

---

## Route Handler Template — Public Leaderboard

```typescript
// /app/api/groups/[groupId]/leaderboard/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { visibility: true },
  })

  if (!group) return Response.json(
    { success: false, error: 'Not found' }, { status: 404 }
  )

  if (group.visibility === 'PRIVATE') {
    const session = await auth()
    if (!session?.user) return Response.json(
      { success: false, error: 'Unauthorised' }, { status: 401 }
    )
  }

  try {
    const leaderboard = await prisma.playerStats.findMany({
      where: { groupId },
      orderBy: { totalGoals: 'desc' },
      select: {
        playerId: true,
        totalGoals: true,
        totalSessionsPlayed: true,
      },
    })
    return Response.json({ success: true, data: leaderboard })
  } catch (err) {
    console.error('[GET /api/groups/[groupId]/leaderboard]', err)
    return Response.json(
      { success: false, error: 'Something went wrong' }, { status: 500 }
    )
  }
}
```

---

## Return Shape — Always Consistent

```typescript
// Server Actions
{ success: true, data: T }
{ success: false, error: string }

// Route Handlers
Response.json({ success: true, data: T })           // 200
Response.json({ success: true, data: T }, { status: 201 })  // 201
Response.json({ success: false, error: string }, { status: N })
```

---

## Named Error Strings

| Error | Returned Message | Status |
|---|---|---|
| `SESSION_IMMUTABLE` | `"This record cannot be modified"` | — |
| `ALREADY_APPROVED` | `"Payment is already approved"` | — |
| `PLAYER_NOT_ELIGIBLE` | `"Player is not eligible"` | — |
| `INVITE_CODE_INVALID` | `"Invalid invite link"` | — |
| `GROUP_NOT_FOUND` | `"Not found"` | — |

Server Actions return these as `{ success: false, error: string }` — no HTTP status needed.

---

## Rules the Agent Must Always Follow

1. **Server Action first** — Route Handler only for uploads, webhooks, public APIs
2. **Auth is always step 1** — before role check, before validation
3. **Role check is always step 2** — before validation, before Prisma
4. **Zod validation is always step 3** — never pass raw input to Prisma
5. **Never write business logic outside actions** — no logic in components or pages
6. **Never use PUT** — PATCH for all updates
7. **Always scope to groupId** — never query across groups
8. **Multi-model writes always use transactions** — no exceptions
9. **Never throw from Server Actions** — always return typed result
10. **Never return raw Prisma objects** — always select only required fields
11. **Never expose raw storage URLs** — serve via signed or proxied URL
12. **Log errors with context** — `console.error('[actionName]', err)`

---

## Post-Build Checklist

- [ ] Validator schema exists in `/lib/validators/[domain].ts`
- [ ] Server Action: `'use server'` at top of file
- [ ] Auth check is step 1
- [ ] Role check is step 2
- [ ] Zod validation is step 3
- [ ] No business logic in components or pages
- [ ] Return shape is `{ success, data/error }` on all paths
- [ ] Multi-model writes use `prisma.$transaction`
- [ ] `SESSION_IMMUTABLE` / `ALREADY_APPROVED` errors handled
- [ ] Queries scoped to `groupId`
- [ ] No raw Prisma objects returned
- [ ] No raw storage URLs returned
- [ ] Console error log includes action or route name
- [ ] No Express routes or standalone server files created