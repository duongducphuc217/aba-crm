import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-utils";

// Protected paths in CRM workspace
const protectedPaths = ["/dashboard", "/khach-hang", "/pipeline", "/qua-tang", "/chuong-trinh"];

export function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    
    // Check if the current path matches any protected path
    const isProtected = protectedPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
    
    if (isProtected) {
        const token = req.cookies.get("session")?.value;
        
        if (!token) {
            const url = req.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(url);
        }
        
        const payload = verifyToken(token);
        if (!payload) {
            const url = req.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("callbackUrl", pathname);
            const response = NextResponse.redirect(url);
            // Clear invalid session cookie
            response.cookies.delete("session");
            return response;
        }
    }
    
    // If already authenticated and trying to access / or /login, redirect to /dashboard
    if (pathname === "/login" || pathname === "/") {
        const token = req.cookies.get("session")?.value;
        if (token) {
            const payload = verifyToken(token);
            if (payload) {
                const url = req.nextUrl.clone();
                url.pathname = "/dashboard";
                return NextResponse.redirect(url);
            }
        }
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - api/auth (authentication endpoints)
         * - api/health (health checks)
         * - _next/static (static resources)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - system files or asset files (.svg, etc.)
         */
        "/((?!api/auth|api/health|_next/static|_next/image|[^/]*\\.svg|favicon.ico).*)",
    ],
};
