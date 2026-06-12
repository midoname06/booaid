import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(toSet) {
            toSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const { pathname } = request.nextUrl;

    const isAuth = pathname.startsWith("/login") || pathname.startsWith("/signup");
    const isProtected =
      pathname.startsWith("/dashboard") || pathname.startsWith("/agents") ||
      pathname.startsWith("/workflow") || pathname.startsWith("/inbox") ||
      pathname.startsWith("/analytics") || pathname.startsWith("/settings");

    if (!user && isProtected) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (user && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch (e) {
    // Se Supabase non è configurato, lascia passare senza bloccare
    console.error("[middleware] error:", e);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
