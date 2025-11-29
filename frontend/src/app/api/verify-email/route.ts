import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { token } = await req.json();

        // Find user with valid token and expiry > now
        const user = await db.query.users.findFirst({
            where: (users, { eq, and, gt }) => and(
                eq(users.verificationToken, token),
                gt(users.verificationTokenExpiry, new Date())
            ),
        });

        if (!user) {
            return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
        }

        // Update user - mark as verified and clear token
        await db.update(users)
            .set({
                isEmailVerified: "true",
                verificationToken: null,
                verificationTokenExpiry: null
            })
            .where(eq(users.id, user.id));

        return NextResponse.json({ message: "Email verified successfully! You can now log in." });
    } catch (err) {
        console.error("Email verification error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
