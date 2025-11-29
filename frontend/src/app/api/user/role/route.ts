import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "../../../../../db";

interface TokenPayload {
    id: number;
    email: string;
    role: "admin" | "user" | "suspended";
    iat: number;
    exp: number;
}

// Helper function to extract token from either Cookie or Authorization header
async function getAuthToken(req: Request): Promise<string | null> {
    // Try Authorization header first (for Flutter Web)
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Fallback to cookie (for web browser)
    const cookieStore = await cookies();
    return cookieStore.get("token")?.value || null;
}

// Route Handler MUST be an async function.
export async function GET(req: Request) {
    // The cookies() function is async in Next.js 15+ and must be awaited
    try {
        const token = await getAuthToken(req);

        if (!token) {
            // Return 'guest' role if no token is present.
            return NextResponse.json({ role: "guest", email: null }, { status: 200 });
        }

        const secret = process.env.JWT_SECRET;

        // Add a check for the secret environment variable for robustness
        if (!secret) {
            console.error("JWT_SECRET environment variable is not set.");
            // Returning a 500 for a server configuration error
            return NextResponse.json({ role: "guest", email: null }, { status: 500 });
        }

        const decoded = jwt.verify(token, secret) as TokenPayload;

        // Return the role and email from the verified token.
        return NextResponse.json({ role: decoded.role, email: decoded.email }, { status: 200 });

    } catch (err) {
        // This catch block handles failed JWT verification (e.g., expired or invalid token).
        console.error("Token verification failed:", (err as Error).message);
        // Treat failed verification as a 'guest' user.
        return NextResponse.json({ role: "guest", email: null }, { status: 200 });
    }
}