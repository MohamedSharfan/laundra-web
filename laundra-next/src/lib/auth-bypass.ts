/**
 * When true: middleware does not redirect to `/auth`, and client pages show preview UI instead of blocking.
 *
 * - Explicit `NEXT_PUBLIC_LAUDRA_SKIP_AUTH=false` (or `0` / `no`) → always enforce auth (even in `npm run dev`).
 * - Explicit `true` / `1` / `yes` → always skip auth.
 * - Unset → in development (`next dev`), skip auth so all routes are browsable without signing in; in production builds, enforce auth.
 *
 * Database writes still require a signed-in user (Supabase RLS).
 */
export function isAuthBypassEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_LAUDRA_SKIP_AUTH?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  return process.env.NODE_ENV === "development";
}

/** Local only: stay on `/auth`, hide magic-link UI, disable auth redirects — use while building the auth page layout. */
export function isAuthPageDevEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_LAUDRA_AUTH_DEV?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
