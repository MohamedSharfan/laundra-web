import { NextResponse, type NextRequest } from "next/server";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

function safeInternalPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/** Routes anyone can open without signing in (marketing, shared tracking links, login). */
function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/track/")) return true;
  return false;
}

function isLoginRoute(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/login/");
}

function loginUrlForProtectedRoute(pathname: string): "/login/customer" | "/login/rider" {
  if (pathname.startsWith("/rider")) return "/login/rider";
  return "/login/customer";
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);

  if (!supabase) {
    return response;
  }

  const pathname = request.nextUrl.pathname;

  if (isAuthBypassEnabled()) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileRole: string | null | undefined;

  const needsProfile =
    !!user &&
    (isLoginRoute(pathname) ||
      pathname.startsWith("/rider") ||
      pathname.startsWith("/customer") ||
      pathname.startsWith("/booking"));

  if (needsProfile) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user!.id).maybeSingle();
    profileRole = prof?.role ?? null;
  }

  if (user && profileRole) {
    if (pathname.startsWith("/rider") && profileRole === "customer") {
      return NextResponse.redirect(new URL("/customer", request.url));
    }
    if (pathname.startsWith("/customer") && profileRole === "rider") {
      return NextResponse.redirect(new URL("/rider", request.url));
    }
    if (pathname.startsWith("/booking") && profileRole === "rider") {
      return NextResponse.redirect(new URL("/rider", request.url));
    }
  }

  if (isLoginRoute(pathname)) {
    if (!user) {
      return response;
    }

    const nextDest = safeInternalPath(request.nextUrl.searchParams.get("next"));
    if (nextDest) {
      return NextResponse.redirect(new URL(nextDest, request.url));
    }

    const onRiderLogin =
      pathname === "/login/rider" ||
      (pathname === "/auth" && request.nextUrl.searchParams.get("role") === "rider");

    if (onRiderLogin && profileRole === "customer") {
      return response;
    }

    if (pathname === "/login/customer" && profileRole === "rider") {
      return NextResponse.redirect(new URL("/rider", request.url));
    }
    if (pathname === "/login/rider" && profileRole === "customer") {
      return NextResponse.redirect(new URL("/customer", request.url));
    }

    const url = request.nextUrl.clone();
    url.search = "";
    url.pathname = profileRole === "rider" ? "/rider" : "/customer";
    return NextResponse.redirect(url);
  }

  if (!user) {
    if (isPublicRoute(pathname)) {
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname = loginUrlForProtectedRoute(pathname);
    const dest = `${pathname}${request.nextUrl.search}`;
    url.searchParams.set("next", dest);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
