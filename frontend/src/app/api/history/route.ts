// src/app/api/history/route.ts

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

// FIX: Corrected import path (4 levels up from route.ts)
import { db } from "../../../../db";
import { analysisLogs } from "../../../../db/schema";

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

export async function GET(req: Request) {
    try {
        const token = await getAuthToken(req);

        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const secret = process.env.JWT_SECRET!;
        const decoded = jwt.verify(token, secret) as { id: number, role: string };
        const userId = decoded.id;

        // Fetch logs only for the current user
        const logs = await db.query.analysisLogs.findMany({
            where: eq(analysisLogs.userId, userId),
            orderBy: (logs, { desc }) => [desc(logs.createdAt)],
        });

        return NextResponse.json(logs, { status: 200 });
    } catch (err) {
        console.error("Error fetching history:", err);
        // Handle potential JWT errors (invalid token) as unauthorized
        if (err instanceof jwt.JsonWebTokenError) {
            return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
        }

        // Server failed to execute DB query due to path/connection issue
        return NextResponse.json({ error: "Failed to retrieve history due to server error." }, { status: 500 });
    }
}