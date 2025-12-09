// src/app/api/admin/history/route.ts

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { eq, or } from "drizzle-orm"; // Import 'or' for filtering, if needed later

// FIX: Corrected import path (4 levels up from route.ts)
import { db } from "../../../../../db";
import { analysisLogs } from "../../../../../db/schema";

interface TokenPayload {
    id: number;
    role: "admin" | "user" | "suspended";
    email: string;
}

const MASTER_ADMIN_EMAIL = "junaidasif956@gmail.com";

export const dynamic = "force-dynamic"; // Ensure API results are not cached

// Helper function to extract token from either Cookie or Authorization header
async function getAuthToken(req: Request): Promise<string | null> {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    const cookieStore = await cookies();
    return cookieStore.get("token")?.value || null;
}

export async function GET(req: Request) {
    try {
        const token = await getAuthToken(req);

        // --- 1. AUTHORIZATION CHECK ---
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const secret = process.env.JWT_SECRET!;
        const decoded = jwt.verify(token, secret) as TokenPayload;
        const isAuthorized = decoded.role === "admin" || decoded.email === MASTER_ADMIN_EMAIL;

        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
        }

        // --- 2. DETERMINE FETCH SCOPE ---
        const { searchParams } = new URL(req.url);
        const targetUserId = searchParams.get('userId');
        const scope = searchParams.get('scope');

        let whereClause = undefined; // Default: fetch all logs

        if (targetUserId) {
            const userIdNum = parseInt(targetUserId, 10);
            if (isNaN(userIdNum)) {
                return NextResponse.json({ error: "Invalid User ID parameter." }, { status: 400 });
            }
            // Filter by specific userId
            whereClause = eq(analysisLogs.userId, userIdNum);
        } else if (scope === 'all') {
            // No specific filter needed, fetch all (whereClause remains undefined)
        } else {
            // Admin accessed the route without proper parameters, likely an issue,
            // but we'll default to fetching all if parameters are missing, or return error if strict.
            // For safety, let's treat it as a bad request if parameters are missing but /admin/ is used.
            return NextResponse.json({ error: "Missing required scope or userId parameter for admin history route." }, { status: 400 });
        }

        // --- 3. FETCH DATA ---
        const logs = await db.query.analysisLogs.findMany({
            where: whereClause,
            orderBy: (logs, { desc }) => [desc(logs.createdAt)],
        });

        return NextResponse.json(logs, { status: 200 });

    } catch (err) {
        console.error("Error fetching admin history:", err);

        if (err instanceof jwt.JsonWebTokenError) {
            return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
        }

        return NextResponse.json({ error: "Failed to retrieve history due to server error." }, { status: 500 });
    }
}