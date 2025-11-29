// src/app/api/admin/users/[id]/role/route.ts

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

// FIX: Corrected import path to SIX levels up
import { db } from "../../../../../../../db";
import { users } from "../../../../../../../db/schema";

interface TokenPayload {
    role: "admin" | "user" | "suspended";
    email: string;
}

const MASTER_ADMIN_EMAIL = "junaidasif956@gmail.com";

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

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const token = await getAuthToken(req);
        const { newRole } = await req.json();

        // Await params before using properties (Next.js 15+ requirement)
        const { id } = await params;
        const userId = parseInt(id);

        // 1. AUTHORIZATION CHECK
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const secret = process.env.JWT_SECRET!;
        const decoded = jwt.verify(token, secret) as TokenPayload;
        const isAuthorized = decoded.role === "admin" || decoded.email === MASTER_ADMIN_EMAIL;

        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden: Only admins can change roles" }, { status: 403 });
        }

        if (!['admin', 'user', 'suspended'].includes(newRole)) {
            return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
        }

        // 2. DATABASE UPDATE
        await db.update(users)
            .set({ role: newRole })
            .where(eq(users.id, userId));

        return NextResponse.json({ message: `User ${userId} role updated to ${newRole}` }, { status: 200 });
    } catch (err) {
        console.error("Role update error:", err);
        return NextResponse.json({ error: "Server error during role update" }, { status: 500 });
    }
}