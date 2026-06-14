# amrio — Architecture

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Database & Auth | Supabase |
| Validation | Zod |
| Hosting | Vercel |

---

## Directory Structure

```
amrio/
├── src/
│   ├── app/                    # Next.js App Router: pages, layouts, API routes
│   │   ├── (auth)/             # Route group: unauthenticated pages (login, signup)
│   │   ├── (app)/              # Route group: protected pages
│   │   ├── api/                # Route Handlers (server-side API endpoints)
│   │   ├── layout.tsx          # Root layout (fonts, metadata, global providers)
│   │   ├── page.tsx            # Root page
│   │   └── globals.css         # Tailwind v4 import + CSS custom properties
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts       # Browser Supabase client (client components)
│   │       └── server.ts       # Server Supabase client (server components, actions)
│   ├── components/             # Shared UI components (to be created)
│   ├── types/                  # Shared TypeScript types and Supabase-generated types
│   └── middleware.ts           # Session refresh + route protection (to be created)
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── TASKS.md
├── CLAUDE.md                   # Development rules for Claude
└── public/                     # Static assets
```

Middleware lives at `src/middleware.ts` — Next.js resolves it automatically when the project uses the `src` directory.

---

## Routing Conventions

amrio uses Next.js App Router route groups to separate authenticated and unauthenticated surfaces:

- `(auth)` — public routes: `/login`, `/signup`. No session required.
- `(app)` — protected routes: all workspace and ticket views. Middleware redirects to `/login` if session is missing.

Server Components are the default. Client Components (`'use client'`) are used only where interactivity or browser APIs are required.

---

## Supabase SSR Pattern

amrio uses `@supabase/ssr` for cookie-based session management, which is the correct pattern for Next.js App Router. There are two client factories:

### Browser client (`src/lib/supabase/client.ts`)
Used inside Client Components for real-time subscriptions or client-side queries.

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### Server client (`src/lib/supabase/server.ts`)
Used in Server Components, Route Handlers, and Server Actions. Reads and writes the session cookie via Next.js `cookies()`.

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

The `setAll` catch is intentional: Server Components cannot set cookies, so the error is silenced. Only Route Handlers and Server Actions can write cookies successfully.

---

## Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (client + server) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public (client + server) | Supabase anon/publishable key |
| `SUPABASE_SECRET_KEY` | Server only | Used for privileged server-side operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Full database access, bypasses RLS — use sparingly |

Never expose `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the client. Only use service role for admin operations in trusted server contexts.

---

## Data Model (Conceptual)

These are the core entities amrio will need. Schema is not yet defined in Supabase — this is the intended structure for Step 2+.

- **users** — managed by Supabase Auth (`auth.users`)
- **workspaces** — a team's shared environment; has a name and slug
- **workspace_members** — join table linking users to workspaces with a role (owner, admin, member)
- **tickets** — incoming support requests, each belonging to a workspace
- **knowledge_items** — team knowledge base entries scoped to a workspace
- **ticket_notes** — internal notes on a ticket, visible only to the support team

Row Level Security (RLS) is enabled on all tables. Access is scoped to workspace membership.

---

## API Patterns

- **Server Actions** — preferred for form submissions and mutations that originate in the UI (no extra API layer needed)
- **Route Handlers** (`src/app/api/`) — used for webhook receivers, third-party integrations, and endpoints that must be called from outside Next.js
- Zod is used to validate all external input (form data, request bodies) at the boundary

---

## Styling Conventions

Tailwind CSS v4 is configured via PostCSS. Theme tokens are defined as CSS custom properties in `src/app/globals.css` using `@theme inline`. Dark mode uses `prefers-color-scheme`.

No component library is used. Components are built with plain Tailwind utility classes.
