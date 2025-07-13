import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define paths that should be public (accessible without login)
const publicPaths = ["/login", "/register"];

export function middleware(request: NextRequest) {
    // Check if the path is in the public paths list
    const isPublicPath = publicPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    // Get auth cookies - we check for both Firebase auth and our custom PIN auth
    const firebaseAuthCookie = request.cookies.get("firebaseAuthSession");
    const pinAuthCookie = request.cookies.get("pinAuthSession");

    // User is authenticated if either cookie exists
    const isAuthenticated = firebaseAuthCookie || pinAuthCookie;

    // If there's no authentication and the path is not public, redirect to login
    if (!isAuthenticated && !isPublicPath) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If authenticated and the user is on a public page (login/register), redirect to dashboard
    if (
        isAuthenticated &&
        publicPaths.some((path) => request.nextUrl.pathname === path)
    ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

// Define which paths this middleware should run on
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
