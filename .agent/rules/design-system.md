---
trigger: always_on
---

# design-system.md — CommandPitch Design System Rules

## Source of Truth

All design tokens live in a single file: `styles/tokens/tokens.css`

This is the **single source of truth** for all colours, typography, spacing, shadows, and any other design values. The agent must never hardcode values anywhere in the codebase. All values must be referenced via CSS custom properties and mapped through Tailwind. shadcn/ui components use CSS variables internally — token variable names must align with shadcn's expected naming where applicable.

---

## Token File Structure

```css
/* styles/tokens/tokens.css */
:root {

  /* COLOURS — populate from color-token.json */
  --color-primary: ;
  --color-primary-hover: ;
  --color-primary-foreground: ;
  --color-background: ;
  --color-surface: ;
  --color-surface-raised: ;
  --color-text-primary: ;
  --color-text-secondary: ;
  --color-text-muted: ;
  --color-text-inverse: ;
  --color-border: ;
  --color-border-strong: ;
  --color-success: ;
  --color-success-foreground: ;
  --color-warning: ;
  --color-warning-foreground: ;
  --color-danger: ;
  --color-danger-foreground: ;

  /* shadcn/ui expected variables — map to your tokens */
  --background: var(--color-background);
  --foreground: var(--color-text-primary);
  --card: var(--color-surface);
  --card-foreground: var(--color-text-primary);
  --primary: var(--color-primary);
  --primary-foreground: var(--color-primary-foreground);
  --muted: var(--color-surface);
  --muted-foreground: var(--color-text-muted);
  --border: var(--color-border);
  --ring: var(--color-primary);
  --destructive: var(--color-danger);
  --destructive-foreground: var(--color-danger-foreground);

  /* TYPOGRAPHY — Inter scale */
  --font-sans: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace;
  --text-xs: 0.75rem;     --text-sm: 0.875rem;    --text-base: 1rem;
  --text-lg: 1.125rem;    --text-xl: 1.25rem;     --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;   --text-4xl: 2.25rem;    --text-5xl: 3rem;
  --font-weight-regular: 400;   --font-weight-medium: 500;
  --font-weight-semibold: 600;  --font-weight-bold: 700;
  --leading-tight: 1.25;  --leading-normal: 1.5;  --leading-relaxed: 1.625;
  --tracking-tight: -0.02em;  --tracking-normal: 0em;
  --tracking-wide: 0.025em;   --tracking-widest: 0.1em;

  /* SPACING */
  --space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;
  --space-4: 1rem;     --space-6: 1.5rem;   --space-8: 2rem;
  --space-10: 2.5rem;  --space-12: 3rem;    --space-16: 4rem;

  /* RADIUS — fill before scaffolding */
  --radius: ;
  --radius-sm: ;   --radius-md: ;   --radius-lg: ;   --radius-full: 9999px;

  /* SHADOWS — fill before scaffolding */
  --shadow-sm: ;   --shadow-md: ;   --shadow-lg: ;

  /* TRANSITIONS */
  --transition-fast: 100ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;

  /* Z-INDEX */
  --z-base: 0;  --z-raised: 10;  --z-overlay: 100;  --z-modal: 200;  --z-toast: 300;
}
```

---

## Tailwind Integration

Map all token values in `tailwind.config.ts`. Never define raw values there.

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-foreground': 'var(--color-primary-foreground)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-inverse': 'var(--color-text-inverse)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        success: 'var(--color-success)',
        'success-foreground': 'var(--color-success-foreground)',
        warning: 'var(--color-warning)',
        'warning-foreground': 'var(--color-warning-foreground)',
        danger: 'var(--color-danger)',
        'danger-foreground': 'var(--color-danger-foreground)',
      },
      fontFamily: { sans: 'var(--font-sans)', mono: 'var(--font-mono)' },
      fontSize: {
        xs: 'var(--text-xs)', sm: 'var(--text-sm)', base: 'var(--text-base)',
        lg: 'var(--text-lg)', xl: 'var(--text-xl)', '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)', '4xl': 'var(--text-4xl)', '5xl': 'var(--text-5xl)',
      },
      fontWeight: {
        regular: 'var(--font-weight-regular)', medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)', bold: 'var(--font-weight-bold)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)', md: 'var(--radius-md)',
        lg: 'var(--radius-lg)', full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)',
      },
      spacing: {
        1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)',
        4: 'var(--space-4)', 6: 'var(--space-6)', 8: 'var(--space-8)',
        10: 'var(--space-10)', 12: 'var(--space-12)', 16: 'var(--space-16)',
      },
    },
  },
  plugins: [],
}

export default config
```

Import `tokens.css` once only — in `app/layout.tsx`. Never import in individual components.

```typescript
// app/layout.tsx
import '@/styles/tokens/tokens.css'
```

---

## shadcn/ui Integration

- Use shadcn/ui primitives for all base UI: `Button`, `Card`, `Badge`, `Dialog`, `Input`, `Select`, `Skeleton`, `Sheet`, `Dropdown`
- Import from `@/components/ui/[component]`
- shadcn uses CSS variables internally — the `--background`, `--foreground`, `--primary`, `--border`, `--ring`, `--destructive` variables in `tokens.css` feed shadcn automatically
- Never override shadcn component styles with inline styles — extend via Tailwind classes
- Custom components build on top of shadcn primitives — never replace them

---

## Typography Usage

| Role | Tailwind Classes |
|---|---|
| Page heading | `text-4xl font-bold tracking-tight` |
| Section heading | `text-2xl font-semibold tracking-tight` |
| Card title | `text-xl font-semibold` |
| Body | `text-base font-regular` |
| Metadata | `text-sm text-text-muted` |
| Goal count | `text-2xl font-bold tabular-nums` |
| Leaderboard stat | `text-3xl font-bold tabular-nums tracking-tight` |
| Badge | `text-xs font-semibold tracking-widest uppercase` |
| Button | `text-sm font-semibold tracking-wide` |

Always use `tabular-nums` on any number that updates dynamically.

---

## Colour Usage

| Token | When to Use |
|---|---|
| `primary` | CTAs, active states |
| `surface` / `surface-raised` | Cards, modals, panels |
| `background` | Page background |
| `text-muted` | Timestamps, metadata |
| `success` | Completed, approved |
| `warning` | Locked, pending, expiring |
| `danger` | Rejected, errors, destructive |

Colour is never the only state indicator — always pair with text or icon.

---

## Component Rules

### Goal Buttons (`+` / `-`)
- `min-h-12 min-w-12` — non-negotiable
- Optimistic UI — instant feedback, no spinner
- Blocked when session is `LOCKED` or `COMPLETED`
- Always `"use client"`

### Status Badges
Use shadcn `Badge` with token-mapped variant classes.

Session: `DRAFT` → muted, `OPEN` → primary, `LOCKED` → warning, `COMPLETED` → success
Payment: `PENDING` → warning, `APPROVED` → success, `REJECTED` → danger
Eligibility: `APPROVED_WEEKLY` / `APPROVED_MONTHLY` → success, `PENDING` → warning, `REJECTED` → danger

Always paired with text label — never colour alone.

### Receipt Upload
- Accepts: jpg, jpeg, png, webp, pdf
- Shows: file name, type, progress, 24hr expiry notice after upload
- Never shows raw file URL to the player
- Always `"use client"`

### Receipt Preview (Admin)
- Images render inline — no download
- PDFs in inline viewer
- Approve / Reject buttons alongside: `min-h-12 min-w-12`
- Optimistic UI on approve/reject

### Team Placeholder Slot
```tsx
<div className="text-text-muted bg-surface border-dashed border border-border rounded-md p-3">
  <span className="text-sm font-medium">{placeholder}</span>
  <span className="text-xs text-text-muted ml-2">Reserved slot</span>
</div>
```

### Group Switcher
- Shows current group in nav
- Dropdown lists all user groups
- Use shadcn `DropdownMenu`
- Always `"use client"`

### Leaderboard
- All numbers `tabular-nums`
- Top 3 visually distinguished
- Group name in header — never mix across groups

### Loading States
- Skeleton screens only — no spinners
- Use shadcn `Skeleton` from `/components/ui/skeleton`

---

## Interaction Principles

- Optimistic UI on goal logging — no confirmation dialog needed
- Confirmation required for: locking session, completing session, rejecting payment, removing member
- Use shadcn `Dialog` for all confirmation modals
- Session and payment status always visible
- Skeleton screens for all list and leaderboard views

---

## Responsive Design

Mobile-first always. Base styles for mobile, enhance upward.

```
Base → mobile
sm: 640px  →  large mobile
md: 768px  →  tablet
lg: 1024px →  desktop
```

Never write desktop styles first.

---

## Accessibility

- `min-h-12 min-w-12` on all interactive elements
- Semantic HTML throughout
- All icons need `aria-label` or paired visible text
- Focus states always visible — never `outline-none` without a replacement
- shadcn components are accessible by default — do not remove their ARIA attributes

---

## Do Not

- Do not hardcode any design value anywhere
- Do not use arbitrary Tailwind values (`bg-[#fff]`, `p-[13px]`)
- Do not use inline styles except for CSS vars Tailwind cannot handle
- Do not import `tokens.css` more than once
- Do not show raw file URLs to players
- Do not mix leaderboard data across groups
- Do not remove or override shadcn ARIA attributes
- Do not replace shadcn primitives with custom implementations