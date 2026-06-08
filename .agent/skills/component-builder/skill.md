# SKILL.md — Component Builder

## Purpose
This skill guides the agent through building any UI component for CommandPitch. Follow every step in order. Do not skip steps. Do not add dependencies without flagging first.

---

## When to Use This Skill
- A new UI component needs to be created in `/components`
- An existing component needs to be refactored or extended
- A page-level layout section needs to be broken into reusable components

---

## Pre-Build Checklist
Before writing any code answer these questions:

**1. Is this a server or client component?**
- Displays data passed as props only → server component
- Needs `useState`, `useEffect`, or browser events → `"use client"`
- Goal logging buttons → always `"use client"`
- Receipt upload → always `"use client"`
- Group switcher → always `"use client"`
- Leaderboard display, session cards, team cards → server component

**2. What props does it need?**
- Define full props interface before writing JSX
- Always include `groupId` on any component acting on group-scoped data
- Every prop explicitly typed — no `any`

**3. Does it use design tokens?**
- All colours, spacing, font sizes, shadows via Tailwind classes mapped to `tokens.css`
- No hardcoded values, no arbitrary Tailwind classes

**4. Does it use a shadcn/ui primitive?**
- Always check if a shadcn primitive covers the need before building custom
- Button, Card, Badge, Dialog, Input, Select, Skeleton, Sheet, DropdownMenu

**5. Which domain does it belong to?**
- Place in the correct subfolder under `/components`

---

## Folder Structure

```
/components
  /group        → Group creation, switcher, settings
  /membership   → Member lists, role badges, invite flow
  /schedule     → Schedule cards, override forms
  /session      → Session cards, status badges, attendance
  /payment      → Receipt upload, receipt preview, payment status, eligibility badge
  /team         → Team cards, placeholder slots, reserved slots
  /scoreboard   → Player rows, goal buttons, scoreboard container
  /leaderboard  → Leaderboard rows, ranking display, stat cards
  /ui           → shadcn/ui primitives + custom shared components
```

---

## Component Structure Template

```typescript
// 1. Directive — only if client component
'use client'

// 2. Imports — external → internal → types
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SessionStatus } from '@/types'

// 3. Props interface — named [ComponentName]Props
interface SessionCardProps {
  sessionId: string
  groupId: string
  status: SessionStatus
  date: string
  teamSize: number
}

// 4. Component — default export, named function
export default function SessionCard({
  sessionId,
  groupId,
  status,
  date,
  teamSize,
}: SessionCardProps) {

  // 5. Helpers — before return, never inside JSX
  function getStatusVariant(status: SessionStatus) {
    const map: Record<SessionStatus, string> = {
      DRAFT: 'text-text-muted bg-surface',
      OPEN: 'text-primary-foreground bg-primary',
      LOCKED: 'text-warning-foreground bg-warning',
      COMPLETED: 'text-success-foreground bg-success',
    }
    return map[status]
  }

  // 6. JSX — clean, no logic inside markup
  return (
    <Card className="w-full">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-text-primary font-semibold">{date}</p>
          <p className="text-sm text-text-muted">Team size: {teamSize}</p>
        </div>
        <Badge className={getStatusVariant(status)}>{status}</Badge>
      </CardContent>
    </Card>
  )
}
```

---

## shadcn/ui Usage Rules

- Always use shadcn primitives for base UI before building custom
- Import from `@/components/ui/[component]`
- Never override with inline styles — extend via Tailwind classes
- Never remove ARIA attributes from shadcn components
- shadcn CSS variables are fed by `tokens.css` — do not redefine them in components

```typescript
// Base primitives to use
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
```

---

## Domain-Specific Component Rules

### Goal Logging Buttons (`+` / `-`)
- Always `"use client"`
- `min-h-12 min-w-12` — non-negotiable
- Optimistic UI — update local state immediately, sync to server in background via Server Action
- No spinner on tap — feedback instant
- `+` and `-` clearly separated
- Fully blocked when `sessionLocked` is `true`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { updateGoal } from '@/app/actions/scoreboard'

interface GoalButtonsProps {
  playerId: string
  sessionId: string
  groupId: string
  goals: number
  sessionLocked: boolean
}

export default function GoalButtons({
  playerId, sessionId, groupId, goals, sessionLocked
}: GoalButtonsProps) {
  const [localGoals, setLocalGoals] = useState(goals)

  async function handleAdd() {
    if (sessionLocked) return
    setLocalGoals(prev => prev + 1)
    await updateGoal({ groupId, sessionId, playerId, action: 'add' })
  }

  async function handleRemove() {
    if (sessionLocked || localGoals === 0) return
    setLocalGoals(prev => prev - 1)
    await updateGoal({ groupId, sessionId, playerId, action: 'remove' })
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl font-bold tabular-nums w-8 text-center text-text-primary">
        {localGoals}
      </span>
      {!sessionLocked && (
        <>
          <Button
            onClick={handleRemove}
            variant="outline"
            className="min-h-12 min-w-12"
            aria-label="Remove goal"
          >
            -
          </Button>
          <Button
            onClick={handleAdd}
            className="min-h-12 min-w-12"
            aria-label="Add goal"
          >
            +
          </Button>
        </>
      )}
    </div>
  )
}
```

### Receipt Upload
- Always `"use client"`
- Accepted: jpg, jpeg, png, webp, pdf
- POST to `/api/upload-receipt` (Route Handler — not a Server Action, multipart form data)
- Shows: file name, type, upload progress, 24hr expiry notice after upload
- Never shows raw file URL to the player

### Receipt Preview (Admin)
- Images render inline — no download
- PDFs in inline viewer
- Approve / Reject as shadcn `Button` alongside preview — `min-h-12 min-w-12`
- Call `approvePayment()` / `rejectPayment()` Server Actions directly
- Optimistic UI on approve/reject

### Payment and Eligibility Badges
Use shadcn `Badge` with token-mapped classes.

```typescript
// Payment status
const paymentVariant = {
  PENDING: 'text-warning-foreground bg-warning',
  APPROVED: 'text-success-foreground bg-success',
  REJECTED: 'text-danger-foreground bg-danger',
}

// Eligibility status
const eligibilityVariant = {
  APPROVED_WEEKLY: 'text-success-foreground bg-success',
  APPROVED_MONTHLY: 'text-success-foreground bg-success',
  PENDING: 'text-warning-foreground bg-warning',
  REJECTED: 'text-danger-foreground bg-danger',
}
```

Always paired with text label — never colour alone.
Show `validUntil` date on `APPROVED_MONTHLY` badges.

### Team Placeholder Slot
```typescript
<div className="text-text-muted bg-surface border-dashed border border-border rounded-md p-3 flex items-center gap-2">
  <span className="text-sm font-medium">{placeholder}</span>
  <span className="text-xs text-text-muted">Reserved slot</span>
</div>
```

### Group Switcher
- Always `"use client"`
- Use shadcn `DropdownMenu`
- Shows current group name prominently in nav
- Lists all groups user belongs to
- On select: `router.push('/groups/[groupId]')`

### Confirmation Dialogs
Use shadcn `Dialog` for all destructive or irreversible actions:
- Locking a session
- Completing a session
- Rejecting a payment
- Removing a group member

```typescript
<Dialog>
  <DialogTrigger asChild>
    <Button variant="destructive">Complete Session</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Complete this session?</DialogTitle>
    </DialogHeader>
    <p className="text-sm text-text-muted">
      This will lock the scoreboard and update the leaderboard. This cannot be undone.
    </p>
    <div className="flex gap-3 mt-4">
      <Button onClick={handleComplete}>Confirm</Button>
      <Button variant="outline">Cancel</Button>
    </div>
  </DialogContent>
</Dialog>
```

### Leaderboard Row
- All numbers `tabular-nums`
- Top 3 visually distinguished
- Group name in header — never mix across groups

### Loading / Skeleton States
- Use shadcn `Skeleton` for all list and leaderboard loading states
- Never use spinners for list views

```typescript
import { Skeleton } from '@/components/ui/skeleton'

export default function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-surface rounded-md">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  )
}
```

---

## Accessibility Rules

- All interactive elements: `min-h-12 min-w-12`
- All buttons: `aria-label` or paired visible text
- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<section>`
- Focus states always visible — never `outline-none` without replacement
- Never remove ARIA attributes from shadcn components

---

## Mobile-First Rules

```tsx
// Correct
<div className="flex flex-col gap-4 md:flex-row md:gap-6">

// Wrong
<div className="flex flex-row gap-6 sm:flex-col">
```

---

## Post-Build Checklist

- [ ] Props interface defined and fully typed
- [ ] `groupId` included where component acts on group data
- [ ] No `any` types
- [ ] No hardcoded or arbitrary design values
- [ ] shadcn primitive used where applicable
- [ ] Component under 150 lines — split if larger
- [ ] Correct folder under `/components/[domain]`
- [ ] `"use client"` only where interactivity requires it
- [ ] All interactive elements have `aria-label` or visible text
- [ ] `min-h-12 min-w-12` on all tap targets
- [ ] Goal buttons: optimistic UI, blocked when locked
- [ ] Receipt upload: correct file types, no raw URL shown
- [ ] Confirmation dialog for all destructive actions
- [ ] Skeleton screen for loading states — no spinners
- [ ] Mobile-first styles applied
- [ ] No data mixed across groups