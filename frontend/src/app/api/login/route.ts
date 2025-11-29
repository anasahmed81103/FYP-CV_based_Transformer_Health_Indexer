import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, email),
        });

        if (!user)
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid)
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

        // --- NEW: Suspended Status Check ---
        if (user.role === "suspended") {
            return NextResponse.json({
                error: "Your account has been suspended. Please contact support."
            }, { status: 403 });
        }
        // -----------------------------------

        // --- NEW: Email Verification Check ---
        if (user.isEmailVerified === "false") {
            return NextResponse.json({
                error: "Please verify your email before logging in. Check your inbox for the verification link."
            }, { status: 403 });
        }
        // -----------------------------------


        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" }
        );

        const response = NextResponse.json({ message: "Login successful", token });
        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
        });

        return response;
    } catch (err) {
        console.error("Login error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}