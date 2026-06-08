---
trigger: always_on
---

# security.md — CommandPitch Security Rules

## Authentication
- Use Auth.js for all authentication
- Support email/password and Google OAuth
- Sessions are server-managed — never store auth tokens in localStorage or any JS-accessible storage
- Always validate the session server-side at the top of every Server Action and Route Handler
- Never trust role or user data sent from the client
- Role is never stored on `User` — always resolve from `GroupMember`

### Auth.js Session Check
```typescript
import { auth } from '@/lib/auth'

// Correct — always first step in any Server Action or Route Handler
const session = await auth()
if (!session?.user) return { success: false, error: 'Unauthorised' }
```

### Next.js 15 — Async Cookies
```typescript
import { cookies } from 'next/headers'

// Correct
const cookieStore = await cookies()

// Wrong — will throw in Next.js 15
const cookieStore = cookies()
```

Never override Auth.js default HTTP-only, `SameSite=Strict` cookie settings.

---

## Role-Based Access Control (RBAC)

Roles are group-scoped. Always resolve from `GroupMember` for the specific `groupId`. Never read from `User`.

### Role Hierarchy

| Role | Permissions |
|---|---|
| `owner` | Full group control. Manage admins, transfer ownership, delete group, edit schedules, manage payments. |
| `admin` | Manage sessions, verify payments, generate teams, manage scoreboard, edit schedules. |
| `player` | Join sessions, upload receipts, view schedules, view leaderboard, view own stats. No write access. |

### Enforcement — requireGroupRole

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
    where: {
      groupId,
      userId: session.user.id,
      role: { in: allowedRoles },
    },
    select: { role: true },
  })

  if (!member) return null
  return { userId: session.user.id, role: member.role }
}
```

### Usage in Server Actions

```typescript
// Step 1 — auth
const session = await auth()
if (!session?.user) return { success: false, error: 'Unauthorised' }

// Step 2 — role check
const member = await requireGroupRole(groupId, ['owner', 'admin'])
if (!member) return { success: false, error: 'Forbidden' }
```

Never skip role checks during development. Apply from the first commit.

---

## Group Isolation

Every query against group-owned data must include `groupId` as a filter.

```typescript
// Correct
const sessions = await prisma.session.findMany({
  where: { groupId, status: 'OPEN' },
})

// Wrong — exposes data across groups
const sessions = await prisma.session.findMany({
  where: { status: 'OPEN' },
})
```

A valid auth session is not sufficient — group membership must always be confirmed independently via `requireGroupRole`.

---

## Invite System Security

- Invite codes must be cryptographically random — use `crypto.randomUUID()` or equivalent
- Never expose the raw invite code in client-side state beyond the invite link
- Invite links must be invalidatable by the group owner at any time
- Joining via invite always results in `player` role — elevation requires owner or admin action
- Never allow a user to self-assign a role higher than `player`

```typescript
// Correct — validate invite before allowing join
const group = await prisma.group.findFirst({
  where: { inviteCode },
  select: { id: true, visibility: true },
})

if (!group) return { success: false, error: 'Invalid invite link' }
```

---

## Input Validation

All Server Action inputs and Route Handler bodies must be validated with Zod before any database operation.

```typescript
const parsed = createSessionSchema.safeParse(input)
if (!parsed.success) return { success: false, error: 'Invalid input' }
```

- Define schemas in `/lib/validators/[domain].ts`
- Never pass raw input into a Prisma query
- Reject unexpected, missing, or malformed fields

---

## Payment and Receipt Security

### Receipt File Handling
- Files stored in S3 or Cloudflare R2 — never in the database
- Receipt files expire after 24 hours — background job deletes file from storage and `PaymentReceipt` record
- `Payment` audit record is permanent — never delete it
- Never return raw S3/R2 file URLs — always serve via signed or proxied URL
- Admins preview receipts inline — no download endpoint exposed to players

### Payment Eligibility
- `PaymentEligibility` records created or updated only by `owner` or `admin`
- Never allow a player to self-approve their own payment
- Monthly membership: `validUntil = approvedAt + 30 days`
- Always check eligibility before including a player in session logic

```typescript
const eligibility = await prisma.paymentEligibility.findFirst({
  where: {
    groupId,
    userId,
    status: { in: ['APPROVED_WEEKLY', 'APPROVED_MONTHLY'] },
    OR: [
      { validUntil: null },
      { validUntil: { gte: new Date() } },
    ],
  },
})

if (!eligibility) return { success: false, error: 'Player is not eligible' }
```

### Session Waiver Security
- Only `owner` or `admin` may issue a session waiver
- Waiver reason must be recorded on the session record
- A waived session must never trigger a leaderboard update

---

## Data Integrity Rules

### Immutable Sessions
```typescript
if (session.status === 'LOCKED' || session.status === 'COMPLETED') {
  return { success: false, error: 'This record cannot be modified' }
}
```

Enforce at the top of any Server Action that mutates a session. Never throw — return typed error.

### Leaderboard Integrity
- `PlayerStats` updated only inside the `completeSession` transaction
- No direct mutation route exposed to `PlayerStats`
- Always group-scoped — never aggregate across groups

### Schedule Override Isolation
- Override records never write back to the parent `Schedule`
- Always validate `scheduleId` exists and `isActive` is `true` before creating an override

---

## Route Handler Security

### Protected vs Public
- **Public:** `GET /api/groups/[groupId]/leaderboard` for `PUBLIC` groups, `/api/invite/[code]`, `/api/auth/**`
- **All others:** require `auth()` check and group membership verification

### Response Hygiene
Never return full Prisma model objects. Always `select` only required fields.

```typescript
// Wrong
return Response.json({ success: true, data: user })

// Correct
return Response.json({
  success: true,
  data: { id: user.id, name: user.name }
})
```

### Public Leaderboard — Visibility Check
```typescript
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
```

---

## Environment Variables

Store in `.env.local` — never commit. Access only through `/lib/config.ts`.

```
AUTH_SECRET=
AUTH_URL=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
DATABASE_URL=
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
RESEND_API_KEY=
RECEIPT_EXPIRY_HOURS=24
```

```typescript
// /lib/config.ts
export const config = {
  authSecret: process.env.AUTH_SECRET!,
  authUrl: process.env.AUTH_URL!,
  googleClientId: process.env.AUTH_GOOGLE_ID!,
  googleClientSecret: process.env.AUTH_GOOGLE_SECRET!,
  databaseUrl: process.env.DATABASE_URL!,
  storageBucket: process.env.STORAGE_BUCKET!,
  storageRegion: process.env.STORAGE_REGION!,
  storageAccessKey: process.env.STORAGE_ACCESS_KEY!,
  storageSecretKey: process.env.STORAGE_SECRET_KEY!,
  resendApiKey: process.env.RESEND_API_KEY!,
  receiptExpiryHours: Number(process.env.RECEIPT_EXPIRY_HOURS ?? 24),
}
```

---

## Error Messages — Standard Client Responses

| Scenario | Message | Status |
|---|---|---|
| Not authenticated | `"Unauthorised"` | 401 |
| Wrong role / not a member | `"Forbidden"` | 403 |
| Bad input | `"Invalid input"` | 400 |
| Immutable record | `"This record cannot be modified"` | 409 |
| Player not eligible | `"Player is not eligible"` | 403 |
| Invalid invite | `"Invalid invite link"` | 404 |
| Not found | `"Not found"` | 404 |
| Unexpected error | `"Something went wrong"` | 500 |

---

## Do Not

- Do not store role or auth state in React state, localStorage, or JS-accessible cookies
- Do not read role from `User` — always from `GroupMember`
- Do not allow role escalation via invite — joining always assigns `player`
- Do not allow players to approve their own payments
- Do not query group-owned data without `groupId` filter
- Do not return raw S3/R2 file URLs to players
- Do not delete `Payment` records — permanent audit trail
- Do not update `PlayerStats` outside the `completeSession` transaction
- Do not expose admin endpoints without role checks even temporarily
- Do not log passwords, tokens, secrets, or personally identifiable information
- Do not skip `await` on `cookies()` or `headers()` in Next.js 15
- Do not use Express, NestJS, or any standalone server — all auth lives inside Next.js