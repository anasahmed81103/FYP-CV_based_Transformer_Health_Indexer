// src/app/api/user/role/route.ts

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
// FIX: Import 'cookies' function directly from 'next/headers'
import { cookies } from "next/headers"; 
import { db } from "../../../../../db"; 

interface TokenPayload {
    id: number;
    email: string;
    role: "admin" | "user" | "suspended";
    iat: number;
    exp: number;
}

export async function GET() {
    try {
        // FIX: The cookies() call must be executed correctly within the route handler
        const token = cookies().get("token")?.value;

        if (!token) {
            return NextResponse.json({ role: "guest", email: null }, { status: 200 });
        }

        const secret = process.env.JWT_SECRET!;
        const decoded = jwt.verify(token, secret) as TokenPayload;

        // Return the role AND email from the verified token
        return NextResponse.json({ role: decoded.role, email: decoded.email }, { status: 200 });

    } catch (err) {
        console.error("Token verification failed:", (err as Error).message);
        return NextResponse.json({ role: "guest", email: null }, { status: 200 });
    }
}