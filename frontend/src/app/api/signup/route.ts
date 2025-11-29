// api/signup/route.ts - REFINED

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Import paths adjusted for a deeply nested file (assuming 5 levels up to root)
import { db } from "../../../../db";
// Import tables directly if your db/schema file exports them individually
import { users } from "../../../../db/schema";

export async function POST(req: Request) {
    try {
        // CHANGE: Destructure firstName and lastName instead of name
        const { firstName, lastName, email, password } = await req.json();

        // --- 1. CHECK EXISTING USER ---
        const existingUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, email),
        });

        if (existingUser)
            return NextResponse.json({ error: "Email already in use" }, { status: 400 });

        // --- 2. HASH PASSWORD & INSERT USER ---
        const hashedPassword = await bcrypt.hash(password, 12);

        // --- 3. GENERATE VERIFICATION TOKEN ---
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // INSERT: firstName, lastName, email, hashedPassword, and verification fields
        await db.insert(users).values({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            isEmailVerified: "false",
            verificationToken,
            verificationTokenExpiry,
        });

        // --- 4. SEND VERIFICATION EMAIL ---
        const { sendVerificationEmail } = await import("../../../lib/email");
        await sendVerificationEmail(email, verificationToken, firstName);

        return NextResponse.json({
            message: "Signup successful! Please check your email to verify your account."
        }, { status: 201 });
    } catch (err) {
        console.error("Signup error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}