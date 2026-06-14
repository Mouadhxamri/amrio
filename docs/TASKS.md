# amrio — Task Tracker

---

## Step 1: Project Setup

### Done
- [x] Next.js 16 App Router project initialized
- [x] TypeScript strict mode configured
- [x] Tailwind CSS v4 + PostCSS configured
- [x] ESLint + Prettier configured
- [x] Supabase project created and connected
- [x] `.env.local` created with Supabase credentials (gitignored)
- [x] Supabase SSR helper files: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- [x] Core dependencies installed: `next`, `react`, `@supabase/ssr`, `@supabase/supabase-js`, `zod`
- [x] Vercel project configured with environment variables
- [x] Git repository initialized
- [x] `CLAUDE.md` written with development rules
- [x] `docs/` folder created
- [x] Initial planning docs completed

### Remaining Step 1 Cleanup
- [ ] `README.md` — still boilerplate; update to describe amrio
- [ ] `src/app/layout.tsx` metadata — still says "Create Next App"; update title and description
- [ ] `src/app/page.tsx` — still boilerplate template content; replace with placeholder or landing copy
- [ ] Initial git commit (nothing committed yet)
- [ ] Supabase database types generated (`supabase gen types typescript`) and added to `src/types/`

---

## Step 2: Auth + Workspace

> Not started. Design approved; implementation is next.

### Goal
A user can sign up, log in, create a workspace, and invite team members.

### Database Schema
- `workspaces`: `id`, `name`, `slug`, `created_at`
- `workspace_members`: `workspace_id`, `user_id`, `role` (owner | admin | member), `created_at`
- `auth.users` managed by Supabase Auth

### Files to Create
- `src/middleware.ts` — session refresh + route protection
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`
- `src/app/(app)/layout.tsx` — protected layout (redirects if unauthenticated)
- `src/app/(app)/workspaces/new/page.tsx` — workspace creation form
- `src/app/(app)/workspaces/[slug]/page.tsx` — workspace root

### Auth Flow
1. User signs up via Supabase email/password
2. `src/middleware.ts` checks session cookie on every request; redirects to `/login` if missing
3. After login, user lands on workspace selector or their workspace
4. Workspace owner can invite members via email

### Constraints
- No third-party auth libraries
- Use Supabase SSR cookie pattern (already in place)
- Middleware must not block public routes: `/login`, `/signup`

---

## Step 3: Ticket Workspace

> Not started. Depends on Step 2.

Inbox view, ticket detail, reply composer, internal notes.

---

## Step 4: Knowledge Base

> Not started. Depends on Step 2.

Create, search, and surface knowledge base entries during ticket replies.

---

## Step 5: AI Integration

> Not started. Depends on Steps 3 and 4.

AI-suggested replies, knowledge retrieval, ticket categorization.

---

## Step 6: Workflow Automation

> Not started. Depends on Steps 3–5.

Rules and triggers: auto-assign, escalate, draft on new ticket.
