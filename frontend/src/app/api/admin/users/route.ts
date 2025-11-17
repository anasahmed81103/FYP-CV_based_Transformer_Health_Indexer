// src/app/api/admin/users/route.ts - (Required for dynamic data fetch)

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// FIX: Corrected import path (FIVE levels up from route.ts)
import { db } from "../../../../../db"; 
import { users } from "../../../../../db/schema"; 

interface TokenPayload {
    role: "admin" | "user" | "suspended";
    email: string;
}

const MASTER_ADMIN_EMAIL = "junaidasif956@gmail.com";

export async function GET() {
    try {
        const token = cookies().get("token")?.value;
        
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

        // --- 2. FETCH ALL USERS ---
        const userList = await db.query.users.findMany({
            columns: {
                id: true,
                firstName: true, 
                lastName: true,
                email: true,
                role: true,
            },
        });

        // --- 3. FORMAT FOR FRONTEND ---
        const formattedUsers = userList.map(user => ({
            id: user.id,
            // Combine first and last name
            name: `${user.firstName} ${user.lastName}`, 
            email: user.email,
            // Format role and derive status
            role: user.role === 'admin' ? 'Admin' : 'User', 
            status: user.role === 'suspended' ? 'Suspended' : 'Active',
        }));

        return NextResponse.json(formattedUsers, { status: 200 });

    } catch (err) {
        console.error("Error fetching admin user list:", err);
        return NextResponse.json({ error: "Server error or Invalid Token" }, { status: 500 });
    }
}