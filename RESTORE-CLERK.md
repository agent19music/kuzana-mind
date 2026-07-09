# Restoring Clerk Auth

This doc covers how to undo the Clerk nuke from the `staging` branch (commit `8eca97d` and forward). The removal was intentional for the waitlist-only marketing phase.

---

## What was removed

| File | What changed |
|---|---|
| `middleware.ts` | Replaced `clerkMiddleware` with a passthrough |
| `app/layout.tsx` | Removed `ClerkProvider` wrapper |
| `app/components/Nav.tsx` | Removed `useAuth`, `UserButton` — made static |
| `app/components/SideNav.tsx` | Removed `useClerk`, `useOrganization`, `useUser` hooks |
| `app/login/[[...rest]]/page.tsx` | Replaced `<SignIn>` with `redirect("/waitlist")` |
| `app/register/[[...rest]]/page.tsx` | Replaced `<SignUp>` with `redirect("/waitlist")` |
| `app/dashboard/page.tsx` | Replaced dashboard with `redirect("/waitlist")` |
| `app/onboarding/page.tsx` | Replaced onboarding with `redirect("/waitlist")` |
| `app/admin/*/page.tsx` | All admin pages redirect to `/waitlist` |
| All `app/api/` routes | Return 503 JSON stubs |

The package `@clerk/nextjs` is still in `package.json` — it was never uninstalled, just unused.

---

## How to restore

### 1. Get the pre-nuke code back

The last commit with Clerk fully wired is `8eca97d` (rebrand to athena). Everything after that on `staging` stripped Clerk out.

```bash
# Option A — cherry-pick individual files back from that commit
git checkout 8eca97d -- app/layout.tsx middleware.ts app/components/Nav.tsx app/components/SideNav.tsx

# Option B — create a restore branch from before the nuke
git checkout -b restore-clerk 8eca97d
```

### 2. Restore the key files manually if cherry-pick is messy

**`middleware.ts`** — replace with:
```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/waitlist(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/login(.*)",
  "/register(.*)",
  "/api/waitlist(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
```

**`app/layout.tsx`** — wrap body in `<ClerkProvider>`:
```tsx
import { ClerkProvider } from "@clerk/nextjs";
// ...
<ClerkProvider>
  <body>{children}</body>
</ClerkProvider>
```

**`app/components/Nav.tsx`** — add back auth state:
```tsx
import { useAuth, UserButton } from "@clerk/nextjs";
const { isSignedIn } = useAuth();
// show UserButton when signed in, "Get started" → /register when not
```

**`app/components/SideNav.tsx`** — restore hooks:
```tsx
import { useClerk, useOrganization, useUser } from "@clerk/nextjs";
const { organization, membership } = useOrganization();
const { user } = useUser();
const { signOut } = useClerk();
const isAdmin = membership?.role === "org:admin";
```

**Auth pages** — restore Clerk components:
```tsx
// app/login/[[...rest]]/page.tsx
import { SignIn } from "@clerk/nextjs";
export default function LoginPage() {
  return <SignIn />;
}

// app/register/[[...rest]]/page.tsx
import { SignUp } from "@clerk/nextjs";
export default function RegisterPage() {
  return <SignUp />;
}
```

### 3. Restore env vars

Make sure `.env.local` has:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

### 4. Restore API routes

Replace the 503 stubs in `app/api/` with the real route handlers. Use `git checkout 8eca97d -- app/api/` to pull them all back at once.

### 5. Verify

```bash
pnpm build
```

---

## Env vars to set in Vercel before going live

| Key | Where |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel → Settings → Environment Variables |
| `CLERK_SECRET_KEY` | Same |
| Clerk webhook secret | After setting up webhook in Clerk dashboard |
