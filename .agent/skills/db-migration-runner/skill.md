# SKILL.md — DB Migration Runner

## Purpose
This skill guides the agent through all database schema changes for CommandPitch using Prisma and PostgreSQL. Every schema change must follow this skill exactly. Prisma is the only interface to the database schema. No raw SQL. No direct database mutations.

---

## When to Use This Skill
- A new model needs to be added to `schema.prisma`
- An existing model needs a new, modified, or removed field
- A new enum needs to be defined
- A relation between models needs to be added or changed
- A migration needs to be created, applied, or reset

---

## Pre-Migration Checklist
Before touching `schema.prisma` answer these questions:

**1. Which layer does this change belong to?**
Group / Membership / Invite / Scheduling / Payment / Session / Team / Scoreboard / Leaderboard

**2. Does the model carry a `groupId`?**
Every model that belongs to a group must have `groupId String`. No exceptions.

**3. Is this a breaking change?**
- Adding optional field → non-breaking
- Adding required field without default → breaking
- Renaming a field → breaking
- Removing a field → breaking
Define a strategy before proceeding on any breaking change.

**4. Does this change affect multiple models?**
Yes → plan as a single atomic migration. Never split logically connected changes.

---

## Canonical Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// ENUMS
// ============================================================

enum Visibility {
  PUBLIC
  PRIVATE
}

enum GroupRole {
  owner
  admin
  player
}

enum SessionStatus {
  DRAFT
  OPEN
  LOCKED
  COMPLETED
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

enum EligibilityStatus {
  APPROVED_WEEKLY
  APPROVED_MONTHLY
  PENDING
  REJECTED
}

// ============================================================
// GLOBAL MODELS
// ============================================================

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ============================================================
// GROUP SYSTEM
// ============================================================

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

// ============================================================
// MEMBERSHIP SYSTEM
// ============================================================

model GroupMember {
  id       String    @id @default(cuid())
  groupId  String
  userId   String
  role     GroupRole
  joinedAt DateTime  @default(now())

  @@unique([groupId, userId])
}

// ============================================================
// SCHEDULING SYSTEM
// ============================================================

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

// ============================================================
// SESSION SYSTEM
// ============================================================

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

// ============================================================
// PAYMENT VERIFICATION SYSTEM
// ============================================================

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

// ============================================================
// TEAM GENERATOR
// ============================================================

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

// ============================================================
// SESSION SCOREBOARD
// ============================================================

model SessionPlayerStats {
  id        String @id @default(cuid())
  sessionId String
  groupId   String
  playerId  String
  goals     Int    @default(0)
  teamLabel String

  @@unique([sessionId, playerId])
}

// ============================================================
// LEADERBOARD
// ============================================================

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

## Migration Workflow

Follow these steps in order for every schema change.

### Step 1 — Edit `schema.prisma`
Make the change. Do not run any commands yet.

### Step 2 — Validate
```bash
npx prisma format
npx prisma validate
```
Fix all errors before proceeding.

### Step 3 — Create the Migration
```bash
npx prisma migrate dev --name [descriptive-migration-name]
```

Migration name rules:
- Lowercase, underscore-separated
- Descriptive of the change — not the date

Examples:
```
initial_schema
add_group_system
add_payment_verification_system
add_waiver_reason_to_session
add_placeholder_to_team_member
add_unique_constraint_player_stats
```

### Step 4 — Verify
```bash
npx prisma studio
```

Confirm:
- Model or field appears correctly
- Existing data is intact
- `groupId` present on all group-scoped models
- Composite unique constraints applied

### Step 5 — Regenerate Client
```bash
npx prisma generate
```

Run any time `schema.prisma` changes. Keeps TypeScript types in sync.

---

## New Model Checklist

Before writing any new model confirm:

- [ ] Belongs to a group? → `groupId String` required
- [ ] Mutable? → `updatedAt DateTime @updatedAt` required
- [ ] Needs composite unique? → `@@unique([...])` added
- [ ] Primary key: `id String @id @default(cuid())`
- [ ] Always includes `createdAt DateTime @default(now())`

---

## Breaking Change Strategy

### Required Field on Existing Model
Always provide a default for existing rows.

```prisma
// Safe — default handles existing rows
model Session {
  waiverReason String @default("")
}
```

### Renaming a Field
Never rename in one step. Use three steps:

```
1. Add new field as optional alongside old field
2. Migrate data via script
3. Make new field required, remove old field
```

---

## Prisma Client Rules

### Single Instance Only

```typescript
// /lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['query', 'error', 'warn'] })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

Never call `new PrismaClient()` anywhere else.

### Always Scope to groupId

```typescript
// Correct
await prisma.session.findMany({
  where: { groupId, status: 'OPEN' },
})

// Wrong — missing groupId
await prisma.session.findMany({
  where: { status: 'OPEN' },
})
```

### Always Select Required Fields Only

```typescript
// Wrong — returns full model
const session = await prisma.session.findUnique({ where: { id } })

// Correct
const session = await prisma.session.findUnique({
  where: { id, groupId },
  select: { id: true, date: true, status: true, teamSize: true },
})
```

### Session Completion Transaction

```typescript
await prisma.$transaction(async (tx) => {
  const existing = await tx.session.findUniqueOrThrow({
    where: { id: sessionId, groupId },
    select: { status: true },
  })

  if (existing.status === 'LOCKED' || existing.status === 'COMPLETED') {
    throw new Error('SESSION_IMMUTABLE')
  }

  await tx.session.update({
    where: { id: sessionId, groupId },
    data: { status: 'COMPLETED' },
  })

  const stats = await tx.sessionPlayerStats.findMany({
    where: { sessionId, groupId },
    select: { playerId: true, goals: true },
  })

  for (const stat of stats) {
    await tx.playerStats.upsert({
      where: { groupId_playerId: { groupId, playerId: stat.playerId } },
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
```

### Payment Approval Transaction

```typescript
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
```

---

## Seeding the Database

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'owner@commandpitch.com' },
    update: {},
    create: {
      name: 'Group Owner',
      email: 'owner@commandpitch.com',
    },
  })

  const group = await prisma.group.upsert({
    where: { slug: 'saturday-ballers' },
    update: {},
    create: {
      name: 'Saturday Ballers',
      slug: 'saturday-ballers',
      inviteCode: crypto.randomUUID(),
      visibility: 'PUBLIC',
      createdBy: user.id,
    },
  })

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
    update: {},
    create: {
      groupId: group.id,
      userId: user.id,
      role: 'owner',
    },
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Run:
```bash
npx prisma db seed
```

---

## Reset (Development Only)

```bash
npx prisma migrate reset
```

Never run in production. Use only to recover from broken migration state locally.

---

## Post-Migration Checklist

- [ ] `npx prisma format` — no errors
- [ ] `npx prisma validate` — no errors
- [ ] Migration name descriptive and lowercase with underscores
- [ ] Migration file exists in `/prisma/migrations/`
- [ ] `npx prisma generate` run — client regenerated
- [ ] Prisma Studio confirms change applied correctly
- [ ] All group-scoped models have `groupId String`
- [ ] New models have `id`, `createdAt`, `updatedAt` where appropriate
- [ ] Composite unique constraints added where needed
- [ ] Required fields have defaults if existing rows present
- [ ] Single Prisma client used from `/lib/prisma.ts`
- [ ] No `new PrismaClient()` outside `/lib/prisma.ts`