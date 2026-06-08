---
trigger: always_on
---

# code-style.md — CommandPitch Code Style Rules

## Language
TypeScript everywhere. No plain `.js` files except config files that explicitly require it (e.g. `next.config.js`).

---

## General Rules

- `const` by default. `let` only when reassignment is necessary. Never `var`.
- `async/await` over `.then()` chains.
- No `any`. Use proper types or `unknown` with type narrowing.
- Explicit return types on all Server Actions and service functions.
- Destructure props and arguments where possible.
- No inline styles — Tailwind utility classes only.
- Never call `process.env` directly — always use `/lib/config.ts`.
- Always scope database queries to `groupId`.
- Always read role from `GroupMember` — never from `User`.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `SessionCard.tsx` |
| Files (actions/utils) | camelCase | `sessionActions.ts` |
| Variables / functions | camelCase | `generateTeams()` |
| Types / Interfaces | PascalCase | `PaymentEligibility` |
| Enums | PascalCase, UPPER_SNAKE values | `SessionStatus.COMPLETED` |
| Constants | UPPER_SNAKE_CASE | `RECEIPT_EXPIRY_HOURS` |
| Database models | PascalCase | `GroupMember` |
| Action files | camelCase per domain | `/app/actions/payment.ts` |
| API route folders | kebab-case | `/app/api/upload-receipt/` |
| Zod schemas | camelCase + `Schema` suffix | `createSessionSchema` |
| Validators | one file per domain | `/lib/validators/session.ts` |

---

## TypeScript Rules

- All shared types and enums in `/types/index.ts`
- Never import Prisma client directly into components
- Zod for runtime validation on all Server Action inputs and Route Handler bodies
- All Server Action return types must be explicitly typed

```typescript
// Standard Server Action return type
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

// Usage
export async function createSession(
  groupId: string,
  input: unknown
): Promise<ActionResult<Session>> { ... }
```

No `any`. Use `unknown` with narrowing:

```typescript
// Wrong
function handle(data: any) { ... }

// Correct
function handle(data: unknown) {
  if (typeof data === 'string') { ... }
}
```

---

## Next.js 15 — Code Style Requirements

### Always Await Params

```typescript
// Page — correct
export default async function SessionPage({
  params,
}: {
  params: Promise<{ groupId: string; sessionId: string }>
}) {
  const { groupId, sessionId } = await params
}

// Route Handler — correct
export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
}
```

### Always Await Cookies and Headers

```typescript
const cookieStore = await cookies()
const headersList = await headers()
```

### Always Declare Fetch Cache Explicitly

```typescript
fetch(url, { cache: 'no-store' })
fetch(url, { cache: 'force-cache' })
fetch(url, { next: { revalidate: 60 } })
```

---

## Server Action Rules

Every Server Action must follow this exact structure:

```typescript
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupRole } from '@/lib/auth-helpers'
import { createSessionSchema } from '@/lib/validators/session'
import type { ActionResult } from '@/types'

export async function createSession(
  groupId: string,
  input: unknown
): Promise<ActionResult<Session>> {

  // 1. Auth check — always first
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Unauthorised' }

  // 2. Group membership + role check — always second
  const member = await requireGroupRole(groupId, ['owner', 'admin'])
  if (!member) return { success: false, error: 'Forbidden' }

  // 3. Input validation — always third
  const parsed = createSessionSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  // 4. Business logic + Prisma
  try {
    const result = await prisma.session.create({
      data: {
        groupId,
        date: new Date(parsed.data.date),
        teamSize: parsed.data.teamSize,
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

Rules:
- `'use server'` at the top of every action file
- Auth check is always step 1
- Role check is always step 2
- Zod validation is always step 3
- Always return `{ success: true, data }` or `{ success: false, error }`
- Never throw from a Server Action — always return a typed result
- Always scope Prisma queries to `groupId`
- Multi-model writes always use `prisma.$transaction`

---

## Route Handler Rules

Use only for file uploads, webhooks, public endpoints. Follow this structure:

```typescript
export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  // 1. Await params — Next.js 15
  const { groupId } = await params

  // 2. Auth check
  const session = await auth()
  if (!session?.user) return Response.json(
    { success: false, error: 'Unauthorised' },
    { status: 401 }
  )

  // 3. Validate input
  const body = await req.json()
  const parsed = mySchema.safeParse(body)
  if (!parsed.success) return Response.json(
    { success: false, error: 'Invalid input' },
    { status: 400 }
  )

  // 4. Execute
  try {
    const result = await myAction(groupId, parsed.data)
    return Response.json({ success: true, data: result })
  } catch (err) {
    console.error('[POST /api/route]', err)
    return Response.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
```

Response shape is always consistent:
```typescript
{ success: true, data: T }
{ success: false, error: string }
```

---

## Group Scoping Rules

Every function touching group-owned data must:
- Accept `groupId` as first parameter
- Include `groupId` in every Prisma query

```typescript
// Correct
export async function listSessions(groupId: string) {
  return prisma.session.findMany({
    where: { groupId },
    select: { id: true, date: true, status: true },
  })
}

// Wrong — unscoped
export async function listSessions() {
  return prisma.session.findMany()
}
```

---

## Component Rules

- One component per file
- Props interface above component: `[ComponentName]Props`
- No logic inside JSX — extract to named functions
- Max 150 lines — split if larger
- Mobile-first layout
- `"use client"` only when interactivity requires it
- Always include `groupId` as prop on components acting on group data

```typescript
interface SessionCardProps {
  sessionId: string
  groupId: string
  status: SessionStatus
  date: string
}

export default function SessionCard({ sessionId, groupId, status, date }: SessionCardProps) {
  return ( /* JSX */ )
}
```

---

## shadcn/ui Rules

- Use shadcn/ui primitives for all base UI: Button, Card, Badge, Dialog, Input, Select, Skeleton
- Import from `@/components/ui/[component]`
- Never override shadcn styles with inline styles — extend via Tailwind classes and tokens
- shadcn components use CSS variables internally — tokens.css variables must match shadcn's expected variable names where applicable

```typescript
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
```

---

## Error Handling

Server Actions return typed results — never throw:
```typescript
// Wrong — throws from Server Action
throw new Error('SESSION_IMMUTABLE')

// Correct — returns typed error
return { success: false, error: 'This record cannot be modified' }
```

Route Handlers catch and map:
```typescript
} catch (err) {
  if (err instanceof Error && err.message === 'SESSION_IMMUTABLE') {
    return Response.json(
      { success: false, error: 'This record cannot be modified' },
      { status: 409 }
    )
  }
  console.error('[ROUTE]', err)
  return Response.json(
    { success: false, error: 'Something went wrong' },
    { status: 500 }
  )
}
```

---

## Imports

- Absolute imports with `@/` prefix — configure in `tsconfig.json`
- Order: external → internal → relative → types
- No unused imports

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupRole } from '@/lib/auth-helpers'
import { createSessionSchema } from '@/lib/validators/session'
import type { ActionResult, SessionStatus } from '@/types'
```

---

## Do Not

- Do not use `var` or `any`
- Do not write logic inside JSX
- Do not import Prisma client in components
- Do not call `process.env` outside `/lib/config.ts`
- Do not query group-owned models without `groupId` filter
- Do not read role from `User` — always from `GroupMember`
- Do not include ineligible players in session or team logic
- Do not throw from Server Actions — return typed error results
- Do not skip `await` on `params`, `cookies()`, or `headers()`
- Do not rely on implicit fetch caching
- Do not return raw Prisma objects from actions or routes
- Do not create Express routes, NestJS modules, or any standalone server files